const { call } = require('../../../services/api')
const { DEPT, DEPT_LABEL } = require('../../../utils/constants')
const { validateRegister } = require('../../../utils/validate')
const guest = require('../../../utils/guest')

const DEPT_KEYS = [DEPT.PHOTO, DEPT.PR, DEPT.OPS]
const DEPT_LABELS = DEPT_KEYS.map((key) => DEPT_LABEL[key])

Page({
  data: {
    form: {
      name: '',
      studentNo: '',
      college: '',
      phone: '',
      dorm: '',
      dept: '',
      birthday: ''
    },
    deptLabels: DEPT_LABELS,
    deptIndex: -1,
    submitting: false
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  onBirthdayChange(e) {
    this.setData({ 'form.birthday': e.detail.value })
  },

  onDeptChange(e) {
    const index = Number(e.detail.value)
    this.setData({
      deptIndex: index,
      'form.dept': DEPT_KEYS[index]
    })
  },

  onGuestLogin() {
    guest.enter()
    wx.reLaunch({ url: '/pages/home/index' })
  },

  async onSubmit() {
    if (this.data.submitting) return

    const check = validateRegister(this.data.form)
    if (!check.ok) {
      wx.showToast({ title: check.message, icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    try {
      const result = await call('auth.register', check.data)
      if (result.state === 'active') {
        wx.reLaunch({ url: '/pages/home/index' })
        return
      }
      wx.redirectTo({ url: '/pages/join/pending/index' })
    } catch (err) {
      wx.showToast({ title: err.message || '提交失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
