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
    loading: false,
    sheetLoading: false,
    sheet: {
      visible: false,
      type: '',
      action: '',
      title: '',
      description: '',
      confirmText: '',
      danger: false,
      member: null,
      signupId: '',
      requestId: ''
    }
  },

  onLoad(options) {
    this.setData({ taskId: options.id || '' })
    this.load()
  },

  onShow() {
    if (this.data.task) this.load()
  },

  async onPullDownRefresh() {
    this.setData({ loading: false })
    await this.load()
    wx.stopPullDownRefresh()
  },

  onAvatarError(e) {
    const id = e.currentTarget.dataset.id
    const patch = (list) =>
      list.map((item) => (item.signupId === id ? { ...item, avatarFileID: '' } : item))
    const groups = {}
    Object.keys(this.data.groups).forEach((key) => {
      groups[key] = patch(this.data.groups[key])
    })
    this.setData({ groups, current: groups[this.data.tab] || [] })
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
    const member = this.data.current.find((item) => item.leaveRequestId === id)
    const isApprove = action === 'approve'
    this.setData({
      sheet: {
        visible: true,
        type: 'leave',
        action,
        title: isApprove ? '准假' : '拒绝请假',
        description: isApprove ? '准假后名额会自动转给候补同学。' : '拒绝后该成员仍在名单中。',
        confirmText: isApprove ? '确认准假' : '确认拒绝',
        danger: !isApprove,
        member,
        signupId: '',
        requestId: id
      }
    })
  },

  onRemove(e) {
    const id = e.currentTarget.dataset.id
    const member = this.data.current.find((item) => item.signupId === id)
    this.setData({
      sheet: {
        visible: true,
        type: 'remove',
        action: '',
        title: '移出名单',
        description: '移出后该成员不计二课，名额会给候补同学。',
        confirmText: '确认移出',
        danger: true,
        member,
        signupId: id,
        requestId: ''
      }
    })
  },

  onCloseSheet() {
    if (this.data.sheetLoading) return
    this.setData({ 'sheet.visible': false })
  },

  async confirmSheet() {
    if (this.data.sheetLoading) return
    const { sheet } = this.data
    this.setData({ sheetLoading: true })
    try {
      if (sheet.type === 'remove') {
        await call('signup.remove', {
          taskId: this.data.taskId,
          signupId: sheet.signupId
        })
        wx.showToast({ title: '已移出', icon: 'success' })
      }

      if (sheet.type === 'leave') {
        await call('signup.reviewLeave', {
          taskId: this.data.taskId,
          requestId: sheet.requestId,
          action: sheet.action
        })
        wx.showToast({ title: '已处理', icon: 'success' })
      }

      this.setData({
        'sheet.visible': false,
        sheetLoading: false
      })
      this.load()
    } catch (err) {
      this.setData({ sheetLoading: false })
      wx.showToast({ title: err.message || '操作失败', icon: 'none' })
    }
  }
})
