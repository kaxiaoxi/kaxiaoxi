const { call } = require('../../../services/api')
const { DEPT_LABEL, ROLE_LABEL } = require('../../../utils/constants')

const MEMBER_DEPTS = [
  { key: 'photo', label: '摄影师队' },
  { key: 'pr', label: '宣传部' },
  { key: 'ops', label: '运营部' }
]

const FIELD_LABEL = {
  phone: '手机号',
  dorm: '宿舍',
  birthday: '生日'
}

Page({
  data: {
    pending: [],
    active: [],
    activeList: [],
    deptTabs: MEMBER_DEPTS,
    deptIndex: 0,
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
      const active = this.decorate(activeRes.list)
      this.setData({
        pending: this.decorate(pendingRes.list),
        active,
        activeList: this.filterDept(active, this.data.deptIndex),
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

  filterDept(list = [], index = 0) {
    const key = MEMBER_DEPTS[index].key
    return list.filter((item) => item.dept === key)
  },

  onDept(e) {
    const index = Number(e.currentTarget.dataset.index)
    this.setData({
      deptIndex: index,
      activeList: this.filterDept(this.data.active, index)
    })
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
