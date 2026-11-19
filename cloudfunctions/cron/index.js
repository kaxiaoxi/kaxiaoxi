const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const DEFAULT_FIELDS = {
  thing10: 'title',
  thing14: 'memo',
  thing7: 'tip',
  thing15: 'owner',
  time6: 'endTime'
}
const DEFAULT_TODO_FIELDS = { thing10: 'title', time2: 'time' }
const MAX_RETRY = 2

async function readConfig(key) {
  const res = await db.collection('configs').where({ key }).limit(1).get()
  return res.data.length ? res.data[0].value : ''
}

function clip(value, max) {
  const text = String(value === undefined || value === null ? '' : value)
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function formatTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 11月18日 14:00，用于站内信（按 Asia/Shanghai 展示） */
function formatCN(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const tz = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`)
  return `${tz.getUTCMonth() + 1}月${tz.getUTCDate()}日 ${pad(tz.getUTCHours())}:${pad(tz.getUTCMinutes())}`
}

/**
 * 站内信兜底：不管微信推送成没成功，都写一条，保证消息不丢。
 * 开启率只有三四成时，这里是唯一的保底通道。
 */
async function writeStationMessage(reminder) {
  try {
    const isTodo = reminder.kind === 'todo'
    let title = '提醒'
    let content = ''
    const refType = isTodo ? 'todo' : 'task'
    const refId = isTodo ? reminder.todoId : reminder.taskId

    if (isTodo) {
      const todoRes = await db
        .collection('todos')
        .doc(reminder.todoId)
        .get()
        .catch(() => null)
      if (!todoRes || !todoRes.data) return
      title = todoRes.data.title
      content = `${formatCN(todoRes.data.dueAt)} 截止 · 记得处理`
    } else {
      const taskRes = await db
        .collection('tasks')
        .doc(reminder.taskId)
        .get()
        .catch(() => null)
      if (!taskRes || !taskRes.data) return
      const task = taskRes.data
      const sessions = task.sessions || []
      const startAt = sessions.length ? sessions[0].startAt : task.startAt
      title = task.title
      content = `${formatCN(startAt)} · ${task.locationName || '地点待定'} · 记得提前 10 分钟到`
    }

    await db.collection('messages').add({
      data: {
        openid: reminder.openid,
        type: 'remind',
        title,
        content,
        refType,
        refId: refId || '',
        read: false,
        createdAt: db.serverDate()
      }
    })
  } catch (err) {
    console.warn('[cron] 站内信写入失败', err)
  }
}

async function sendReminder(reminder) {
  const templateId = reminder.templateId || (await readConfig('tplActivity'))
  if (!templateId) return { ok: false, reason: 'no_template' }

  const taskRes = await db
    .collection('tasks')
    .doc(reminder.taskId)
    .get()
    .catch(() => null)
  if (!taskRes || !taskRes.data) return { ok: false, reason: 'task_missing' }
  const task = taskRes.data

  const sessions = task.sessions || []
  const first = sessions.length ? sessions[0] : null
  const startAt = first ? first.startAt : task.startAt
  const location = (first && first.locationName) || task.locationName || ''

  // 发布人姓名，用于「联系人」字段
  let ownerName = ''
  if (task.publisherOpenid) {
    const memberRes = await db
      .collection('members')
      .where({ _openid: task.publisherOpenid })
      .limit(1)
      .get()
    ownerName = memberRes.data[0] ? memberRes.data[0].name : ''
  }

  const endAt = first ? first.endAt : task.endAt
  const values = {
    title: task.title,
    memo: task.description || task.collectMethod || '活动安排',
    tip: '请提前 10 分钟到场',
    owner: ownerName || '影协',
    time: startAt,
    endTime: endAt || startAt,
    location
  }

  const raw = await readConfig('subscribeFields')
  const fields = raw && typeof raw === 'object' && raw.activity ? raw.activity : DEFAULT_FIELDS

  const data = {}
  Object.keys(fields).forEach((key) => {
    const value = key.indexOf('time') === 0 ? formatTime(values[fields[key]]) : values[fields[key]]
    if (value) data[key] = clip(value, 20)
  })

  try {
    await cloud.openapi.subscribeMessage.send({
      touser: reminder.openid,
      templateId,
      page: `pages/task/detail/index?id=${reminder.taskId}`,
      data,
      miniprogramState: 'formal'
    })
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      reason: String(err.errCode || err.message || 'send_failed'),
      detail: String(err.errMsg || err.message || '')
    }
  }
}

/** 待办截止提醒的发送。 */
async function sendTodoReminder(reminder) {
  const templateId = reminder.templateId || (await readConfig('tplTodo'))
  if (!templateId) return { ok: false, reason: 'no_template' }

  const todoRes = await db
    .collection('todos')
    .doc(reminder.todoId)
    .get()
    .catch(() => null)
  if (!todoRes || !todoRes.data) return { ok: false, reason: 'todo_missing' }
  const todo = todoRes.data

  const raw = await readConfig('subscribeFields')
  const fields = raw && typeof raw === 'object' && raw.todo ? raw.todo : DEFAULT_TODO_FIELDS

  const data = {}
  Object.keys(fields).forEach((key) => {
    const value = fields[key] === 'time' ? formatTime(todo.dueAt) : todo.title
    if (value) data[key] = clip(value, 20)
  })

  try {
    await cloud.openapi.subscribeMessage.send({
      touser: reminder.openid,
      templateId,
      page: `pages/todo/detail/index?id=${reminder.todoId}`,
      data,
      miniprogramState: 'formal'
    })
    return { ok: true }
  } catch (err) {
    return { ok: false, reason: String(err.errCode || err.message || 'send_failed') }
  }
}

/**
 * 每 5 分钟扫描一次到期的提醒（需在控制台启用 config.json 的触发器）。
 * 一次发送最多重试 2 次；无论成败都写站内信兜底。
 */
exports.main = async () => {
  const now = new Date()
  const res = await db
    .collection('reminders')
    .where({ status: 'pending', remindAt: _.lte(now) })
    .limit(20)
    .get()

  let sent = 0
  let failed = 0

  for (const reminder of res.data) {
    const isTodo = reminder.kind === 'todo'
    let result = { ok: false, reason: 'unknown' }

    for (let attempt = 0; attempt <= MAX_RETRY; attempt += 1) {
      result = isTodo ? await sendTodoReminder(reminder) : await sendReminder(reminder)
      if (result.ok) break
      // 模板缺失、用户拒收、目标不存在，重试没有意义
      if (
        ['no_template', 'task_missing', 'todo_missing', '43101', '41030', '47003'].includes(
          result.reason
        )
      ) {
        break
      }
    }

    if (result.ok) {
      sent += 1
      await db
        .collection('reminders')
        .doc(reminder._id)
        .update({
          data: { status: 'sent', sentAt: db.serverDate(), error: '', updatedAt: db.serverDate() }
        })
    } else {
      failed += 1
      await db
        .collection('reminders')
        .doc(reminder._id)
        .update({
          data: {
            status: result.reason === 'no_template' ? 'cancelled' : 'failed',
            error: result.reason,
            errorDetail: result.detail || '',
            updatedAt: db.serverDate()
          }
        })
    }

    // 站内信兜底：发没发出去都留一条
    await writeStationMessage(reminder)
  }

  console.info('[cron] reminders', { total: res.data.length, sent, failed })
  return { code: 0, data: { total: res.data.length, sent, failed } }
}
