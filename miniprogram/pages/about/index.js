const { call } = require('../../services/api')

Page({
  data: {
    version: '1.1.0',
    content: '',
    submitting: false
  },

  onLoad() {
    this.loadTemplates()
  },

  async loadTemplates() {
    try {
      this.templates = await call('subscribe.templates', {})
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

  async askSubscribe() {
    const templateId = this.templates && this.templates.feedback
    if (!templateId || !wx.requestSubscribeMessage) return
    try {
      await wx.requestSubscribeMessage({ tmplIds: [templateId] })
    } catch (err) {
      // 用户拒绝订阅不影响反馈提交
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
      await this.askSubscribe()
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
