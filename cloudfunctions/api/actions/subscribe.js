const { db } = require('../lib/db')
const { BizError } = require('../lib/errors')
const { getMemberByOpenid } = require('../lib/member')
const { getTemplates, send, shanghaiMorningOf } = require('../lib/subscribe')

async function readConfig(key) {
  const res = await db.collection('configs').where({ key }).limit(1).get()
  return res.data.length ? res.data[0].value : ''
}

async function templates(payload = {}, openid) {
  const me = await getMemberByOpenid(openid)
  if (!me || me.status !== 'active') throw new BizError(40301, '账号未激活')
  const list = await getTemplates()
  const owner = await readConfig('ownerOpenid')
  return { ...list, isOwner: !!owner && owner === openid }
}

/**
 * 报名成功后登记活动提醒：首场开始前 2 小时发一条订阅消息。
 */
async function createReminder(payload = {}, openid) {
  const me = await getMemberByOpenid(openid)
  if (!me || me.status !== 'active') throw new BizError(40301, '账号未激活')

  const taskId = typeof payload.taskId === 'string' ? payload.taskId : ''
  if (!taskId) throw new BizError(40001, '缺少任务 ID')

  const signupRes = await db
    .collection('task_signups')
    .where({ taskId, openid, status: 'approved' })
    .limit(1)
    .get()
  if (!signupRes.data.length) throw new BizError(40030, '报名通过后才能设置提醒')

  const taskRes = await db
    .collection('tasks')
    .doc(taskId)
    .get()
    .catch(() => null)
  if (!taskRes || !taskRes.data) throw new BizError(40401, '任务不存在')
  const task = taskRes.data

  const sessions = task.sessions || []
  const firstStart = sessions.length ? new Date(sessions[0].startAt) : new Date(task.startAt)
  const remindAt = new Date(firstStart.getTime() - 2 * 3600 * 1000)
  if (remindAt <= new Date()) return { status: 'skipped' }

  const templatesConfig = await getTemplates()
  if (!templatesConfig.activity) return { status: 'no_template' }

  const existing = await db.collection('reminders').where({ taskId, openid }).limit(1).get()
  const data = {
    taskId,
    openid,
    remindAt,
    templateId: templatesConfig.activity,
    status: 'pending',
    sentAt: null,
    error: '',
    updatedAt: db.serverDate()
  }

  if (existing.data.length) {
    await db.collection('reminders').doc(existing.data[0]._id).update({ data })
    return { status: 'pending' }
  }

  await db.collection('reminders').add({
    data: { ...data, createdAt: db.serverDate() }
  })
  return { status: 'pending' }
}

/**
 * 待办截止提醒：截止当天 09:00（北京时间）发一条。
 * 收件人是主责人和协作人，每人一条记录，和活动提醒共用 reminders 集合（用 todoId 区分）。
 */
async function createTodoReminder(payload = {}, openid) {
  const me = await getMemberByOpenid(openid)
  if (!me || me.status !== 'active') throw new BizError(40301, '账号未激活')

  const todoId = typeof payload.todoId === 'string' ? payload.todoId : ''
  if (!todoId) throw new BizError(40001, '缺少待办 ID')

  const todoRes = await db
    .collection('todos')
    .doc(todoId)
    .get()
    .catch(() => null)
  if (!todoRes || !todoRes.data || todoRes.data.deleted) throw new BizError(40401, '待办不存在')
  const todo = todoRes.data

  const joined = todo.ownerOpenid === openid || (todo.participants || []).includes(openid)
  if (!joined) throw new BizError(40301, '加入协作后才能设置提醒')

  if (!todo.dueAt) return { status: 'skipped' }
  const remindAt = shanghaiMorningOf(todo.dueAt, 9)
  if (!remindAt || remindAt <= Date.now()) return { status: 'skipped' }

  const templatesConfig = await getTemplates()
  if (!templatesConfig.todo) return { status: 'no_template' }

  const existing = await db.collection('reminders').where({ todoId, openid }).limit(1).get()
  const data = {
    kind: 'todo',
    todoId,
    openid,
    remindAt: new Date(remindAt),
    templateId: templatesConfig.todo,
    status: 'pending',
    sentAt: null,
    error: '',
    updatedAt: db.serverDate()
  }

  if (existing.data.length) {
    await db.collection('reminders').doc(existing.data[0]._id).update({ data })
    return { status: 'pending' }
  }

  await db.collection('reminders').add({ data: { ...data, createdAt: db.serverDate() } })
  return { status: 'pending' }
}

/**
 * 「我的 → 提醒设置」用：模板是否就绪 + 本人已登记的提醒统计。
 * 只读。
 */
async function reminderStatus(payload = {}, openid) {
  const me = await getMemberByOpenid(openid)
  if (!me || me.status !== 'active') throw new BizError(40301, '账号未激活')

  const tpl = await getTemplates()
  const pending = await db.collection('reminders').where({ openid, status: 'pending' }).count()
  const sent = await db.collection('reminders').where({ openid, status: 'sent' }).count()
  const failed = await db.collection('reminders').where({ openid, status: 'failed' }).count()

  return {
    templates: { activity: tpl.activity, todo: tpl.todo },
    stats: {
      pending: pending.total || 0,
      sent: sent.total || 0,
      failed: failed.total || 0
    }
  }
}

module.exports = { templates, createReminder, createTodoReminder, reminderStatus, send }
