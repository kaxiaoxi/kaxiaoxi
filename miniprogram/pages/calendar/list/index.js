const { call } = require('../../../services/api')
const { TYPE_KEY, STATUS_CLASS, dateRangeText } = require('../../../utils/calendar')
const { ensureMember } = require('../../../utils/session')

const RANGES = [
  { key: 'thisMonth', label: '本月' },
  { key: 'nextMonth', label: '下月' },
  { key: 'all', label: '全部' }
]

const VISIBILITIES = [
  { key: '', label: '全部' },
  { key: 'public', label: '公开' },
  { key: 'staff', label: '内部' }
]

Page({
  data: {
    ranges: RANGES,
    range: 'thisMonth',
    visibilities: VISIBILITIES,
    visibility: '',
    list: [],
    loading: true
  },

  async onLoad() {
    await ensureMember()
    this.load()
  },

  onShow() {
    this.load()
  },

  onRange(e) {
    this.setData({ range: e.currentTarget.dataset.key }, () => this.load())
  },

  onVisibility(e) {
    this.setData({ visibility: e.currentTarget.dataset.key }, () => this.load())
  },

  async load() {
    if (this.data.loading === 'busy') return
    this.setData({ loading: 'busy' })
    try {
      const res = await call('calendar.list', {
        range: this.data.range,
        visibility: this.data.visibility
      })
      const list = (res.list || []).map((item) => ({
        ...item,
        dateText: dateRangeText(item.startDate, item.endDate),
        colorKey: TYPE_KEY[item.type] || 'other',
        statusClass: STATUS_CLASS[item.status] || 'chip--gray',
        visibilityLabel: item.visibility === 'staff' ? '内部' : '公开'
      }))
      this.setData({ list, loading: false })
    } catch (err) {
      this.setData({ loading: false })
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }
  },

  onOpen(e) {
    wx.navigateTo({ url: `/pages/calendar/detail/index?id=${e.currentTarget.dataset.id}` })
  },

  onCreate() {
    wx.navigateTo({ url: '/pages/calendar/edit/index' })
  }
})
