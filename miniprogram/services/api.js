/**
 * 云函数统一调用封装。
 * 约定：云函数永远返回 { code, data, message }，code === 0 表示成功。
 */
function call(action, payload = {}) {
  const app = getApp()
  if (app && app.globalData && app.globalData.isGuest) {
    const err = new Error('访客模式不支持此功能，注册成员后可用')
    err.code = 40301
    err.guestBlocked = true
    return Promise.reject(err)
  }

  return new Promise((resolve, reject) => {
    wx.cloud
      .callFunction({
        name: 'api',
        data: { action, payload }
      })
      .then((res) => {
        const result = res.result || {}
        if (result.code === 0) {
          resolve(result.data)
          return
        }
        const err = new Error(result.message || '请求失败')
        err.code = result.code || -1
        reject(err)
      })
      .catch((err) => {
        console.error('[api] 调用失败', action, err)
        reject(err)
      })
  })
}

module.exports = {
  call
}
