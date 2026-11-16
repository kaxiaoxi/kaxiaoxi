const { db } = require('./db')

const COLLECTIONS = [
  'members',
  'tasks',
  'task_signups',
  'leave_requests',
  'reminders',
  'calendar_events',
  'todos',
  'messages',
  'configs'
]

let ready = null

/**
 * 首次调用时确保集合存在，避免忘记跑 init 导致查询报错。
 * 已存在时忽略错误；失败只告警，不阻断主流程。
 */
function ensureCollections() {
  if (!ready) {
    ready = Promise.all(
      COLLECTIONS.map(async (name) => {
        try {
          await db.createCollection(name)
        } catch (err) {
          const message = err.errMsg || err.message || ''
          if (!/already exists|已存在/i.test(message)) {
            console.warn('[ensure] createCollection failed', name, message)
          }
        }
      })
    )
  }
  return ready
}

module.exports = { ensureCollections }
