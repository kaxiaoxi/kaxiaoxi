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
    isOwner: false
  },

  onLoad(options) {
    this.taskId = options.id || ''
    this.load()
  },

  onShow() {
    if (this.taskId && this.data.detail) this.load()
  },

  async load() {
    try {
      const res = await call('task.detail', { taskId: this.taskId })
      const task = res.task
      const myStatus = res.mySignup ? res.mySignup.status : ''
      const action = this.resolveAction(task, myStatus)

      this.setData({
        detail: {
          ...task,
          phaseLabel: PHASE_LABEL[task.phase] || '',
          sessionsText: (task.sessions || []).map((s) => formatSession(s)),
          quotaText: quotaText(task),
          deadlineText: `${formatDay(task.signupDeadline)} ${formatTime(task.signupDeadline)}`,
          myStatus,
          myStatusLabel: MY_SIGNUP_LABEL[myStatus] || ''
        },
        action,
        isOwner: !!res.isOwner,
        pendingCount: res.pendingCount || 0,
        loading: false
      })
      wx.setNavigationBarTitle({ title: task.title })
    } catch (err) {
      this.setData({ loading: false })
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }
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
    if (action === 'apply') return this.apply()
    if (action === 'cancel') return this.cancel()
  },

  onManage() {
    wx.navigateTo({ url: `/pages/task/manage/index?id=${this.taskId}` })
  },

  apply() {
    wx.showModal({
      title: '确认报名',
      content: '报名后请按时参加，临时有事请提前请假。',
      success: async (res) => {
        if (!res.confirm) return
        try {
          const result = await call('task.apply', { taskId: this.taskId })
          wx.showToast({
            title: result.status === 'waitlisted' ? '已进入候补' : '报名成功',
            icon: 'success'
          })
          this.load()
        } catch (err) {
          wx.showToast({ title: err.message || '报名失败', icon: 'none' })
        }
      }
    })
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
    wx.showModal({
      title: '请假',
      editable: true,
      placeholderText: '请填写请假原因',
      success: async (res) => {
        if (!res.confirm) return
        const reason = (res.content || '').trim()
        if (!reason) {
          wx.showToast({ title: '请填写请假原因', icon: 'none' })
          return
        }
        try {
          await call('signup.requestLeave', { taskId: this.taskId, reason })
          wx.showToast({ title: '已提交，等待审批', icon: 'success' })
          this.load()
        } catch (err) {
          wx.showToast({ title: err.message || '提交失败', icon: 'none' })
        }
      }
    })
  }
})
