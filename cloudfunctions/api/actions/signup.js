const { db, _ } = require('../lib/db')
const { BizError } = require('../lib/errors')
const { getMemberByOpenid } = require('../lib/member')
const { promoteNext } = require('../lib/promote')
const { notify } = require('../lib/notify')

async function requirePublisher(taskId, openid) {
  const me = await getMemberByOpenid(openid)
  if (!me || me.status !== 'active') throw new BizError(40301, '账号未激活')

  const res = await db
    .collection('tasks')
    .doc(taskId)
    .get()
    .catch(() => null)
  if (!res || !res.data) throw new BizError(40401, '任务不存在')

  const task = res.data
  if (task.publisherOpenid !== openid && me.role !== 'chairman') {
    throw new BizError(40301, '仅发布人或主席可操作')
  }
  return { me, task }
}

function toRow(signup, member, leave) {
  return {
    signupId: signup._id,
    openid: signup.openid,
    status: signup.status,
    note: signup.note || '',
    queueNo: signup.queueNo || 0,
    createdAt: signup.createdAt,
    name: member ? member.name : '未知成员',
    dept: member ? member.dept : '',
    phone: member ? member.phone : '',
    avatarText: member ? member.avatarText : '?',
    avatarColor: member ? member.avatarColor : '#8A8A8E',
    leaveReason: leave ? leave.reason : '',
    leaveRequestId: leave ? leave._id : ''
  }
}

async function list(payload = {}, openid) {
  const taskId = typeof payload.taskId === 'string' ? payload.taskId : ''
  if (!taskId) throw new BizError(40001, '缺少任务 ID')

  const { task } = await requirePublisher(taskId, openid)

  const signupRes = await db
    .collection('task_signups')
    .where({ taskId })
    .orderBy('queueNo', 'asc')
    .limit(200)
    .get()

  const openids = signupRes.data.map((item) => item.openid)
  const memberMap = {}
  if (openids.length) {
    const memberRes = await db
      .collection('members')
      .where({ _openid: _.in(openids) })
      .limit(200)
      .get()
    memberRes.data.forEach((member) => {
      memberMap[member._openid] = member
    })
  }

  const leaveRes = await db
    .collection('leave_requests')
    .where({ taskId, status: 'pending' })
    .limit(200)
    .get()
  const leaveMap = {}
  leaveRes.data.forEach((leave) => {
    leaveMap[leave.openid] = leave
  })

  const groups = { pending: [], approved: [], waitlisted: [], leave: [] }
  signupRes.data.forEach((signup) => {
    const row = toRow(signup, memberMap[signup.openid], leaveMap[signup.openid])
    if (signup.status === 'pending') groups.pending.push(row)
    else if (signup.status === 'approved') groups.approved.push(row)
    else if (signup.status === 'waitlisted') groups.waitlisted.push(row)
    else if (signup.status === 'leave_pending') groups.leave.push(row)
  })

  return {
    task: {
      _id: task._id,
      title: task.title,
      startAt: task.startAt,
      quota: task.quota,
      approvedCount: task.approvedCount || 0,
      waitlistCount: task.waitlistCount || 0
    },
    groups
  }
}

