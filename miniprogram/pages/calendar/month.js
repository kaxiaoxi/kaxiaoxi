const { call } = require('../../services/api')
const { formatDay, formatTime } = require('../../utils/task')

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

const TYPE_KEY = {
  招新: 'recruit',
  例会: 'meeting',
  外拍: 'shoot',
  比赛: 'contest',
  展览: 'exhibit',
  截止: 'deadline',
  其他: 'other'
}

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`
}

function keyOf(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function toDate(value) {
  return value instanceof Date ? value : new Date(value)
}

Page({
  data: {
    year: 0,
    month: 0,
    weekdays: WEEKDAYS,
    cells: [],
    selected: '',
    selectedLabel: '',
    dayEvents: [],
    loading: false
  },

  onLoad() {
    const now = new Date()
    this.setData({ year: now.getFullYear(), month: now.getMonth() + 1 })
  },

  onShow() {
    this.load()
  },

  async load() {
    if (this.data.loading) return
    const { year, month } = this.data
    const today = new Date()
    const fallback =
      today.getFullYear() === year && today.getMonth() === month - 1
        ? keyOf(today)
        : keyOf(new Date(year, month - 1, 1))
    const selected = this.data.selected || fallback
    this.setData({ loading: true, selected })

    try {
      const res = await call('calendar.month', { year, month })
      const events = (res.list || []).map((item) => ({
        ...item,
        startKey: keyOf(toDate(item.startAt)),
        endKey: keyOf(toDate(item.endAt)),
        timeText: item.allDay ? '全天' : `${formatTime(item.startAt)}–${formatTime(item.endAt)}`
      }))
      this.events = events
      this.render(events, selected)
    } catch (err) {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  render(events, selected) {
    const { year, month } = this.data
    const first = new Date(year, month - 1, 1)
    const startOffset = (first.getDay() + 6) % 7
    const cells = []
    const start = new Date(year, month - 1, 1 - startOffset)
    const todayKey = keyOf(new Date())

    for (let i = 0; i < 42; i += 1) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
      const key = keyOf(date)
      const dayEvents = events.filter((e) => key >= e.startKey && key <= e.endKey)
      cells.push({
        key,
        day: date.getDate(),
        inMonth: date.getMonth() === month - 1,
        isToday: key === todayKey,
        items: dayEvents.slice(0, 2).map((e) => ({
          id: e._id,
          title: e.title,
          colorKey: TYPE_KEY[e.type] || 'other'
        })),
        more: Math.max(dayEvents.length - 2, 0)
      })
    }

    const dayList = events
      .filter((e) => selected >= e.startKey && selected <= e.endKey)
      .map((e) => ({
        ...e,
        colorKey: TYPE_KEY[e.type] || 'other',
        dayText: e.startKey === e.endKey ? '' : `${formatDay(e.startAt)}–${formatDay(e.endAt)}`
      }))

    const [, m, d] = selected.split('-')
    this.setData({
      cells,
      selected,
      selectedLabel: `${Number(m)} 月 ${Number(d)} 日`,
      dayEvents: dayList
    })
  },

  onSelect(e) {
    const key = e.currentTarget.dataset.key
    this.render(this.events || [], key)
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

  onPrev() {
    const { year, month } = this.data
    const date = new Date(year, month - 2, 1)
    this.setData({ year: date.getFullYear(), month: date.getMonth() + 1, selected: '' }, () =>
      this.load()
    )
  },

  onNext() {
    const { year, month } = this.data
    const date = new Date(year, month, 1)
    this.setData({ year: date.getFullYear(), month: date.getMonth() + 1, selected: '' }, () =>
      this.load()
    )
  },

  onToday() {
    const now = new Date()
    this.setData(
      {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
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
  }
})
