const { call } = require('../../../services/api')
const { TYPES, STATUS } = require('../../../utils/calendar')

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`
}

function todayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

Page({
  data: {
    id: '',
    types: TYPES,
    typeIndex: 0,
    statuses: STATUS,
    statusIndex: 1,
    members: [],
    memberNames: [],
    deputyNames: [],
    ownerIndex: -1,
    deputyIndex: 0,
    form: {
      title: '',
      location: '',
      timeText: '全天',
      note: ''
    },
    startDate: '',
    endDate: '',
    remindDate: '',
    visibility: 'public',
    submitting: false
  },

  onLoad(options) {
    this.setData({ startDate: todayKey() })
    this.selfOpenid = (getApp().globalData.member || {})._openid || ''
    this.loadMembers().then(() => {
      const id = options.id || ''
      if (id) {
        this.setData({ id })
        this.loadEvent(id)
      } else {
        this.setDefaultOwner()
      }
    })
  },

  /** 选人数据只有部长与主席能取，用于主 / 副负责人。 */
  async loadMembers() {
    try {
      const res = await call('member.options')
      const members = res.list || []
      this.setData({
        members,
        memberNames: members.map((item) => item.name),
        deputyNames: ['不设置'].concat(members.map((item) => item.name))
      })
    } catch (err) {
      wx.showToast({ title: err.message || '成员加载失败', icon: 'none' })
    }
  },

  setDefaultOwner() {
    const { members } = this.data
    let index = members.findIndex((item) => item.openid === this.selfOpenid)
    if (index < 0) index = 0
    this.setData({ ownerIndex: members.length ? index : -1 })
  },

  async loadEvent(id) {
    try {
      const res = await call('calendar.detail', { id })
      const event = res.event
      const { members } = this.data
      const ownerIndex = members.findIndex((item) => item.openid === event.ownerOpenid)
      const deputyIndex = event.deputyOpenid
        ? members.findIndex((item) => item.openid === event.deputyOpenid) + 1
        : 0

      this.setData({
        form: {
          title: event.title,
          location: event.location || '',
          timeText: event.timeText || '全天',
          note: event.note || ''
        },
        typeIndex: Math.max(TYPES.indexOf(event.type), 0),
        statusIndex: Math.max(STATUS.indexOf(event.status), 1),
        ownerIndex,
        deputyIndex,
        startDate: event.startDate,
        endDate: event.endDate || '',
        remindDate: event.remindDate || '',
        visibility: event.visibility || 'public'
      })
    } catch (err) {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  onType(e) {
    this.setData({ typeIndex: Number(e.detail.value) })
  },

  onStatus(e) {
    this.setData({ statusIndex: Number(e.detail.value) })
  },

  onOwner(e) {
    this.setData({ ownerIndex: Number(e.detail.value) })
  },

  onDeputy(e) {
    this.setData({ deputyIndex: Number(e.detail.value) })
  },

  onStartDate(e) {
    this.setData({ startDate: e.detail.value })
  },

  onEndDate(e) {
    this.setData({ endDate: e.detail.value })
  },

  onClearEndDate() {
    this.setData({ endDate: '' })
  },

  onRemindDate(e) {
    this.setData({ remindDate: e.detail.value })
  },

  onClearRemindDate() {
    this.setData({ remindDate: '' })
  },

  onQuickTime(e) {
    this.setData({ 'form.timeText': e.currentTarget.dataset.text })
  },

  onVisibility(e) {
    this.setData({ visibility: e.currentTarget.dataset.value })
  },

  async onSubmit() {
    if (this.data.submitting) return
    const {
      id,
      form,
      typeIndex,
      statusIndex,
      members,
      ownerIndex,
      deputyIndex,
      startDate,
      endDate,
      remindDate,
      visibility
    } = this.data

    if (!form.title.trim()) {
      wx.showToast({ title: '请填写日程名称', icon: 'none' })
      return
    }
    if (!startDate) {
      wx.showToast({ title: '请选择开始日期', icon: 'none' })
      return
    }
    if (endDate && endDate < startDate) {
      wx.showToast({ title: '结束日期不能早于开始日期', icon: 'none' })
      return
    }
    if (ownerIndex < 0 || !members[ownerIndex]) {
      wx.showToast({ title: '请选择主负责人', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    try {
      await call('calendar.save', {
        id,
        title: form.title,
        type: TYPES[typeIndex],
        startDate,
        endDate: endDate || '',
        timeText: form.timeText || '全天',
        location: form.location,
        ownerOpenid: members[ownerIndex].openid,
        deputyOpenid:
          deputyIndex > 0 && members[deputyIndex - 1] ? members[deputyIndex - 1].openid : '',
        status: STATUS[statusIndex],
        visibility,
        note: form.note,
        remindDate: remindDate || ''
      })
      wx.showToast({ title: '已保存', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 500)
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
