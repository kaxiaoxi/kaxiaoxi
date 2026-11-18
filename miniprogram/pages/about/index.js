const { call } = require('../../services/api')

Page({
  data: {
    version: '1.1.0',
    content: '',
    contact: '',
    submitting: false
  },

  onContent(e) {
    this.setData({ content: e.detail.value })
  },

  onContact(e) {
    this.setData({ contact: e.detail.value })
  },

  onOpenDoc(e) {
    const type = e.currentTarget.dataset.type
    wx.navigateTo({ url: `/pages/about/doc/index?type=${type}` })
  },

  async onSubmit() {
    const content = this.data.content.trim()
    if (content.length < 5) {
      wx.showToast({ title: '至少写 5 个字', icon: 'none' })
      return
    }
    if (this.data.submitting) return

    this.setData({ submitting: true })
    try {
      await call('feedback.submit', {
        content,
        contact: this.data.contact.trim()
      })
      wx.showToast({ title: '已提交给主席团', icon: 'success' })
      this.setData({ content: '', contact: '' })
    } catch (err) {
      wx.showToast({ title: err.message || '提交失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})

