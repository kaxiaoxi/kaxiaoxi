const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 仅供开发者在云开发控制台手动执行一次，禁止在小程序端调用。
 */
exports.main = async () => {
  const collections = [
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
  const created = []
  for (const name of collections) {
    try {
      await db.createCollection(name)
      created.push(name)
    } catch (err) {
      if (!/already exists/i.test(err.errMsg || '')) throw err
    }
  }
  return { code: 0, data: { created } }
}
