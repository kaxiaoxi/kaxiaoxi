const { db, _ } = require('../lib/db')
const { BizError } = require('../lib/errors')
const { getMemberByOpenid } = require('../lib/member')
const { validateTask } = require('../lib/validate')
const { phaseOf, signupPhaseOf, visibleTo } = require('../lib/phase')
const { promoteNext } = require('../lib/promote')
const { academicYearOf } = require('./auth')

const MAX_PAGE = 100

async function requireActive(openid) {
  const me = await getMemberByOpenid(openid)
  if (!me || me.status !== 'active') throw new BizError(40301, '账号未激活')
  return me
}

function toCard(task, now) {
  return {
    _id: task._id,
    title: task.title,
    locationName: task.locationName,
    startAt: task.startAt,
    endAt: task.endAt,
    sessions: task.sessions || [],
    quota: task.quota,
    approvedCount: task.approvedCount || 0,
    waitlistCount: task.waitlistCount || 0,
    erkeHours: task.erkeHours || 0,
    signupMode: task.signupMode,
    audience: task.audience,
    targetDepts: task.targetDepts || [],
    phase: phaseOf(task, now),
    signupPhase: signupPhaseOf(task, now),
    publisherDept: task.publisherDept
  }
}

async function create(payload = {}, openid) {
  const me = await requireActive(openid)
  if (me.role === 'member') throw new BizError(40301, '仅部长或主席可发布任务')

  const check = validateTask(payload)
  if (!check.ok) throw new BizError(40001, check.message)
  const data = check.data

  const now = db.serverDate()
  const res = await db.collection('tasks').add({
    data: {
      title: data.title,
      description: data.description,
      locationName: data.locationName,
      collectMethod: data.collectMethod,
      sessions: data.sessions,
      startAt: data.startAt,
      endAt: data.endAt,
      signupStartAt: data.signupStartAt,
      signupDeadline: data.signupDeadline,
      quota: data.quota,
      erkeHours: data.erkeHours,
      signupMode: data.signupMode,
      audience: data.audience,
      targetDepts: data.targetDepts,
      publisherOpenid: openid,
      publisherDept: me.dept,
      academicYear: academicYearOf(data.startAt),
      approvedCount: 0,
      waitlistCount: 0,
      published: true,
      createdAt: now,
      updatedAt: now
    }
  })

  return { id: res._id }
}

async function list(payload = {}, openid) {
  const me = await requireActive(openid)
  const scope = payload.scope === 'dept' ? 'dept' : 'all'
  const status = payload.status || 'all'
  const now = new Date()

  const cond = { published: true, cancelledAt: _.exists(false) }
  if (status === 'recruiting') {
    cond.signupStartAt = _.lte(now)
    cond.signupDeadline = _.gt(now)
  } else if (status === 'not_started') {
    cond.signupStartAt = _.gt(now)
  } else if (status === 'finished') {
    cond.endAt = _.lte(now)
  }

  const res = await db
    .collection('tasks')
    .where(cond)
    .orderBy('startAt', 'desc')
    .limit(MAX_PAGE)
    .get()

  let items = res.data.filter((task) => visibleTo(task, me))
  if (scope === 'dept') {
    items = items.filter((task) => (task.targetDepts || []).includes(me.dept))
  }

  return { list: items.map((task) => toCard(task, now)), total: items.length }
}

async function detail(payload = {}, openid) {
  const me = await requireActive(openid)
  const taskId = typeof payload.taskId === 'string' ? payload.taskId : ''
  if (!taskId) throw new BizError(40001, '缺少任务 ID')

  const res = await db
    .collection('tasks')
    .doc(taskId)
    .get()
    .catch(() => null)
  if (!res || !res.data) throw new BizError(40401, '任务不存在')

  const task = res.data
  if (!visibleTo(task, me)) throw new BizError(40301, '无权查看该任务')

  const now = new Date()
  const [signupRes, approvedRes] = await Promise.all([
    db.collection('task_signups').where({ taskId, openid }).limit(1).get(),
    db
      .collection('task_signups')
      .where({ taskId, status: 'approved' })
      .orderBy('createdAt', 'asc')
      .limit(30)
      .get()
  ])

  const openids = approvedRes.data.map((item) => item._openid)
  let participants = []
  if (openids.length) {
    const members = await db
      .collection('members')
      .where({ _openid: _.in(openids) })
      .limit(30)
      .get()
    participants = members.data.map((m) => ({
      name: m.name,
      avatarText: m.avatarText,
      avatarColor: m.avatarColor
    }))
  }

  return {
    task: {
      ...toCard(task, now),
      description: task.description,
      collectMethod: task.collectMethod,
      signupStartAt: task.signupStartAt,
      signupDeadline: task.signupDeadline,
      publisherOpenid: task.publisherOpenid
    },
    mySignup: signupRes.data[0] ? { status: signupRes.data[0].status } : null,
    participants,
    isOwner: task.publisherOpenid === openid
  }
}

