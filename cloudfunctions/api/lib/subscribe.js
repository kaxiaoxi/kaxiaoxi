const { db, cloud } = require('./db')

const DEFAULT_FIELDS = {
  feedback: { thing2: 'name', thing3: 'content', time6: 'time' },
  activity: { thing1: 'title', time2: 'time', thing3: 'location' },
  todo: { thing1: 'title', time2: 'time' }
}

async function readConfig(key) {
  const res = await db.collection('configs').where({ key }).limit(1).get()
  return res.data.length ? res.data[0].value : ''
}

async function getTemplates() {
  const feedback = await readConfig('tplFeedback')
  const activity = await readConfig('tplActivity')
  const todo = await readConfig('tplTodo')
  return { feedback, activity, todo }
}

async function getFields(kind) {
  const raw = await readConfig('subscribeFields')
  if (raw && typeof raw === 'object' && raw[kind]) return raw[kind]
  return DEFAULT_FIELDS[kind] || {}
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

/**
 * 发送订阅消息。字段名由 configs.subscribeFields 配置，默认按常见模板。
 */
async function send(kind, openid, data, page) {
  const templates = await getTemplates()
  const templateId = templates[kind]
  if (!templateId) return { ok: false, reason: 'no_template' }

  const fields = await getFields(kind)
  const payload = {}
  Object.keys(fields).forEach((key) => {
    const raw = data[fields[key]]
    const value = fields[key] === 'time' ? formatTime(raw) : raw
    if (value !== undefined && value !== '') {
      payload[key] = clip(value, 20)
    }
  })

  try {
    await cloud.openapi.subscribeMessage.send({
      touser: openid,
      templateId,
      page,
      data: payload,
      miniprogramState: 'formal'
    })
    return { ok: true }
  } catch (err) {
    console.warn('[subscribe] send failed', kind, err)
    return { ok: false, reason: err.errCode || err.message }
  }
}

/** 云函数跑在 UTC，这里显式按 Asia/Shanghai(+8) 求「当天 09:00」。 */
function shanghaiMorningOf(value, hour = 9) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const tz = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  return Date.UTC(tz.getUTCFullYear(), tz.getUTCMonth(), tz.getUTCDate(), hour - 8, 0, 0)
}

module.exports = { getTemplates, getFields, send, formatTime, shanghaiMorningOf }
