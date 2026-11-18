const { call } = require('../../services/api')

Page({
  data: {
    version: '1.1.0',
    content: '',
    submitting: false,
    isOwner: false
  },

  onLoad() {
    this.loadTemplates()
  },

  async loadTemplates() {
    try {
      const res = await call('subscribe.templates', {})
      this.templates = res || {}
      this.setData({ isOwner: !!res.isOwner })
    } catch (err) {
      this.templates = {}
    }
  },

  onContent(e) {
    this.setData({ content: e.detail.value })
  },

  onOpenDoc(e) {
    const type = e.currentTarget.dataset.type
    wx.navigateTo({ url: `/pages/about/doc/index?type=${type}` })
  },

  async onSubscribeOwner() {
    const templateId = this.templates && this.templates.feedback
    if (!templateId) {
      wx.showToast({ title: '尚未配置反馈模板', icon: 'none' })
      return
    }
    if (!wx.requestSubscribeMessage) {
      wx.showToast({ title: '当前版本不支持', icon: 'none' })
      return
    }
    try {
      const res = await wx.requestSubscribeMessage({ tmplIds: [templateId] })
      if (res[templateId] === 'accept') {
        wx.showToast({ title: '已授权接收 1 条', icon: 'success' })
      } else {
        wx.showToast({ title: '未授权', icon: 'none' })
      }
    } catch (err) {
      wx.showToast({ title: '授权失败', icon: 'none' })
    }
  },

  async onSubmit() {
    const content = this.data.content.trim()
    if (!content) {
      wx.showToast({ title: '请填写反馈内容', icon: 'none' })
      return
    }
    if (this.data.submitting) return

    this.setData({ submitting: true })
    try {
      const res = await call('feedback.submit', { content })
      wx.showToast({
        title: res.delivered ? '已提交并通知主席' : '已提交给主席',
        icon: 'success'
      })
      this.setData({ content: '' })
    } catch (err) {
      wx.showToast({ title: err.message || '提交失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
