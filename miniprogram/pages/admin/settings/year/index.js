const { call } = require('../../../../services/api')

Page({
  data: {
    year: '',
    nextYear: '',
    loading: true
  },

  onShow() {
    this.load()
  },

  async load() {
    try {
      const res = await call('admin.getSettings', {})
      const [start] = res.academicYear.split('-')
      this.setData({
        year: res.academicYear,
        nextYear: `${Number(start) + 1}-${Number(start) + 2}`,
        loading: false
      })
    } catch (err) {
      this.setData({ loading: false })
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }
  },

  onNextYear(e) {
    this.setData({ nextYear: e.detail.value })
  },

  onArchive() {
    wx.showModal({
      title: '开启新学年',
      content: `确认把当前学年切换为 ${this.data.nextYear}？毕业成员请先在成员管理中归档。`,
      success: async (res) => {
        if (!res.confirm) return
        try {
          await call('admin.archiveYear', { year: this.data.nextYear })
          wx.showToast({ title: '已切换', icon: 'success' })
          this.load()
        } catch (err) {
          wx.showToast({ title: err.message || '操作失败', icon: 'none' })
        }
      }
    })
  }
})
