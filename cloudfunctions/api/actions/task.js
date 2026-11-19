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

function normalizeRoles(raw, useRoles) {
  if (!useRoles) return []
  const list = (Array.isArray(raw) ? raw : [])
    .map((item) => ({
      name: typeof item.name === 'string' ? item.name.trim().slice(0, 10) : '',
      quota: Number(item.quota)
    }))
    .filter((item) => item.name)

  if (!list.length) throw new BizError(40001, '请至少添加一个分工')
  if (list.length > 8) throw new BizError(40001, '分工最多 8 个')

  const seen = {}
  list.forEach((item) => {
    if (seen[item.name]) throw new BizError(40001, `分工「${item.name}」重复`)
    seen[item.name] = true
    if (!Number.isInteger(item.quota) || item.quota < 1 || item.quota > 99) {
      throw new BizError(40001, `「${item.name}」的人数需为 1-99`)
    }
  })
  return list
}

function toTime(value) {
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

function pickSessions(raw, task) {
  const sessions = task.sessions || []
  if (!sessions.length) return []

  const allowed = sessions.map((item) => toTime(item.startAt)).filter((time) => time !== null)

  const chosen = (Array.isArray(raw) ? raw : [])
    .map((item) => toTime(item))
    .filter((time) => time !== null && allowed.includes(time))

  const list = [...new Set(chosen)].map((time) => new Date(time).toISOString())
  if (!list.length) {
    if (allowed.length === 1) return [new Date(allowed[0]).toISOString()]
    throw new BizError(40001, '请选择参加的时段')
  }
  return list
}

function pickRoles(raw, task) {
  if (!task.useRoles) return []
  const names = (task.roles || []).map((item) => item.name)
  const chosen = (Array.isArray(raw) ? raw : []).filter((item) => names.includes(item))
  const list = [...new Set(chosen)]
  if (!list.length) throw new BizError(40001, '请选择分工')
  return list
}

async function create(payload = {}, openid) {
  const me = await requireActive(openid)
  if (me.role === 'member') throw new BizError(40301, '仅部长或主席可发布任务')

  const check = validateTask(payload)
  if (!check.ok) throw new BizError(40001, check.message)
  const data = check.data

  const useRoles = payload.useRoles === true
  const roles = normalizeRoles(payload.roles, useRoles)

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
      useRoles,
      roles,
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

  await createAutoTodos(res._id, data, openid, me.dept)
  await createCalendarEvent(res._id, data, openid)
  return { id: res._id }
}

async function createAutoTodos(taskId, data, openid, publisherDept) {
  try {
    const now = db.serverDate()
    const confirmDue = new Date(data.signupDeadline.getTime() - 24 * 3600 * 1000)
    const collectDue = new Date(data.endAt.getTime() + 2 * 24 * 3600 * 1000)
    const base = {
      // 自动待办对本部门可见，队里其他人也能看到并加入协作
      audience: 'dept',
      dept: publisherDept,
      participants: [],
      ownerOpenid: openid,
      creatorOpenid: openid,
      priority: 2,
      done: false,
      deleted: false,
      source: 'task',
      sourceTaskId: taskId,
      sourceEventId: '',
      completedAt: null,
      createdAt: now,
      updatedAt: now
    }

    await db.collection('todos').add({
      data: {
        ...base,
        title: `确认名单：${data.title}`,
        description: '报名截止前确认最终名单，必要时移除或递补',
        dueAt: confirmDue,
        autoRule: 'confirm_list'
      }
    })

    await db.collection('todos').add({
      data: {
        ...base,
        title: `核对名单 + 收图：${data.title}`,
        description: '活动结束后核对到场名单，并按收图方式收齐作品',
        dueAt: collectDue,
        autoRule: 'collect'
      }
    })
  } catch (err) {
    console.warn('[task] 自动待办创建失败', taskId, err)
  }
}

function dateKeyOf(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function timeTextOf(startAt, endAt) {
  const start = startAt instanceof Date ? startAt : new Date(startAt)
  const end = endAt instanceof Date ? endAt : new Date(endAt)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '待定'
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`)
  const sameDay = dateKeyOf(start) === dateKeyOf(end)
  const head = `${pad(start.getHours())}:${pad(start.getMinutes())}`
  if (!sameDay) return `${head} 开始`
  return `${head}-${pad(end.getHours())}:${pad(end.getMinutes())}`
}

/**
 * 任务发布后自动落一条年历事件，让「任务」和「年历」两处对得上。
 * 任务取消 / 删除时本应把事件置为「已取消」，但仓库里还没有 task.cancel 接口，
 * 等取消功能上线后在这里补：把 sourceTaskId 对应事件 status 改成 已取消。
 */
async function createCalendarEvent(taskId, data, openid) {
  try {
    const startDate = dateKeyOf(data.startAt)
    if (!startDate) return
    const endDate = dateKeyOf(data.endAt)
    await db.collection('calendar_events').add({
      data: {
        title: data.title.slice(0, 30),
        type: '其他',
        startDate,
        endDate: endDate && endDate !== startDate ? endDate : null,
        timeText: timeTextOf(data.startAt, data.endAt),
        location: (data.locationName || '').slice(0, 40),
        ownerOpenid: openid,
        deputyOpenid: null,
        status: '已确定',
        visibility: 'public',
        note: (data.description || '').slice(0, 200),
        remindDate: null,
        sourceTaskId: taskId,
        deleted: false,
        createdBy: openid,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    })
  } catch (err) {
    // 年历写入失败不影响发布主流程
    console.warn('[task] 自动落年历失败', taskId, err)
  }
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

  const openids = approvedRes.data.map((item) => item.openid)
  const memberResults = await Promise.all(
    openids.map((id) => db.collection('members').where({ _openid: id }).limit(1).get())
  )
  const memberMap = {}
  memberResults.forEach((item) => {
    const member = item.data[0]
    if (member) memberMap[member._openid] = member
  })
  const participants = openids.map((id) => {
    const member = memberMap[id]
    return {
      name: member ? member.name : '成员',
      avatarText: member ? member.avatarText : '?',
      avatarColor: member ? member.avatarColor : '#8A8A8E',
      avatarFileID: member ? member.avatarFileID || '' : ''
    }
  })

  const roleStats = (task.roles || []).map((role) => {
    const seen = {}
    const names = []
    approvedRes.data.forEach((signup) => {
      if (!(signup.roles || []).includes(role.name)) return
      if (seen[signup.openid]) return
      seen[signup.openid] = true
      const member = memberMap[signup.openid]
      names.push(member ? member.name : '成员')
    })
    return {
      name: role.name,
      quota: role.quota,
      membersText: names.length ? names.join('、') : '暂无报名'
    }
  })

  const pendingRes = await db
    .collection('task_signups')
    .where({ taskId, status: 'pending' })
    .count()

  return {
    pendingCount: pendingRes.total || 0,
    task: {
      ...toCard(task, now),
      description: task.description,
      collectMethod: task.collectMethod,
      useRoles: task.useRoles === true,
      roles: task.roles || [],
      roleStats,
      signupStartAt: task.signupStartAt,
      signupDeadline: task.signupDeadline,
      publisherOpenid: task.publisherOpenid
    },
    mySignup: signupRes.data[0]
      ? {
          status: signupRes.data[0].status,
          sessions: signupRes.data[0].sessions || [],
          roles: signupRes.data[0].roles || []
        }
      : null,
    participants,
    isOwner: task.publisherOpenid === openid
  }
}

async function apply(payload = {}, openid) {
  const me = await requireActive(openid)
  const taskId = typeof payload.taskId === 'string' ? payload.taskId : ''
  const note = typeof payload.note === 'string' ? payload.note.trim().slice(0, 200) : ''
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

  const sessionKeys = pickSessions(payload.sessions, task)
  const roleNames = pickRoles(payload.roles, task)

  const BLOCKED = ['pending', 'approved', 'waitlisted', 'leave_pending']
  const exist = await db.collection('task_signups').where({ taskId, openid }).limit(1).get()
  const previous = exist.data[0]
  if (previous && BLOCKED.includes(previous.status)) {
    throw new BizError(40904, '你已报名该任务')
  }

  const tx = await db.startTransaction()
  try {
    const fresh = await tx.collection('tasks').doc(taskId).get()
    const current = fresh.data

    if (current.useRoles) {
      const approved = await tx
        .collection('task_signups')
        .where({ taskId, status: 'approved' })
        .limit(100)
        .get()
      const rows = approved.data || []
      roleNames.forEach((name) => {
        const role = (current.roles || []).find((item) => item.name === name)
        const limit = role ? role.quota : 0
        sessionKeys.forEach((session) => {
          const used = rows.filter(
            (row) => (row.sessions || []).includes(session) && (row.roles || []).includes(name)
          ).length
          if (limit > 0 && used >= limit) {
            throw new BizError(40905, `「${name}」在该时段名额已满`)
          }
        })
      })
    }

    const full = !current.useRoles && current.quota > 0 && current.approvedCount >= current.quota
    const status = current.signupMode === 'review' ? 'pending' : full ? 'waitlisted' : 'approved'

    if (previous) {
      await tx
        .collection('task_signups')
        .doc(previous._id)
        .update({
          data: {
            status,
            note,
            sessions: sessionKeys,
            roles: roleNames,
            queueNo: Date.now(),
            reviewedBy: '',
            reviewedAt: null,
            updatedAt: db.serverDate()
          }
        })
    } else {
      await tx.collection('task_signups').add({
        data: {
          taskId,
          openid,
          status,
          sessions: sessionKeys,
          roles: roleNames,
          queueNo: Date.now(),
          note,
          reviewedBy: '',
          reviewedAt: null,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      })
    }

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
