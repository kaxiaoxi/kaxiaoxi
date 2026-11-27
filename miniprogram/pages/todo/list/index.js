const { call } = require('../../../services/api')
const {
  PRIORITY_LABEL,
  PRIORITY_CLASS,
  AUDIENCE_LABEL,
  dueText,
  joinText
} = require('../../../utils/todo')
const { DEPT_LABEL, ROLE } = require('../../../utils/constants')
const { ensureMember } = require('../../../utils/session')

const EMPTY_TEXT = {
  mine: '暂无待办',
  dept: '本部门暂时没有可加入的待办',
  staff: '暂无内部待办',
  done: '还没有完成的待办'
}

Page({
  data: {
    tabs: [],
    tab: 'mine',
    list: [],
    loading: false,
    emptyText: EMPTY_TEXT.mine,
    isStaff: false
  },

  onLoad(options) {
    // 首页「部门待办」入口带 tab 参数进来
    if (options && options.tab && EMPTY_TEXT[options.tab]) {
      this.setData({ tab: options.tab, emptyText: EMPTY_TEXT[options.tab] })
    }
    this.buildTabs()
  },

  async onShow() {
    // 冷启动直接进待办页时先补齐成员信息，否则内部 tab 会漏
    await ensureMember()
    this.buildTabs()
    this.load()
  },

  /** 内部 tab 只对部长与主席出现，小干看不到入口。 */
  buildTabs() {
    const member = getApp().globalData.member
    const isStaff = !!member && member.role !== ROLE.MEMBER
    const tabs = [
      { key: 'mine', label: '我的' },
      { key: 'dept', label: '部门' }
    ]
    if (isStaff) tabs.push({ key: 'staff', label: '内部' })
    tabs.push({ key: 'done', label: '已完成' })

    const tab = tabs.some((item) => item.key === this.data.tab) ? this.data.tab : 'mine'
    this.setData({ tabs, isStaff, tab })
  },

  onTab(e) {
    const tab = e.currentTarget.dataset.key
    this.setData({ tab, emptyText: EMPTY_TEXT[tab] || '暂无待办' }, () => this.load())
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
        dueLabel: dueText(item.dueAt),
        joinText: joinText(item.participantCount),
        audienceLabel: AUDIENCE_LABEL[item.audience] || '',
        deptLabel: DEPT_LABEL[item.dept] || ''
      }))
      this.setData({ list })
    } catch (err) {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  onAdd() {
    if (!this.data.isStaff) {
      wx.showToast({ title: '仅部长或主席可创建待办', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/todo/edit/index' })
  },

  onOpen(e) {
    wx.navigateTo({ url: `/pages/todo/detail/index?id=${e.currentTarget.dataset.id}` })
  },

  /** 列表里直接勾完成，只在我的 / 已完成两个 tab 出现。 */
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
