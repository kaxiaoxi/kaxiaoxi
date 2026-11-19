const { call } = require('../../../services/api')
const { STATUS_CLASS, TYPE_KEY } = require('../../../utils/calendar')
const { ROLE } = require('../../../utils/constants')

Page({
  data: {
    event: null,
    sourceTask: null,
    relatedTodos: [],
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
      const range =
        event.endDate && event.endDate !== event.startDate
          ? `${event.startDate} – ${event.endDate}`
          : event.startDate

      this.setData({
        event: {
          ...event,
          colorKey: TYPE_KEY[event.type] || 'other',
          statusClass: STATUS_CLASS[event.status] || 'chip--gray',
          dateText: `${range} ${event.timeText || ''}`.trim()
        },
        sourceTask: res.sourceTask || null,
        relatedTodos: res.relatedTodos || [],
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

  onOpenTask() {
    const task = this.data.sourceTask
    if (!task) return
    wx.navigateTo({ url: `/pages/task/detail/index?id=${task._id}` })
  },

  onOpenTodo(e) {
    wx.navigateTo({ url: `/pages/todo/detail/index?id=${e.currentTarget.dataset.id}` })
  },

  onDelete() {
    wx.showModal({
      title: '删除日程',
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
