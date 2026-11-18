const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const DEFAULT_FIELDS = { thing1: 'title', time2: 'time', thing3: 'location' }

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

  const raw = await readConfig('subscribeFields')
  const fields = raw && typeof raw === 'object' && raw.activity ? raw.activity : DEFAULT_FIELDS

  const data = {}
  Object.keys(fields).forEach((key) => {
    const value =
      fields[key] === 'time'
        ? formatTime(startAt)
        : fields[key] === 'location'
          ? location
          : task.title
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
    return { ok: false, reason: String(err.errCode || err.message || 'send_failed') }
  }
}

/**
 * 每 5 分钟扫描一次到期的活动提醒（需在控制台启用 config.json 的触发器）。
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
    const result = await sendReminder(reminder)
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
            updatedAt: db.serverDate()
          }
        })
    }
  }

  console.info('[cron] reminders', { total: res.data.length, sent, failed })
  return { code: 0, data: { total: res.data.length, sent, failed } }
}
