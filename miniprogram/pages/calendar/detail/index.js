const { call } = require('../../../services/api')
const { formatDay, formatTime } = require('../../../utils/task')
const { ROLE } = require('../../../utils/constants')

Page({
  data: {
    event: null,
    canEdit: false,
    loading: true
  },

  onLoad(options) {
    this.eventId = options.id || ''
    this.load()
  },

  onShow() {
    if (this.eventId && this.data.event) this.load()
  },

  async load() {
    try {
      const res = await call('calendar.detail', { id: this.eventId })
      const event = res.event
      const member = getApp().globalData.member
      this.setData({
        event: {
          ...event,
          dateText: `${formatDay(event.startAt)} ${event.allDay ? '全天' : formatTime(event.startAt) + '–' + formatTime(event.endAt)}`
        },
        canEdit: !!member && member.role !== ROLE.MEMBER,
        loading: false
      })
      wx.setNavigationBarTitle({ title: event.title })
    } catch (err) {
      this.setData({ loading: false })
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }
  },

  onEdit() {
    wx.navigateTo({ url: `/pages/calendar/edit/index?id=${this.eventId}` })
  },

  onDelete() {
    wx.showModal({
      title: '删除事件',
      content: '删除后年历中不再显示，确定吗？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await call('calendar.remove', { id: this.eventId })
          wx.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 500)
        } catch (err) {
          wx.showToast({ title: err.message || '删除失败', icon: 'none' })
        }
      }
    })
  }
})
