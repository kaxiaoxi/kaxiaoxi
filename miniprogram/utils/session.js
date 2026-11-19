const { call } = require('../services/api')

/**
 * 冷启动直接进某个页面时，app.globalData.member 可能还是空的
 * （只有 launch 页会写它），这里补一次登录态，避免把部长当成小干。
 */
async function ensureMember() {
  const app = getApp()
  if (app.globalData.member) return app.globalData.member
  try {
    const res = await call('auth.login')
    app.globalData.member = res.member || null
  } catch (err) {
    console.warn('[session] 恢复登录态失败', err)
  }
  return app.globalData.member
}

module.exports = { ensureMember }
