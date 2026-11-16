const { call } = require('../../../services/api')

Page({
  data: {
    year: '',
    list: [],
    total: 0,
    loading: true
  },

  onShow() {
    this.load()
  },

  async load() {
    try {
      const res = await call('erke.summary', { year: this.data.year })
      this.setData({
        year: res.year,
        list: res.list,
        total: res.total,
        loading: false
      })
    } catch (err) {
      this.setData({ loading: false })
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }
  },

  shiftYear(e) {
    const delta = e.currentTarget.dataset.delta === '1' ? 1 : -1
    const [start] = this.data.year.split('-')
    const year = `${Number(start) + delta}-${Number(start) + delta + 1}`
    this.setData({ year }, () => this.load())
  },

  async onExport() {
    try {
      const res = await call('erke.export', { year: this.data.year })
      wx.setClipboardData({
        data: res.csv,
        success: () => {
          wx.showModal({
            title: '已复制到剪贴板',
            content: `共 ${res.count} 人，粘贴到 Excel 即可。`,
            showCancel: false
          })
        }
      })
    } catch (err) {
      wx.showToast({ title: err.message || '导出失败', icon: 'none' })
    }
  }
})
