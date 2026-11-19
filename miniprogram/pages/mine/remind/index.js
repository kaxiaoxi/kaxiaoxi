const { call } = require('../../../services/api')

Page({
  data: {
    templates: { activity: '', todo: '' },
    stats: { pending: 0, sent: 0, failed: 0 },
    loading: true
  },

  async onShow() {
    try {
      const res = await call('reminder.status')
      this.setData({
        templates: res.templates || { activity: '', todo: '' },
        stats: res.stats || { pending: 0, sent: 0, failed: 0 },
        loading: false
      })
    } catch (err) {
      this.setData({ loading: false })
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }
  },

  onOpenTasks() {
    wx.switchTab({ url: '/pages/task/list' })
  },

  onOpenTodos() {
    wx.navigateTo({ url: '/pages/todo/list/index' })
  }
})
