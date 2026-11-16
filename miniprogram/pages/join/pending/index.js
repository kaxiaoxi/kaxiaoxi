const { call } = require('../../../services/api')

Page({
  data: {
    state: 'pending',
    checking: false
  },

  onShow() {
    this.refresh()
  },

  async refresh() {
    if (this.data.checking) return
    this.setData({ checking: true })
    try {
      const res = await call('auth.login')
      const app = getApp()
      app.globalData.member = res.member || null

      if (res.state === 'active') {
        wx.reLaunch({ url: '/pages/home/index' })
        return
      }
      this.setData({ state: res.state })
    } catch (err) {
      wx.showToast({ title: '网络异常，请重试', icon: 'none' })
    } finally {
      this.setData({ checking: false })
    }
  },

  onRefresh() {
    this.refresh()
  },

  onContact() {
    wx.showModal({
      title: '联系主席',
      content: '请在协会群 @ 主席，或到例会上找主席审核。',
      showCancel: false
    })
  }
})
