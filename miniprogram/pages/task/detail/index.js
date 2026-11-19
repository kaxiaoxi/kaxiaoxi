const { call } = require('../../../services/api')
const {
  PHASE_LABEL,
  MY_SIGNUP_LABEL,
  formatSession,
  formatDay,
  formatTime,
  quotaText
} = require('../../../utils/task')

Page({
  data: {
    detail: null,
    loading: true,
    action: 'none',
    isOwner: false,
    loadError: false,
    showApplySheet: false,
    applyLoading: false,
    showLeaveSheet: false,
    leaveLoading: false,
    leaveReason: ''
  },

  onLoad(options) {
    this.taskId = options.id || ''
    this.load()
  },

  onShow() {
    if (this.taskId && this.data.detail) this.load()
  },

  async load() {
    this.setData({ loading: true, loadError: false })
    try {
      const res = await call('task.detail', { taskId: this.taskId })
      const task = res.task
      const myStatus = res.mySignup ? res.mySignup.status : ''
      const action = this.resolveAction(task, myStatus)

      this.setData({
        detail: {
          ...task,
          participants: res.participants || [],
          pendingCount: res.pendingCount || 0,
          phaseLabel: PHASE_LABEL[task.phase] || '',
          sessionsText: (task.sessions || []).map((s) => formatSession(s)),
          quotaText: quotaText(task),
          deadlineText: `${formatDay(task.signupDeadline)} ${formatTime(task.signupDeadline)}`,
          myStatus,
          myStatusLabel: MY_SIGNUP_LABEL[myStatus] || ''
        },
        action,
        isOwner: !!res.isOwner,
        loading: false
      })
      wx.setNavigationBarTitle({ title: task.title })
    } catch (err) {
      console.warn('[task.detail] 加载失败', err)
      this.setData({ loading: false, loadError: true })
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }
  },

  onRetry() {
    this.load()
  },

  resolveAction(task, myStatus) {
    if (myStatus === 'approved' || myStatus === 'waitlisted' || myStatus === 'pending') {
      return 'cancel'
    }
    if (task.signupPhase === 'open') return 'apply'
    if (task.signupPhase === 'not_open') return 'not_open'
    return 'closed'
  },

  onAction() {
    const { action } = this.data
    if (action === 'apply') return this.onOpenApply()
    if (action === 'cancel') return this.cancel()
  },

  onManage() {
    wx.navigateTo({ url: `/pages/task/manage/index?id=${this.taskId}` })
  },

  onOpenApply() {
    this.setData({ showApplySheet: true })
  },

  onCloseApplySheet() {
    if (this.data.applyLoading) return
    this.setData({ showApplySheet: false })
  },

  async confirmApply() {
    if (this.data.applyLoading) return
    this.setData({ applyLoading: true })
    try {
      const result = await call('task.apply', { taskId: this.taskId })
      this.setData({ showApplySheet: false, applyLoading: false })
      wx.showToast({
        title: result.status === 'waitlisted' ? '已进入候补' : '报名成功',
        icon: 'success'
      })
      if (result.status === 'approved') {
        await this.setupReminder()
      }
      this.load()
    } catch (err) {
      this.setData({ applyLoading: false })
      wx.showToast({ title: err.message || '报名失败', icon: 'none' })
    }
  },

  async setupReminder() {
    try {
      const tpl = await call('subscribe.templates', {})
      if (!tpl.activity) return
      await new Promise((resolve) => {
        wx.requestSubscribeMessage({ tmplIds: [tpl.activity], complete: resolve })
      })
      await call('reminder.create', { taskId: this.taskId })
    } catch (err) {
      console.warn('[task] 订阅提醒失败', err)
    }
  },

  cancel() {
    wx.showModal({
      title: '取消报名',
      content: '取消后名额会释放给候补同学，确定吗？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await call('task.cancelApply', { taskId: this.taskId })
          wx.showToast({ title: '已取消', icon: 'success' })
          this.load()
        } catch (err) {
          wx.showToast({ title: err.message || '取消失败', icon: 'none' })
        }
      }
    })
  },

  onLeave() {
    this.setData({ showLeaveSheet: true, leaveReason: '' })
  },

  onCloseLeaveSheet() {
    if (this.data.leaveLoading) return
    this.setData({ showLeaveSheet: false })
  },

  onLeaveInput(e) {
    this.setData({ leaveReason: e.detail.value })
  },

  async confirmLeave() {
    if (this.data.leaveLoading) return
    const reason = this.data.leaveReason.trim()
    if (!reason) {
      wx.showToast({ title: '请填写请假原因', icon: 'none' })
      return
    }

    this.setData({ leaveLoading: true })
    try {
      await call('signup.requestLeave', { taskId: this.taskId, reason })
      this.setData({ showLeaveSheet: false, leaveLoading: false })
      wx.showToast({ title: '已提交，等待审批', icon: 'success' })
      this.load()
    } catch (err) {
      this.setData({ leaveLoading: false })
      wx.showToast({ title: err.message || '提交失败', icon: 'none' })
    }
  }
})
