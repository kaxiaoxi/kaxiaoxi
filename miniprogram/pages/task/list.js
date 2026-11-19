const { call } = require('../../services/api')
const { PHASE_LABEL, PHASE_CLASS, formatRange, quotaText } = require('../../utils/task')
const { syncTabBar } = require('../../utils/tabbar')

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'dept', label: '本部门' },
  { key: 'mine', label: '我参与的' }
]

const STATUS = [
  { key: 'all', label: '全部' },
  { key: 'recruiting', label: '报名中' },
  { key: 'not_started', label: '未开始' },
  { key: 'finished', label: '已结束' }
]

function phaseText(task) {
  if (task.mySignupStatus === 'waitlisted') return '候补中'
  if (task.mySignupStatus === 'pending') return '审核中'
  if (task.mySignupStatus === 'approved') return '已报名'
  return PHASE_LABEL[task.phase] || ''
}

Page({
  data: {
    tabs: TABS,
    statusList: STATUS,
    tab: 'all',
    status: 'all',
    list: [],
    loading: false,
    loadError: false,
    tabPageEnter: false
  },

  onShow() {
    syncTabBar(this, 1, 'task')
    this.load()
  },

  onTab(e) {
    this.setData({ tab: e.currentTarget.dataset.key }, () => this.load())
  },

  onStatus(e) {
    this.setData({ status: e.currentTarget.dataset.key }, () => this.load())
  },

  async load() {
    if (this.data.loading) return
    this.setData({ loading: true, loadError: false })
    try {
      const { tab, status } = this.data
      const res =
        tab === 'mine' ? await call('task.mine') : await call('task.list', { scope: tab, status })

      const list = (res.list || []).map((task) => ({
        ...task,
        rangeText: formatRange(task),
        quotaText: quotaText(task),
        phaseLabel: phaseText(task),
        phaseClass: PHASE_CLASS[task.phase] || 'tag--gray'
      }))
      this.setData({ list })
    } catch (err) {
      console.warn('[task.list] 加载失败', err)
      this.setData({ loadError: true })
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  onOpen(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/task/detail/index?id=${id}` })
  },

  onCreate() {
    wx.navigateTo({ url: '/pages/task/create/index' })
  },

  onRetry() {
    this.load()
  }
})
