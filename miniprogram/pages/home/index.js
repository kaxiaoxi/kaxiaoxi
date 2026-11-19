const { call } = require('../../services/api')
const { DEPT_LABEL, ROLE_LABEL } = require('../../utils/constants')
const { formatRange, formatDay, formatTime } = require('../../utils/task')
const { dueText } = require('../../utils/todo')
const { syncTabBar } = require('../../utils/tabbar')

Page({
  data: {
    member: null,
    deptLabel: '',
    roleLabel: '',
    tasks: [],
    todos: [],
    unreadMessages: [],
    activeMessage: null,
    showMessage: false,
    isLoading: false,
    loadError: false,
    tabPageEnter: false
  },

  onShow() {
    syncTabBar(this, 0, 'home')
    const member = getApp().globalData.member
    if (!member) {
      this.restore()
      return
    }
    this.setData({
      member,
      deptLabel: member ? DEPT_LABEL[member.dept] || '' : '',
      roleLabel: member ? ROLE_LABEL[member.role] || '' : ''
    })
    this.load()
  },

  async restore() {
    try {
      const res = await call('auth.login')
      getApp().globalData.member = res.member || null
      if (res.state === 'active') {
        this.onShow()
        return
      }
      wx.reLaunch({ url: '/pages/launch/index' })
    } catch (err) {
      console.warn('[home] 恢复登录态失败', err)
    }
  },

  async load() {
    if (this.data.isLoading) return
    this.setData({ isLoading: true, loadError: false })
    try {
      const [taskRes, todoRes, msgRes] = await Promise.all([
        call('task.list', { scope: 'all', status: 'recruiting' }),
        call('todo.list', { scope: 'mine' }),
        call('message.list', { read: false })
      ])
      const tasks = (taskRes.list || []).slice(0, 3).map((task) => ({
        ...task,
        dateText: formatRange(task)
      }))
      const todos = (todoRes.list || []).slice(0, 3).map((item) => ({
        ...item,
        dueText: dueText(item.dueAt)
      }))
      const unreadMessages = (msgRes.list || []).map((item) => ({
        ...item,
        timeText: `${formatDay(item.createdAt)} ${formatTime(item.createdAt)}`
      }))
      this.setData({ tasks, todos, unreadMessages })
    } catch (err) {
      console.warn('[home] 加载失败', err)
      this.setData({ loadError: true })
    } finally {
      this.setData({ isLoading: false })
    }
  },

  onRetry() {
    this.load()
  },

  onOpenTask(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/task/detail/index?id=${id}` })
  },

  onOpenTaskList() {
    wx.switchTab({ url: '/pages/task/list' })
  },

  onOpenTodoList() {
    wx.navigateTo({ url: '/pages/todo/list/index' })
  },

  onOpenMessageList() {
    wx.navigateTo({ url: '/pages/message/list/index' })
  },

  async onOpenMessage(e) {
    const id = e.currentTarget.dataset.id
    const message = this.data.unreadMessages.find((item) => item._id === id)
    if (!message) return

    this.setData({ activeMessage: message, showMessage: true })
    try {
      await call('message.read', { id })
      this.load()
    } catch (err) {
      console.warn('[home] 标记已读失败', err)
    }
  },

  onCloseMessage() {
    this.setData({ showMessage: false, activeMessage: null })
  }
})
