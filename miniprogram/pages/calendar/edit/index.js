const { call } = require('../../../services/api')

const TYPES = ['招新', '例会', '外拍', '比赛', '展览', '截止', '其他']

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`
}

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

Page({
  data: {
    id: '',
    types: TYPES,
    typeIndex: 1,
    form: {
      title: '',
      locationName: '',
      description: ''
    },
    date: '',
    startTime: '19:00',
    endTime: '21:00',
    allDay: false,
    submitting: false
  },

  onLoad(options) {
    const id = options.id || ''
    this.setData({ id, date: today() })
    if (id) this.load(id)
  },

  async load(id) {
    try {
      const res = await call('calendar.detail', { id })
      const event = res.event
      const start = new Date(event.startAt)
      const end = new Date(event.endAt)
      this.setData({
        form: {
          title: event.title,
          locationName: event.locationName || '',
          description: event.description || ''
        },
        typeIndex: Math.max(TYPES.indexOf(event.type), 0),
        date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
        startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
        endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
        allDay: !!event.allDay
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

  onDate(e) {
    this.setData({ date: e.detail.value })
  },

  onStartTime(e) {
    this.setData({ startTime: e.detail.value })
  },

  onEndTime(e) {
    this.setData({ endTime: e.detail.value })
  },

  onAllDay(e) {
    this.setData({ allDay: e.detail.value })
  },

  async onSubmit() {
    if (this.data.submitting) return
    const { form, date, startTime, endTime, allDay, typeIndex, id } = this.data
    if (!form.title.trim()) {
      wx.showToast({ title: '请填写事件名称', icon: 'none' })
      return
    }

    const startAt = allDay ? `${date}T00:00:00+08:00` : `${date}T${startTime}:00+08:00`
    const endAt = allDay ? `${date}T23:59:00+08:00` : `${date}T${endTime}:00+08:00`
    if (!allDay && new Date(endAt) <= new Date(startAt)) {
      wx.showToast({ title: '结束时间需晚于开始时间', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    try {
      await call('calendar.save', {
        id,
        title: form.title,
        type: TYPES[typeIndex],
        startAt,
        endAt,
        allDay,
        locationName: form.locationName,
        description: form.description
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
