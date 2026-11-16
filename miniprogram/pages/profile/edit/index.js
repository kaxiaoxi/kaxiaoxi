const { call } = require('../../../services/api')

Page({
  data: {
    form: {
      phone: '',
      dorm: '',
      birthday: ''
    },
    reason: '',
    submitting: false
  },

  onLoad() {
    const member = getApp().globalData.member
    if (member) {
      this.setData({
        form: {
          phone: member.phone || '',
          dorm: member.dorm || '',
          birthday: member.birthday || ''
        }
      })
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  onReason(e) {
    this.setData({ reason: e.detail.value })
  },

  onBirthday(e) {
    this.setData({ 'form.birthday': e.detail.value })
  },

  async onSubmit() {
    if (this.data.submitting) return
    if (!this.data.reason.trim()) {
      wx.showToast({ title: '请填写修改理由', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    try {
      await call('profile.submit', {
        ...this.data.form,
        reason: this.data.reason.trim()
      })
      wx.showToast({ title: '已提交审核', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 600)
    } catch (err) {
      wx.showToast({ title: err.message || '提交失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