async function review(payload = {}, openid) {
  const taskId = typeof payload.taskId === 'string' ? payload.taskId : ''
  const signupId = typeof payload.signupId === 'string' ? payload.signupId : ''
  const action = payload.action
  if (!taskId || !signupId) throw new BizError(40001, '参数不完整')
  if (action !== 'approve' && action !== 'reject') throw new BizError(40001, '审核动作不合法')

  await requirePublisher(taskId, openid)

  const res = await db
    .collection('task_signups')
    .doc(signupId)
    .get()
    .catch(() => null)
  if (!res || !res.data) throw new BizError(40401, '报名记录不存在')
  if (res.data.status !== 'pending') throw new BizError(40908, '该报名不在待审核状态')

  if (action === 'reject') {
    await db
      .collection('task_signups')
      .doc(signupId)
      .update({
        data: {
          status: 'rejected',
          reviewedBy: openid,
          reviewedAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      })
    await notify(res.data.openid, {
      type: 'signup',
      title: '报名未通过',
      content: `「${task.title}」的报名未通过，如有疑问请联系发布人。`,
      refType: 'task',
      refId: taskId
    })
    return { status: 'rejected' }
  }

  const tx = await db.startTransaction()
  try {
    const taskRes = await tx.collection('tasks').doc(taskId).get()
    const task = taskRes.data
    const full = task.quota > 0 && task.approvedCount >= task.quota
    const status = full ? 'waitlisted' : 'approved'

    await tx
      .collection('task_signups')
      .doc(signupId)
      .update({
        data: {
          status,
          reviewedBy: openid,
          reviewedAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      })

    const inc = {}
    if (status === 'approved') inc.approvedCount = _.inc(1)
    else inc.waitlistCount = _.inc(1)
    await tx.collection('tasks').doc(taskId).update({ data: inc })

    await tx.commit()

    await notify(res.data.openid, {
      type: 'signup',
      title: status === 'waitlisted' ? '进入候补' : '报名通过',
      content:
        status === 'waitlisted'
          ? `「${task.title}」名额已满，你已进入候补队列。`
          : `「${task.title}」报名已通过，请按时参加。`,
      refType: 'task',
      refId: taskId
    })

    return { status }
  } catch (err) {
    await tx.rollback()
    throw err
  }
}

async function requestLeave(payload = {}, openid) {
  const taskId = typeof payload.taskId === 'string' ? payload.taskId : ''
  const reason = typeof payload.reason === 'string' ? payload.reason.trim().slice(0, 200) : ''
  if (!taskId) throw new BizError(40001, '缺少任务 ID')
  if (!reason) throw new BizError(40001, '请填写请假原因')

  const signupRes = await db.collection('task_signups').where({ taskId, openid }).limit(1).get()
  if (!signupRes.data.length) throw new BizError(40401, '未找到报名记录')
  const signup = signupRes.data[0]
  if (signup.status !== 'approved') throw new BizError(40030, '当前状态不能请假')

  const taskRes = await db
    .collection('tasks')
    .doc(taskId)
    .get()
    .catch(() => null)
  if (!taskRes || !taskRes.data) throw new BizError(40401, '任务不存在')
  if (new Date(taskRes.data.startAt) <= new Date())
    throw new BizError(40031, '活动已开始，不能请假')

  const exist = await db
    .collection('leave_requests')
    .where({ taskId, openid, status: 'pending' })
    .limit(1)
    .get()
  if (exist.data.length) throw new BizError(40909, '已有待审批的请假申请')

  await db.collection('leave_requests').add({
    data: {
      taskId,
      openid,
      reason,
      status: 'pending',
      reviewedBy: '',
      reviewedAt: null,
      createdAt: db.serverDate()
    }
  })

  await db
    .collection('task_signups')
    .doc(signup._id)
    .update({ data: { status: 'leave_pending', updatedAt: db.serverDate() } })

  return { status: 'leave_pending' }
}

async function reviewLeave(payload = {}, openid) {
  const taskId = typeof payload.taskId === 'string' ? payload.taskId : ''
  const requestId = typeof payload.requestId === 'string' ? payload.requestId : ''
  const action = payload.action
  if (!taskId || !requestId) throw new BizError(40001, '参数不完整')
  if (action !== 'approve' && action !== 'reject') throw new BizError(40001, '审批动作不合法')

  await requirePublisher(taskId, openid)

  const res = await db
    .collection('leave_requests')
    .doc(requestId)
    .get()
    .catch(() => null)
  if (!res || !res.data) throw new BizError(40401, '请假申请不存在')
  if (res.data.status !== 'pending') throw new BizError(40910, '该申请已处理')
  const request = res.data

  const signupRes = await db
    .collection('task_signups')
    .where({ taskId, openid: request.openid })
    .limit(1)
    .get()
  if (!signupRes.data.length) throw new BizError(40401, '报名记录不存在')
  const signup = signupRes.data[0]

  if (action === 'reject') {
    await db
      .collection('leave_requests')
      .doc(requestId)
      .update({
        data: {
          status: 'rejected',
          reviewedBy: openid,
          reviewedAt: db.serverDate()
        }
      })
    await db
      .collection('task_signups')
      .doc(signup._id)
      .update({ data: { status: 'approved', updatedAt: db.serverDate() } })
    await notify(request.openid, {
      type: 'leave',
      title: '请假未通过',
      content: '你的请假申请未通过，仍需按时参加活动。',
      refType: 'task',
      refId: taskId
    })
    return { status: 'rejected' }
  }

  await db
    .collection('leave_requests')
    .doc(requestId)
    .update({
      data: {
        status: 'approved',
        reviewedBy: openid,
        reviewedAt: db.serverDate()
      }
    })
  await db
    .collection('task_signups')
    .doc(signup._id)
    .update({ data: { status: 'left', updatedAt: db.serverDate() } })
  await db
    .collection('tasks')
    .doc(taskId)
    .update({ data: { approvedCount: _.inc(-1) } })
  await promoteNext(taskId)

  return { status: 'approved' }
}

async function remove(payload = {}, openid) {
  const taskId = typeof payload.taskId === 'string' ? payload.taskId : ''
  const signupId = typeof payload.signupId === 'string' ? payload.signupId : ''
  if (!taskId || !signupId) throw new BizError(40001, '参数不完整')

  await requirePublisher(taskId, openid)

  const res = await db
    .collection('task_signups')
    .doc(signupId)
    .get()
    .catch(() => null)
  if (!res || !res.data) throw new BizError(40401, '报名记录不存在')
  const signup = res.data

  if (signup.status === 'approved') {
    await db
      .collection('task_signups')
      .doc(signupId)
      .update({ data: { status: 'withdrawn', updatedAt: db.serverDate() } })
    await db
      .collection('tasks')
      .doc(taskId)
      .update({ data: { approvedCount: _.inc(-1) } })
    await promoteNext(taskId)
  } else if (signup.status === 'waitlisted') {
    await db
      .collection('task_signups')
      .doc(signupId)
      .update({ data: { status: 'withdrawn', updatedAt: db.serverDate() } })
    await db
      .collection('tasks')
      .doc(taskId)
      .update({ data: { waitlistCount: _.inc(-1) } })
  } else if (signup.status === 'pending') {
    await db
      .collection('task_signups')
      .doc(signupId)
      .update({ data: { status: 'rejected', updatedAt: db.serverDate() } })
  } else {
    throw new BizError(40032, '当前状态不能移除')
  }

  return { status: 'removed' }
}

module.exports = { list, review, requestLeave, reviewLeave, remove }
