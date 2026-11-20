const { call } = require('../../../services/api')
const { DEPT, DEPT_LABEL } = require('../../../utils/constants')

const DEPT_KEYS = [DEPT.PHOTO, DEPT.PR, DEPT.OPS]
const DEPT_OPTIONS = DEPT_KEYS.map((key) => ({ key, label: DEPT_LABEL[key] }))

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`
}

function addHours(time, hours) {
  const [h, m] = String(time || '09:00')
    .split(':')
    .map(Number)
  let total = h * 60 + m + hours * 60
  if (total > 23 * 60 + 59) total = 23 * 60 + 59
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
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
      quota: '',
      erkeHours: '2',
      signupMode: 'first_come',
      audience: 'depts',
      targetDepts: []
    },
    deptOptions: DEPT_OPTIONS,
    sessions: [],
    useRoles: false,
    roles: [],
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
          start: last ? last.end : '09:00',
          end: last ? addHours(last.end, 3) : '12:00'
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

  syncQuota() {
    if (!this.data.useRoles) return
    const total = this.data.roles.reduce((sum, item) => sum + (Number(item.quota) || 0), 0)
    this.setData({ 'form.quota': String(total) })
  },

  onToggleRoles(e) {
    const useRoles = !!e.detail.value
    const roles = useRoles && !this.data.roles.length ? [{ name: '', quota: '' }] : this.data.roles
    this.setData({ useRoles, roles }, () => this.syncQuota())
  },

  onRoleInput(e) {
    const index = Number(e.currentTarget.dataset.index)
    const field = e.currentTarget.dataset.field
    this.setData({ [`roles[${index}].${field}`]: e.detail.value }, () => this.syncQuota())
  },

  onAddRole() {
    if (this.data.roles.length >= 8) {
      wx.showToast({ title: '分工最多 8 个', icon: 'none' })
      return
    }
    this.setData({ roles: this.data.roles.concat([{ name: '', quota: '' }]) }, () =>
      this.syncQuota()
    )
  },

  onRemoveRole(e) {
    const index = Number(e.currentTarget.dataset.index)
    const roles = this.data.roles.slice()
    roles.splice(index, 1)
    this.setData({ roles }, () => this.syncQuota())
  },

  async onSubmit(e) {
    if (this.data.submitting) return
    const share = e && e.currentTarget && e.currentTarget.dataset.share === '1'
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
      quota: Number(form.quota) || 0,
      erkeHours: Number(form.erkeHours) || 0,
      useRoles: this.data.useRoles,
      roles: this.data.useRoles
        ? this.data.roles
            .filter((item) => item.name.trim())
            .map((item) => ({ name: item.name.trim(), quota: Number(item.quota) || 0 }))
        : [],
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
      const created = await call('task.create', payload)
      if (share) {
        wx.redirectTo({ url: `/pages/task/share/index?id=${created.id}&from=create` })
        return
      }
      wx.showToast({ title: '发布成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 600)
    } catch (err) {
      wx.showToast({ title: err.message || '发布失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
