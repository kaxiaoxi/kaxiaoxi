const { call } = require('../../../services/api')
const { TYPES, STATUS } = require('../../../utils/calendar')
const { ensureMember } = require('../../../utils/session')

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
    nameOptions: ['摆摊', '全体大会', '摄影大赛'],
    showNameSheet: false,
    nameDraft: -1,
    typeIndex: 0,
    statuses: STATUS,
    statusIndex: 1,
    members: [],
    ownerOpenid: '',
    ownerName: '',
    deputyOpenid: '',
    deputyName: '',
    pickerVisible: false,
    pickerTarget: 'owner',
    pickerTitle: '选择主负责人',
    pickerExclude: '',
    pickerValue: '',
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

  async onLoad(options) {
    this.setData({ startDate: todayKey() })
    const member = await ensureMember()
    this.selfOpenid = (member || {})._openid || ''
    // 冷启动可能拿不到 globalData，先补一次登录态再决定默认负责人
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
      this.setData({ members })
    } catch (err) {
      wx.showToast({ title: err.message || '成员加载失败', icon: 'none' })
    }
  },

  setDefaultOwner() {
    const { members } = this.data
    const me = members.find((item) => item.openid === this.selfOpenid) || members[0]
    if (!me) return
    this.setData({ ownerOpenid: me.openid, ownerName: me.name })
  },

  async loadEvent(id) {
    try {
      const res = await call('calendar.detail', { id })
      const event = res.event
      const { members } = this.data
      const owner = members.find((item) => item.openid === event.ownerOpenid)
      const deputy = members.find((item) => item.openid === event.deputyOpenid)

      this.setData({
        form: {
          title: event.title,
          location: event.location || '',
          timeText: event.timeText || '全天',
          note: event.note || ''
        },
        typeIndex: Math.max(TYPES.indexOf(event.type), 0),
        statusIndex: Math.max(STATUS.indexOf(event.status), 1),
        ownerOpenid: event.ownerOpenid || '',
        ownerName: owner ? owner.name : event.ownerName || '',
        deputyOpenid: event.deputyOpenid || '',
        deputyName: deputy ? deputy.name : event.deputyName || '',
        startDate: event.startDate,
        endDate: event.endDate || '',
        remindDate: event.remindDate || '',
        visibility: event.visibility || 'public'
      })
    } catch (err) {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }
  },

  onOpenNameSheet() {
    this.setData({ showNameSheet: true, nameDraft: -1 })
  },

  onPickName(e) {
    this.setData({ nameDraft: Number(e.currentTarget.dataset.index) })
  },

  onCloseNameSheet() {
    this.setData({ showNameSheet: false })
  },

  onConfirmNameSheet() {
    const index = this.data.nameDraft
    if (index < 0) {
      wx.showToast({ title: '请选择日程名称', icon: 'none' })
      return
    }
    this.setData({ 'form.title': this.data.nameOptions[index], showNameSheet: false })
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

  onOpenOwnerPicker() {
    this.setData({
      pickerVisible: true,
      pickerTarget: 'owner',
      pickerTitle: '选择主负责人',
      pickerExclude: '',
      pickerValue: this.data.ownerOpenid
    })
  },

  onOpenDeputyPicker() {
    this.setData({
      pickerVisible: true,
      pickerTarget: 'deputy',
      pickerTitle: '选择副负责人',
      pickerExclude: this.data.ownerOpenid,
      pickerValue: this.data.deputyOpenid
    })
  },

  onPickerClose() {
    this.setData({ pickerVisible: false })
  },

  onPickerSelect(e) {
    const { openid, name } = e.detail
    if (this.data.pickerTarget === 'owner') {
      // 主负责人换了，副负责人不能与之相同
      const patch = { ownerOpenid: openid, ownerName: name, pickerVisible: false }
      if (openid && openid === this.data.deputyOpenid) {
        patch.deputyOpenid = ''
        patch.deputyName = ''
      }
      this.setData(patch)
      return
    }
    this.setData({ deputyOpenid: openid, deputyName: name, pickerVisible: false })
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
      ownerOpenid,
      deputyOpenid,
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
    if (!ownerOpenid) {
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
        ownerOpenid,
        deputyOpenid: deputyOpenid || '',
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
