const { call } = require('../../../services/api')
const { PRIORITY_LABEL, PRIORITY_CLASS, dueText } = require('../../../utils/todo')

const TABS = [
  { key: 'mine', label: '我的' },
  { key: 'dept', label: '部门' },
  { key: 'done', label: '已完成' }
]

Page({
  data: {
    tabs: TABS,
    tab: 'mine',
    list: [],
    loading: false
  },

  onShow() {
    this.load()
  },

  onTab(e) {
    this.setData({ tab: e.currentTarget.dataset.key }, () => this.load())
  },

  async load() {
    if (this.data.loading) return
    this.setData({ loading: true })
    try {
      const res = await call('todo.list', { scope: this.data.tab })
      const list = (res.list || []).map((item) => ({
        ...item,
        priorityLabel: PRIORITY_LABEL[item.priority] || '中',
        priorityClass: PRIORITY_CLASS[item.priority] || 'prio--mid',
        dueLabel: dueText(item.dueAt)
      }))
      this.setData({ list })
    } catch (err) {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  onAdd() {
    wx.navigateTo({ url: '/pages/todo/edit/index' })
  },

  onOpen(e) {
    wx.navigateTo({ url: `/pages/todo/edit/index?id=${e.currentTarget.dataset.id}` })
  },

  async onToggle(e) {
    const { id, done } = e.currentTarget.dataset
    try {
      await call('todo.complete', { id, done: done === '1' })
      this.load()
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' })
    }
  }
})
