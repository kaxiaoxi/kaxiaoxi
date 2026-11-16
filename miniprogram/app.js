const env = require('./env')

App({
  globalData: {
    envId: env.envId,
    member: null
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('[app] 基础库版本过低，请使用 2.2.3 及以上')
      return
    }
    wx.cloud.init({
      env: env.envId,
      traceUser: true
    })
  }
})
