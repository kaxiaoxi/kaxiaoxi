const env = require('./env')
const guest = require('./utils/guest')

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

    try {
      const profile = wx.getStorageSync(guest.STORAGE_KEY)
      if (profile && typeof profile === 'object') {
        this.globalData.isGuest = true
        this.globalData.member = profile
      }
    } catch (err) {
      console.warn('[app] 恢复访客会话失败', err)
    }
  }
})
