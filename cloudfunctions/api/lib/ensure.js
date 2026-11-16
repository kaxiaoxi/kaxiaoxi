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
  'configs',
  'profile_requests'
]

let ready = null

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

module.exports = { ensureCollections, COLLECTIONS }
