const { call } = require('../../../services/api')

Page({
  data: {
    year: '',
    pendingCount: 0,
    appointText: '',
    loading: true
  },

  onShow() {
    this.load()
  },

  async load() {
    try {
      const [settings, activeRes, pendingRes] = await Promise.all([
        call('admin.getSettings', {}),
        call('member.list', { status: 'active' }),
        call('member.list', { status: 'pending' })
      ])
      const active = activeRes.list || []
      const chairmen = active.filter((item) => item.role === 'chairman').length
      const ministers = active.filter((item) => item.role === 'minister').length

      this.setData({
        year: settings.academicYear,
        pendingCount: (pendingRes.list || []).length,
        appointText: `${chairmen} 位主席 · ${ministers} 位部长`,
        loading: false
      })
    } catch (err) {
      this.setData({ loading: false })
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }
  },

  onYear() {
    wx.navigateTo({ url: '/pages/admin/settings/year/index' })
  },

  onAppoint() {
    wx.navigateTo({ url: '/pages/admin/settings/appoint/index' })
  },

  onMembers() {
    wx.navigateTo({ url: '/pages/admin/members/index' })
  },

  onAbout() {
    wx.navigateTo({ url: '/pages/about/index' })
  }
})
