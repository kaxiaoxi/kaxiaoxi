const { call } = require('../../../services/api')
const { formatRange, formatSession, quotaText } = require('../../../utils/task')

Page({
  data: {
    loading: true,
    loadError: false,
    task: null,
    fromCreate: false
  },

  onLoad(options) {
    this.taskId = options.id || ''
    this.setData({ fromCreate: options.from === 'create' })
    this.load()
  },

  async load() {
    if (!this.taskId) {
      this.setData({ loading: false, loadError: true })
      return
    }
    this.setData({ loading: true, loadError: false })
    try {
      const res = await call('task.detail', { taskId: this.taskId })
      const task = res.task
      this.setData({
        task: {
          ...task,
          timeText: formatRange(task),
          sessionsText: (task.sessions || []).map((item) => formatSession(item)),
          quotaText: task.useRoles ? '按分工报名' : quotaText(task),
          erkeText: `${task.erkeHours || 0} 学时/场`,
          roleTexts: (task.roles || []).map((item) => `${item.name} ${item.quota} 人/场`)
        },
        loading: false
      })
    } catch (err) {
      console.warn('[task.share] 加载失败', err)
      this.setData({ loading: false, loadError: true })
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }
  },

  async onPullDownRefresh() {
    await this.load()
    wx.stopPullDownRefresh()
  },

  onRetry() {
    this.load()
  },

  onOpenDetail() {
    if (!this.taskId) return
    wx.navigateTo({ url: `/pages/task/detail/index?id=${this.taskId}` })
  },

  onShareAppMessage() {
    return {
      title: (this.data.task && this.data.task.title) || '广工影协任务报名',
      path: `/pages/task/share/index?id=${this.taskId}`,
      imageUrl: '/images/share-cover.png'
    }
  }
})
