const { call } = require('../../../services/api')
const { withAvatarUrls } = require('../../../utils/avatar')
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
    sessionOptions: [],
    roleOptions: [],
    showLeaveSheet: false,
    leaveLoading: false,
    leaveReason: ''
  },

  onLoad(options) {
    this.taskId = options.id || ''
    // 提前缓存模板 ID，点「确认报名」时才能同步发起授权
    call('subscribe.templates', {})
      .then((tpl) => {
        this.remindTpl = (tpl && tpl.activity) || ''
      })
      .catch(() => {
        this.remindTpl = ''
      })
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
      const participants = await withAvatarUrls(res.participants || [])

      this.setData({
        detail: {
          ...task,
          participants,
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

  async onPullDownRefresh() {
    await this.load()
    wx.stopPullDownRefresh()
  },

  onAvatarError(e) {
    const index = Number(e.currentTarget.dataset.index)
    const participants = (this.data.detail.participants || []).map((item, i) =>
      i === index ? { ...item, avatarFileID: '' } : item
    )
    this.setData({ 'detail.participants': participants })
  },

  onManage() {
    wx.navigateTo({ url: `/pages/task/manage/index?id=${this.taskId}` })
  },

  onOpenApply() {
    const task = this.data.detail || {}
    const sessions = task.sessions || []
    const roles = task.roles || []
    this.setData({
      showApplySheet: true,
      sessionOptions: sessions.map((item, index) => ({
        value: item.startAt,
        label: (task.sessionsText || [])[index] || `第 ${index + 1} 场`,
        checked: index === 0
      })),
      roleOptions: roles.map((item) => ({
        name: item.name,
        quota: item.quota,
        checked: roles.length === 1
      }))
    })
  },

  onToggleApplySession(e) {
    const index = Number(e.currentTarget.dataset.index)
    this.setData({ [`sessionOptions[${index}].checked`]: !this.data.sessionOptions[index].checked })
  },

  onToggleApplyRole(e) {
    const index = Number(e.currentTarget.dataset.index)
    this.setData({ [`roleOptions[${index}].checked`]: !this.data.roleOptions[index].checked })
  },

  onCloseApplySheet() {
    if (this.data.applyLoading) return
    this.setData({ showApplySheet: false })
  },

  confirmApply() {
    if (this.data.applyLoading) return

    // requestSubscribeMessage 只认用户点击上下文：
    // 必须在这里同步发起，不能放到 await 之后（否则报 can only be invoked by user TAP gesture）
    const tmplId = this.remindTpl || ''
    if (!tmplId) {
      this.doApply()
      return
    }
    wx.requestSubscribeMessage({
      tmplIds: [tmplId],
      complete: () => this.doApply()
    })
  },

  async doApply() {
    const sessions = this.data.sessionOptions
      .filter((item) => item.checked)
      .map((item) => item.value)
    const roles = this.data.roleOptions.filter((item) => item.checked).map((item) => item.name)
    if (!sessions.length) {
      wx.showToast({ title: '请选择参加的时段', icon: 'none' })
      return
    }
    if (this.data.roleOptions.length && !roles.length) {
      wx.showToast({ title: '请选择分工', icon: 'none' })
      return
    }

    this.setData({ applyLoading: true })
    try {
      const result = await call('task.apply', { taskId: this.taskId, sessions, roles })
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
      // 授权已经在 confirmApply 里完成，这里只登记一条待发提醒
      if (!this.remindTpl) return
      await call('reminder.create', { taskId: this.taskId })
    } catch (err) {
      console.warn('[task] 登记提醒失败', err)
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
