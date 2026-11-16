const { call } = require('../../../services/api')
const { DEPT_LABEL, ROLE_LABEL } = require('../../../utils/constants')

Page({
  data: {
    pending: [],
    active: [],
    loading: false
  },

  onShow() {
    this.load()
  },

  async load() {
    if (this.data.loading) return
    this.setData({ loading: true })
    try {
      const [pendingRes, activeRes] = await Promise.all([
        call('member.list', { status: 'pending' }),
        call('member.list', { status: 'active' })
      ])
      this.setData({
        pending: this.decorate(pendingRes.list),
        active: this.decorate(activeRes.list)
      })
    } catch (err) {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  decorate(list = []) {
    return list.map((item) => ({
      ...item,
      deptLabel: DEPT_LABEL[item.dept] || '',
      roleLabel: ROLE_LABEL[item.role] || ''
    }))
  },

  async onReview(e) {
    const { id, action } = e.currentTarget.dataset
    try {
      await call('member.review', { memberId: id, action })
      wx.showToast({ title: action === 'approve' ? '已通过' : '已拒绝', icon: 'success' })
      this.load()
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' })
    }
  }
})
