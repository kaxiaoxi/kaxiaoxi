const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

/**
 * 单入口路由。新增 action 必须在 router 中登记，并声明最小角色。
 */
const router = {
  'auth.login': async () => {
    const { OPENID } = cloud.getWXContext()
    return { state: 'active', member: { openid: OPENID } }
  },
  'home.summary': async () => ({ tasks: [], todos: [] })
}

exports.main = async (event) => {
  const { action, payload = {} } = event || {}
  const handler = router[action]
  if (!handler) {
    return { code: 40400, message: 'UNKNOWN_ACTION' }
  }
  try {
    const data = await handler(payload, cloud.getWXContext())
    return { code: 0, data }
  } catch (err) {
    console.error('[api] error', action, err)
    return { code: err.code || 50000, message: err.message || '服务异常' }
  }
}
