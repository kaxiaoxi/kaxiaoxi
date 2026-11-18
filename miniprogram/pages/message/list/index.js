const { call } = require('../../../services/api')
const { formatDay, formatTime } = require('../../../utils/task')

Page({
  data: {
    list: [],
    loading: true,
    showMessage: false,
    activeMessage: null
  },

  onShow() {
    this.load()
  },

  async load() {
    try {
      const res = await call('message.list', { read: true })
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

  onOpenMessage(e) {
    const id = e.currentTarget.dataset.id
    const message = this.data.list.find((item) => item._id === id)
    if (!message) return
    this.setData({ activeMessage: message, showMessage: true })
  },

  onCloseMessage() {
    this.setData({ showMessage: false, activeMessage: null })
  }
})