async function apply(payload = {}, openid) {
  const me = await requireActive(openid)
  const taskId = typeof payload.taskId === 'string' ? payload.taskId : ''
  if (!taskId) throw new BizError(40001, '缺少任务 ID')

  const res = await db
    .collection('tasks')
    .doc(taskId)
    .get()
    .catch(() => null)
  if (!res || !res.data) throw new BizError(40401, '任务不存在')
  const task = res.data
  if (!visibleTo(task, me)) throw new BizError(40301, '无权报名该任务')

  const now = new Date()
  if (signupPhaseOf(task, now) !== 'open') throw new BizError(40010, '报名未开放或已截止')

  const exist = await db.collection('task_signups').where({ taskId, openid }).limit(1).get()
  if (exist.data.length) throw new BizError(40904, '你已报名该任务')

  const tx = await db.startTransaction()
  try {
    const fresh = await tx.collection('tasks').doc(taskId).get()
    const current = fresh.data
    const full = current.quota > 0 && current.approvedCount >= current.quota
    const status = current.signupMode === 'review' ? 'pending' : full ? 'waitlisted' : 'approved'

    await tx.collection('task_signups').add({
      data: {
        taskId,
        openid,
        status,
        queueNo: Date.now(),
        note: '',
        reviewedBy: '',
        reviewedAt: null,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    })

    const inc = {}
    if (status === 'approved') inc.approvedCount = _.inc(1)
    if (status === 'waitlisted') inc.waitlistCount = _.inc(1)
    if (Object.keys(inc).length) {
      await tx.collection('tasks').doc(taskId).update({ data: inc })
    }
    await tx.commit()
    return { status }
  } catch (err) {
    await tx.rollback()
    throw err
  }
}

async function cancelApply(payload = {}, openid) {
  await requireActive(openid)
  const taskId = typeof payload.taskId === 'string' ? payload.taskId : ''
  if (!taskId) throw new BizError(40001, '缺少任务 ID')

  const res = await db.collection('task_signups').where({ taskId, openid }).limit(1).get()
  if (!res.data.length) throw new BizError(40401, '未找到报名记录')
  const signup = res.data[0]
  if (['withdrawn', 'left'].includes(signup.status)) throw new BizError(40011, '报名已取消')

  const taskRes = await db
    .collection('tasks')
    .doc(taskId)
    .get()
    .catch(() => null)
  if (!taskRes || !taskRes.data) throw new BizError(40401, '任务不存在')
  const task = taskRes.data
  if (new Date(task.startAt) <= new Date()) throw new BizError(40012, '活动已开始，无法取消')

  await db
    .collection('task_signups')
    .doc(signup._id)
    .update({ data: { status: 'withdrawn', updatedAt: db.serverDate() } })

  if (signup.status === 'approved') {
    await db
      .collection('tasks')
      .doc(taskId)
      .update({ data: { approvedCount: _.inc(-1) } })
    await promoteNext(taskId)
  } else if (signup.status === 'waitlisted') {
    await db
      .collection('tasks')
      .doc(taskId)
      .update({ data: { waitlistCount: _.inc(-1) } })
  }

  return { status: 'withdrawn' }
}

async function mine(payload = {}, openid) {
  await requireActive(openid)
  const res = await db
    .collection('task_signups')
    .where({ openid, status: _.nin(['withdrawn']) })
    .orderBy('createdAt', 'desc')
    .limit(MAX_PAGE)
    .get()

  if (!res.data.length) return { list: [] }

  const ids = res.data.map((item) => item.taskId)
  const tasks = await db
    .collection('tasks')
    .where({ _id: _.in(ids) })
    .limit(MAX_PAGE)
    .get()
  const now = new Date()
  const map = {}
  tasks.data.forEach((task) => {
    map[task._id] = task
  })

  const list = res.data
    .map((signup) => {
      const task = map[signup.taskId]
      if (!task) return null
      return {
        ...toCard(task, now),
        mySignupStatus: signup.status
      }
    })
    .filter(Boolean)

  return { list }
}

module.exports = { create, list, detail, apply, cancelApply, mine }
