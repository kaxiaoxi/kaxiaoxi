const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const { route } = require('./router')
const { BizError } = require('./lib/errors')

/**
 * 单入口：{ action, payload } -> { code, data, message }
 * 统一异常处理，业务错误通过 BizError 抛出。
 */
exports.main = async (event) => {
  const { action, payload = {} } = event || {}
  const { OPENID } = cloud.getWXContext()

  if (!action) {
    return { code: 40000, message: '缺少 action' }
  }

  try {
    const data = await route(action, payload, OPENID)
    return { code: 0, data }
  } catch (err) {
    if (err instanceof BizError) {
      return { code: err.code, message: err.message }
    }
    console.error('[api] unhandled', action, err)
    return { code: 50000, message: '服务异常，请稍后重试' }
  }
}
