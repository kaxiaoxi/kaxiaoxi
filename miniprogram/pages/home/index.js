const { call } = require('../../services/api')
const { DEPT_LABEL, ROLE_LABEL } = require('../../utils/constants')
const { formatRange } = require('../../utils/task')

Page({
  data: {
    member: null,
    deptLabel: '',
    roleLabel: '',
    tasks: [],
    todos: []
  },

  onShow() {
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
    try {
      const res = await call('task.list', { scope: 'all', status: 'recruiting' })
      const tasks = (res.list || []).slice(0, 3).map((task) => ({
        ...task,
        dateText: formatRange(task)
      }))
      this.setData({ tasks })
    } catch (err) {
      console.warn('[home] 加载失败', err)
    }
  }
})
