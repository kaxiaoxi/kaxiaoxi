const { call } = require('../../../services/api')
const { DEPT_LABEL, ROLE_LABEL } = require('../../../utils/constants')

const FIELD_LABEL = {
  phone: '手机号',
  dorm: '宿舍',
  birthday: '生日'
}

Page({
  data: {
    pending: [],
    active: [],
    requests: [],
    loading: false
  },

  onShow() {
    this.load()
  },

  async load() {
    if (this.data.loading) return
    this.setData({ loading: true })
    try {
      const [pendingRes, activeRes, requestRes] = await Promise.all([
        call('member.list', { status: 'pending' }),
        call('member.list', { status: 'active' }),
        call('profile.listPending')
      ])
      this.setData({
        pending: this.decorate(pendingRes.list),
        active: this.decorate(activeRes.list),
        requests: (requestRes.list || []).map((item) => this.decorateRequest(item))
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
      deptLabel: DEPT_LABEL[item.dept] || '未分配',
      roleLabel: ROLE_LABEL[item.role] || ''
    }))
  },

  decorateRequest(request) {
    const changes = request.changes || {}
    const diffs = Object.keys(changes).map((key) => ({
      label: FIELD_LABEL[key] || key,
      from: changes[key].from || '未填',
      to: changes[key].to || ''
    }))
    return { ...request, diffs }
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
  },

  async onReviewRequest(e) {
    const { id, action } = e.currentTarget.dataset
    try {
      await call('profile.review', { requestId: id, action })
      wx.showToast({ title: action === 'approve' ? '已通过' : '已拒绝', icon: 'success' })
      this.load()
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' })
    }
  }
})
