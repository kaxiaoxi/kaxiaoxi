const { call } = require('../../services/api')
const { syncTabBar } = require('../../utils/tabbar')
const guest = require('../../utils/guest')
const { TYPE_KEY, STATUS_CLASS } = require('../../utils/calendar')
const { ROLE } = require('../../utils/constants')
const { ensureMember } = require('../../utils/session')

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const MONTH_NAMES = [
  '一月',
  '二月',
  '三月',
  '四月',
  '五月',
  '六月',
  '七月',
  '八月',
  '九月',
  '十月',
  '十一月',
  '十二月'
]

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`
}

function keyOf(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

Page({
  data: {
    year: 0,
    month: 0,
    monthName: '',
    pickerValue: '',
    weekdays: WEEKDAYS,
    cells: [],
    selected: '',
    selectedLabel: '选择日期查看安排',
    dayEvents: [],
    loading: false,
    loadError: false,
    tabPageEnter: false,
    isStaff: false,
    guestLocked: false
  },

  onLoad() {
    const now = new Date()
    this.setData({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      monthName: MONTH_NAMES[now.getMonth()],
      pickerValue: `${now.getFullYear()}-${pad(now.getMonth() + 1)}`,
      selected: keyOf(now)
    })
  },

  async onShow() {
    syncTabBar(this, 2, 'calendar')

    if (guest.isGuest()) {
      this.setData({ guestLocked: true, isStaff: false, loading: false })
      return
    }
    this.setData({ guestLocked: false })

    // 冷启动直接进年历页时 globalData 可能是空的，先补一次登录态
    const member = await ensureMember()
    this.setData({ isStaff: !!member && member.role !== ROLE.MEMBER })
    this.load()
  },

  async load() {
    if (this.data.loading) return
    const { year, month, selected } = this.data
    this.setData({
      loading: true,
      loadError: false,
      monthName: MONTH_NAMES[month - 1],
      pickerValue: `${year}-${pad(month)}`
    })

    try {
      const res = await call('calendar.month', { year, month })
      const events = (res.list || []).map((item) => ({
        ...item,
        startKey: item.startDate,
        // 单日活动 endDate 为空，用开始日兜底，避免跨天判断出错
        endKey: item.endDate || item.startDate,
        colorKey: TYPE_KEY[item.type] || 'other'
      }))
      this.events = events
      this.render(events, selected)
    } catch (err) {
      console.warn('[calendar] 加载失败', err)
      this.setData({ loadError: true })
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  render(events, selected) {
    const { year, month } = this.data
    const first = new Date(year, month - 1, 1)
    const startOffset = first.getDay()
    const start = new Date(year, month - 1, 1 - startOffset)
    const todayKey = keyOf(new Date())
    const cells = []

    for (let i = 0; i < 42; i += 1) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
      const key = keyOf(date)
      const dayEvents = events.filter((e) => key >= e.startKey && key <= e.endKey)
      cells.push({
        key,
        day: date.getDate(),
        inMonth: date.getMonth() === month - 1,
        isToday: key === todayKey,
        items: dayEvents.slice(0, 3).map((e) => ({
          id: e._id,
          title: e.title,
          colorKey: e.colorKey,
          isStaff: e.visibility === 'staff'
        })),
        more: Math.max(dayEvents.length - 3, 0)
      })
    }

    const dayList = selected
      ? events
          .filter((e) => selected >= e.startKey && selected <= e.endKey)
          .map((e) => ({
            ...e,
            colorKey: e.colorKey,
            statusClass: STATUS_CLASS[e.status] || 'chip--gray',
            isStaffTag: e.visibility === 'staff',
            dayText:
              e.startKey === e.endKey
                ? ''
                : `${e.startKey.slice(5).replace('-', '/')}–${e.endKey.slice(5).replace('-', '/')}`
          }))
      : []

    let selectedLabel = '选择日期查看安排'
    if (selected) {
      const [, m, d] = selected.split('-')
      selectedLabel = `${Number(m)} 月 ${Number(d)} 日`
    }

    this.setData({ cells, selected, selectedLabel, dayEvents: dayList })
  },

  onSelect(e) {
    this.render(this.events || [], e.currentTarget.dataset.key)
  },

  onTouchStart(e) {
    this.touchX = e.touches[0].clientX
    this.touchY = e.touches[0].clientY
  },

  onTouchEnd(e) {
    if (this.touchX === undefined) return
    const dx = e.changedTouches[0].clientX - this.touchX
    const dy = e.changedTouches[0].clientY - this.touchY
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) this.onPrev()
      else this.onNext()
    }
  },

  shiftMonth(delta) {
    const { year, month } = this.data
    const date = new Date(year, month - 1 + delta, 1)
    const y = date.getFullYear()
    const m = date.getMonth() + 1
    this.setData(
      {
        year: y,
        month: m,
        monthName: MONTH_NAMES[m - 1],
        pickerValue: `${y}-${pad(m)}`,
        selected: ''
      },
      () => this.load()
    )
  },

  onPrev() {
    this.shiftMonth(-1)
  },

  onNext() {
    this.shiftMonth(1)
  },

  onPickMonth(e) {
    const [y, m] = e.detail.value.split('-').map(Number)
    this.setData(
      {
        year: y,
        month: m,
        monthName: MONTH_NAMES[m - 1],
        pickerValue: e.detail.value,
        selected: ''
      },
      () => this.load()
    )
  },

  onToday() {
    const now = new Date()
    this.setData(
      {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        monthName: MONTH_NAMES[now.getMonth()],
        pickerValue: `${now.getFullYear()}-${pad(now.getMonth() + 1)}`,
        selected: keyOf(now)
      },
      () => this.load()
    )
  },

  onOpen(e) {
    wx.navigateTo({ url: `/pages/calendar/detail/index?id=${e.currentTarget.dataset.id}` })
  },

  onCreate() {
    wx.navigateTo({ url: '/pages/calendar/edit/index' })
  },

  onRetry() {
    this.load()
  },

  onList() {
    wx.navigateTo({ url: '/pages/calendar/list/index' })
  }
})
