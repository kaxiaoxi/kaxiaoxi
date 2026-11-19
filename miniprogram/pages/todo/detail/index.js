const { call } = require('../../../services/api')
const {
  PRIORITY_LABEL,
  PRIORITY_CLASS,
  AUDIENCE_LABEL,
  AUDIENCE_DESC,
  dueText
} = require('../../../utils/todo')
const { DEPT_LABEL } = require('../../../utils/constants')
const { loadTemplates, requestSubscribe } = require('../../../utils/remind')

Page({
  data: {
    todo: null,
    participants: [],
    joined: false,
    can: {},
    loading: true
  },

  onLoad(options) {
    this.todoId = options.id || ''
    loadTemplates().then(() => this.load())
  },

  onShow() {
    if (this.todoId && this.data.todo) this.load()
  },

  async load() {
    try {
      const res = await call('todo.detail', { id: this.todoId })
      const todo = res.todo
      this.setData({
        todo: {
          ...todo,
          priorityLabel: PRIORITY_LABEL[todo.priority] || '中',
          priorityClass: PRIORITY_CLASS[todo.priority] || 'prio--mid',
          dueLabel: dueText(todo.dueAt),
          audienceLabel: AUDIENCE_LABEL[todo.audience] || '',
          audienceDesc: AUDIENCE_DESC[todo.audience] || '',
          deptLabel: DEPT_LABEL[todo.dept] || ''
        },
        participants: res.participants || [],
        joined: !!res.joined,
        can: res.can || {},
        loading: false
      })
    } catch (err) {
      this.setData({ loading: false })
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }
  },

  onJoin() {
    // 授权必须同步发起，保持 tap 上下文
    requestSubscribe('todo', async () => {
      try {
        await call('todo.join', { id: this.todoId })
        wx.showToast({ title: '已加入', icon: 'success' })
        this.load()
        // 加入成功后再登记截止提醒（没授权过也不会报错，走站内信兜底）
        call('reminder.createTodo', { todoId: this.todoId }).catch((err) => {
          console.warn('[todo] 登记提醒失败', err)
        })
      } catch (err) {
        wx.showToast({ title: err.message || '加入失败', icon: 'none' })
      }
    })
  },

  async onQuit() {
    try {
      await call('todo.quit', { id: this.todoId })
      wx.showToast({ title: '已退出', icon: 'success' })
      this.load()
    } catch (err) {
      wx.showToast({ title: err.message || '退出失败', icon: 'none' })
    }
  },

  onComplete() {
    const done = !this.data.todo.done
    wx.showModal({
      title: done ? '标记完成' : '取消完成',
      content: done ? '确认这条待办已经做完？' : '把它放回未完成？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await call('todo.complete', { id: this.todoId, done })
          this.load()
        } catch (err) {
          wx.showToast({ title: err.message || '操作失败', icon: 'none' })
        }
      }
    })
  },

  onEdit() {
    wx.navigateTo({ url: `/pages/todo/edit/index?id=${this.todoId}` })
  },

  onRemove() {
    wx.showModal({
      title: '删除待办',
      content: '删除后将不再显示，确定吗？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await call('todo.remove', { id: this.todoId })
          wx.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 500)
        } catch (err) {
          wx.showToast({ title: err.message || '删除失败', icon: 'none' })
        }
      }
    })
  },

  onOpenTask() {
    const todo = this.data.todo
    if (!todo || !todo.sourceTaskId) return
    wx.navigateTo({ url: `/pages/task/detail/index?id=${todo.sourceTaskId}` })
  },

  onOpenEvent() {
    const todo = this.data.todo
    if (!todo || !todo.sourceEventId) return
    wx.navigateTo({ url: `/pages/calendar/detail/index?id=${todo.sourceEventId}` })
  }
})
