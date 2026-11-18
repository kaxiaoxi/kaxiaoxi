const { db } = require('../lib/db')
const { BizError } = require('../lib/errors')
const { getMemberByOpenid } = require('../lib/member')
const { getTemplates, send } = require('../lib/subscribe')

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

module.exports = { templates, createReminder, send }
