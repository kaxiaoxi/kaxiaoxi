const { call } = require('../../../services/api')

const TABS = [
  { key: 'pending', label: '待审' },
  { key: 'approved', label: '已通过' },
  { key: 'waitlisted', label: '候补' },
  { key: 'leave', label: '请假' }
]

Page({
  data: {
    taskId: '',
    task: null,
    groups: { pending: [], approved: [], waitlisted: [], leave: [] },
    current: [],
    tabs: [],
    tab: 'pending',
    loading: false
  },

  onLoad(options) {
    this.setData({ taskId: options.id || '' })
    this.load()
  },

  onShow() {
    if (this.data.task) this.load()
  },

  async load() {
    if (!this.data.taskId || this.data.loading) return
    this.setData({ loading: true })
    try {
      const res = await call('signup.list', { taskId: this.data.taskId })
      const groups = res.groups
      const tabs = TABS.map((item) => ({
        ...item,
        count: (groups[item.key] || []).length
      }))
      this.setData({ task: res.task, groups, tabs, current: groups[this.data.tab] || [] })
      wx.setNavigationBarTitle({ title: res.task.title || '报名管理' })
    } catch (err) {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  onTab(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ tab: key, current: this.data.groups[key] || [] })
  },

  async onReview(e) {
    const { id, action } = e.currentTarget.dataset
    try {
      const res = await call('signup.review', {
        taskId: this.data.taskId,
        signupId: id,
        action
      })
      wx.showToast({
        title: res.status === 'waitlisted' ? '已通过，进入候补' : '已处理',
        icon: 'success'
      })
      this.load()
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' })
    }
  },

  onReviewLeave(e) {
    const { id, action } = e.currentTarget.dataset
    wx.showModal({
      title: action === 'approve' ? '准假' : '拒绝请假',
      content: action === 'approve' ? '准假后名额会自动转给候补同学。' : '拒绝后该成员仍在名单中。',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await call('signup.reviewLeave', {
            taskId: this.data.taskId,
            requestId: id,
            action
          })
          wx.showToast({ title: '已处理', icon: 'success' })
          this.load()
        } catch (err) {
          wx.showToast({ title: err.message || '操作失败', icon: 'none' })
        }
      }
    })
  },

  onRemove(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '移出名单',
      content: '移出后该成员不计二课，名额会给候补同学。',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await call('signup.remove', { taskId: this.data.taskId, signupId: id })
          wx.showToast({ title: '已移出', icon: 'success' })
          this.load()
        } catch (err) {
          wx.showToast({ title: err.message || '操作失败', icon: 'none' })
        }
      }
    })
  }
})
