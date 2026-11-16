const { call } = require('../../../services/api')

const PRIORITIES = [
  { value: 3, label: '高' },
  { value: 2, label: '中' },
  { value: 1, label: '低' }
]

Page({
  data: {
    id: '',
    form: {
      title: '',
      description: ''
    },
    scope: 'personal',
    priority: 2,
    priorities: PRIORITIES,
    dueDate: '',
    submitting: false
  },

  onLoad(options) {
    const id = options.id || ''
    this.setData({ id })
    if (id) this.load(id)
  },

  async load(id) {
    try {
      const res = await call('todo.detail', { id })
      const todo = res.todo
      const due = todo.dueAt ? new Date(todo.dueAt) : null
      this.setData({
        form: { title: todo.title, description: todo.description || '' },
        scope: todo.scope,
        priority: todo.priority,
        dueDate: due
          ? `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`
          : ''
      })
    } catch (err) {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  onScope(e) {
    this.setData({ scope: e.currentTarget.dataset.scope })
  },

  onPriority(e) {
    this.setData({ priority: Number(e.currentTarget.dataset.value) })
  },

  onDue(e) {
    this.setData({ dueDate: e.detail.value })
  },

  async onSubmit() {
    if (this.data.submitting) return
    const { id, form, scope, priority, dueDate } = this.data
    if (!form.title.trim()) {
      wx.showToast({ title: '请填写标题', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    try {
      await call('todo.save', {
        id,
        title: form.title,
        description: form.description,
        scope,
        priority,
        dueAt: dueDate ? `${dueDate}T18:00:00+08:00` : ''
      })
      wx.showToast({ title: '已保存', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 500)
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },

  onDelete() {
    wx.showModal({
      title: '删除待办',
      content: '删除后将不再显示，确定吗？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await call('todo.remove', { id: this.data.id })
          wx.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 500)
        } catch (err) {
          wx.showToast({ title: err.message || '删除失败', icon: 'none' })
        }
      }
    })
  }
})
