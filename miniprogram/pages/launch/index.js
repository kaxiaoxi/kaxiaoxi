const { call } = require('../../services/api')

Page({
  data: {
    ready: false
  },

  onLoad() {
    this.bootstrap()
  },

  /**
   * 启动分流：active -> 首页；其他状态由后续版本补页面。
   */
  async bootstrap() {
    try {
      const res = await call('auth.login')
      getApp().globalData.member = res.member || null
      if (res.state === 'active') {
        wx.reLaunch({ url: '/pages/home/index' })
        return
      }
      wx.showModal({
        title: '尚未开通',
        content: '当前账号状态：' + (res.state || 'unknown'),
        showCancel: false
      })
    } catch (err) {
      wx.showToast({ title: '网络异常，请重试', icon: 'none' })
    } finally {
      this.setData({ ready: true })
    }
  }
})
