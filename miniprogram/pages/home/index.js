const { call } = require('../../services/api')
const { DEPT_LABEL, ROLE_LABEL, ROLE } = require('../../utils/constants')
const { formatRange, formatDay, formatTime } = require('../../utils/task')
const { dueText } = require('../../utils/todo')
const { syncTabBar } = require('../../utils/tabbar')
const { ensureMember } = require('../../utils/session')
const guest = require('../../utils/guest')

Page({
  data: {
    member: null,
    deptLabel: '',
    roleLabel: '',
    tasks: [],
    todos: [],
    deptTodoCount: 0,
    isStaff: false,
    unreadMessages: [],
    activeMessage: null,
    showMessage: false,
    isGuest: false,
    isLoading: false,
    loadError: false,
    tabPageEnter: false
  },

  async onShow() {
    syncTabBar(this, 0, 'home')
    const member = await ensureMember()
    if (!member) {
      this.restore()
      return
    }

    if (getApp().globalData.isGuest) {
      this.setData({
        member,
        isGuest: true,
        deptLabel: '访客模式',
        roleLabel: '',
        isStaff: false,
        tasks: [],
        todos: [],
        unreadMessages: [],
        isLoading: false,
        loadError: false
      })
      return
    }

    this.setData({
      member,
      isGuest: false,
      deptLabel: DEPT_LABEL[member.dept] || '',
      roleLabel: ROLE_LABEL[member.role] || '',
      isStaff: member.role !== ROLE.MEMBER
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
      const reqs = [
        call('task.list', { scope: 'all', status: 'recruiting' }),
        call('todo.list', { scope: 'mine' }),
        call('message.list', { read: false })
      ]
      // 部长与主席多取一次「可加入的本部门待办」，用于首页入口
      if (this.data.isStaff) reqs.push(call('todo.list', { scope: 'dept' }))

      const [taskRes, todoRes, msgRes, deptRes] = await Promise.all(reqs)

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
      this.setData({
        tasks,
        todos,
        unreadMessages,
        deptTodoCount: deptRes ? (deptRes.list || []).length : 0
      })
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

  blockGuest() {
    if (!this.data.isGuest) return false
    wx.showToast({ title: '访客模式不可用，注册成员后使用', icon: 'none' })
    return true
  },

  onExitGuest() {
    guest.exit()
    wx.reLaunch({ url: '/pages/launch/index' })
  },

  onOpenTask(e) {
    if (this.blockGuest()) return
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/task/detail/index?id=${id}` })
  },

  onOpenTaskList() {
    if (this.blockGuest()) return
    wx.switchTab({ url: '/pages/task/list' })
  },

  onOpenTodoList() {
    if (this.blockGuest()) return
    wx.navigateTo({ url: '/pages/todo/list/index' })
  },

  onOpenTodo(e) {
    if (this.blockGuest()) return
    wx.navigateTo({ url: `/pages/todo/detail/index?id=${e.currentTarget.dataset.id}` })
  },

  onOpenDeptTodo() {
    if (this.blockGuest()) return
    wx.navigateTo({ url: '/pages/todo/list/index?tab=dept' })
  },

  onOpenMessageList() {
    if (this.blockGuest()) return
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
