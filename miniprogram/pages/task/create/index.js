const { call } = require('../../../services/api')
const { DEPT, DEPT_LABEL } = require('../../../utils/constants')

const DEPT_KEYS = [DEPT.PHOTO, DEPT.PR, DEPT.OPS]
const DEPT_OPTIONS = DEPT_KEYS.map((key) => ({ key, label: DEPT_LABEL[key] }))

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`
}

function dateAfter(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

Page({
  data: {
    form: {
      title: '',
      description: '',
      locationName: '',
      collectMethod: '',
      quota: '6',
      erkeHours: '4',
      signupMode: 'first_come',
      audience: 'all',
      targetDepts: []
    },
    deptOptions: DEPT_OPTIONS,
    sessions: [],
    deadlineDate: '',
    deadlineTime: '08:00',
    startMode: 'now',
    startDate: '',
    startTime: '20:00',
    submitting: false
  },

  onLoad() {
    this.setData({
      sessions: [{ key: Date.now(), date: dateAfter(1), start: '09:00', end: '12:00' }],
      deadlineDate: dateAfter(1),
      startDate: dateAfter(0)
    })
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  onSessionChange(e) {
    const index = Number(e.currentTarget.dataset.index)
    const field = e.currentTarget.dataset.field
    this.setData({ [`sessions[${index}].${field}`]: e.detail.value })
  },

  onAddSession() {
    const last = this.data.sessions[this.data.sessions.length - 1]
    this.setData({
      sessions: this.data.sessions.concat([
        {
          key: Date.now(),
          date: last ? last.date : dateAfter(1),
          start: '09:00',
          end: '12:00'
        }
      ])
    })
  },

  onRemoveSession(e) {
    if (this.data.sessions.length <= 1) {
      wx.showToast({ title: '至少保留一个场次', icon: 'none' })
      return
    }
    const index = Number(e.currentTarget.dataset.index)
    const sessions = this.data.sessions.slice()
    sessions.splice(index, 1)
    this.setData({ sessions })
  },

  onDeadlineDate(e) {
    this.setData({ deadlineDate: e.detail.value })
  },

  onDeadlineTime(e) {
    this.setData({ deadlineTime: e.detail.value })
  },

  onStartMode(e) {
    this.setData({ startMode: e.currentTarget.dataset.mode })
  },

  onStartDate(e) {
    this.setData({ startDate: e.detail.value })
  },

  onStartTime(e) {
    this.setData({ startTime: e.detail.value })
  },

  onSignupMode(e) {
    this.setData({ 'form.signupMode': e.currentTarget.dataset.mode })
  },

  onAudience(e) {
    this.setData({ 'form.audience': e.currentTarget.dataset.mode })
  },

  onDeptChange(e) {
    this.setData({ 'form.targetDepts': e.detail.value })
  },

  buildSessions() {
    return this.data.sessions.map((item) => ({
      startAt: `${item.date}T${item.start}:00+08:00`,
      endAt: `${item.date}T${item.end}:00+08:00`
    }))
  },

  validate() {
    const { form, deadlineDate, deadlineTime } = this.data
    if (!form.title.trim()) return '请填写活动名称'
    if (!form.description.trim()) return '请填写活动详情'
    if (!form.locationName.trim()) return '请填写活动地点'
    if (!form.collectMethod.trim()) return '请填写收图方式'

    const sessions = this.buildSessions()
    for (const item of sessions) {
      if (new Date(item.endAt) <= new Date(item.startAt)) return '每场结束时间需晚于开始时间'
    }
    sessions.sort((a, b) => new Date(a.startAt) - new Date(b.startAt))

    const deadline = new Date(`${deadlineDate}T${deadlineTime}:00+08:00`)
    if (deadline > new Date(sessions[0].startAt)) return '报名截止需早于首场开始'
    return ''
  },

  async onSubmit() {
    if (this.data.submitting) return
    const message = this.validate()
    if (message) {
      wx.showToast({ title: message, icon: 'none' })
      return
    }

    const { form, startMode, startDate, startTime, deadlineDate, deadlineTime } = this.data
    const payload = {
      title: form.title,
      description: form.description,
      locationName: form.locationName,
      collectMethod: form.collectMethod,
      quota: Number(form.quota),
      erkeHours: Number(form.erkeHours),
      signupMode: form.signupMode,
      audience: form.audience,
      targetDepts: form.targetDepts,
      sessions: this.buildSessions(),
      signupStartAt:
        startMode === 'now' ? new Date().toISOString() : `${startDate}T${startTime}:00+08:00`,
      signupDeadline: `${deadlineDate}T${deadlineTime}:00+08:00`
    }

    this.setData({ submitting: true })
    try {
      await call('task.create', payload)
      wx.showToast({ title: '发布成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 600)
    } catch (err) {
      wx.showToast({ title: err.message || '发布失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
