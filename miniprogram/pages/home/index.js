const { call } = require('../../services/api')

Page({
  data: {
    tasks: [],
    todos: []
  },

  onShow() {
    this.load()
  },

  async load() {
    try {
      const res = await call('home.summary')
      this.setData({
        tasks: res.tasks || [],
        todos: res.todos || []
      })
    } catch (err) {
      console.warn('[home] 加载失败', err)
    }
  }
})
