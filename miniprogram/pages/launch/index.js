const { call } = require('../../services/api')

Page({
  data: {
    error: false
  },

  onLoad() {
    this.bootstrap()
  },

  /**
   * 启动分流：
   * active -> 首页；new -> 注册；pending/rejected/left -> 等待页
   */
  async bootstrap() {
    try {
      const res = await call('auth.login')
      getApp().globalData.member = res.member || null

      if (res.state === 'active') {
        wx.reLaunch({ url: '/pages/home/index' })
        return
      }
      if (res.state === 'new') {
        wx.redirectTo({ url: '/pages/join/register/index' })
        return
      }
      wx.redirectTo({ url: '/pages/join/pending/index' })
    } catch (err) {
      console.error('[launch] 登录失败', err)
      this.setData({ error: true })
    }
  },

  onRetry() {
    this.setData({ error: false })
    this.bootstrap()
  }
})
