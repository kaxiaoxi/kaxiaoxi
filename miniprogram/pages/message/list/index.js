const { call } = require('../../../services/api')
const { formatDay, formatTime } = require('../../../utils/task')

Page({
  data: {
    list: [],
    loading: true
  },

  onShow() {
    this.load()
  },

  async load() {
    try {
      const res = await call('message.list', {})
      const list = (res.list || []).map((item) => ({
        ...item,
        timeText: `${formatDay(item.createdAt)} ${formatTime(item.createdAt)}`
      }))
      this.setData({ list, loading: false })
    } catch (err) {
      this.setData({ loading: false })
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }
  },

  async onRead(e) {
    const { id, read } = e.currentTarget.dataset
    if (read) return
    try {
      await call('message.read', { id })
      this.load()
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' })
    }
  },

  async onReadAll() {
    try {
      await call('message.read', {})
      this.load()
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' })
    }
  }
})
