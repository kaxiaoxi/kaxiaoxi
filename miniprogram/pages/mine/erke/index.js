const { call } = require('../../../services/api')
const { formatDay } = require('../../../utils/task')

Page({
  data: {
    year: '',
    total: 0,
    list: [],
    loading: true
  },

  onShow() {
    this.load()
  },

  async load() {
    try {
      const res = await call('erke.mine', {})
      this.setData({
        year: res.year,
        total: res.total,
        list: (res.list || []).map((item) => ({
          ...item,
          dateText: formatDay(item.startAt)
        })),
        loading: false
      })
    } catch (err) {
      this.setData({ loading: false })
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }
  }
})
