const { call } = require('../../services/api')

Page({
  data: {
    version: '1.1.0',
    content: '',
    submitting: false
  },

  onContent(e) {
    this.setData({ content: e.detail.value })
  },

  onOpenDoc(e) {
    const type = e.currentTarget.dataset.type
    wx.navigateTo({ url: `/pages/about/doc/index?type=${type}` })
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
      await call('feedback.submit', { content })
      wx.showToast({ title: '已提交给主席', icon: 'success' })
      this.setData({ content: '' })
    } catch (err) {
      wx.showToast({ title: err.message || '提交失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
