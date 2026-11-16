const { call } = require('../../services/api')
const { DEPT_LABEL, ROLE_LABEL, MEMBER_STATUS_LABEL } = require('../../utils/constants')

Page({
  data: {
    member: null,
    deptLabel: '',
    roleLabel: '',
    statusLabel: '',
    isChairman: false
  },

  async onShow() {
    let member = getApp().globalData.member
    try {
      const res = await call('auth.login')
      if (res.member) {
        member = res.member
        getApp().globalData.member = member
      }
    } catch (err) {
      console.warn('[mine] 刷新资料失败', err)
    }

    this.setData({
      member,
      deptLabel: member ? DEPT_LABEL[member.dept] || '' : '',
      roleLabel: member ? ROLE_LABEL[member.role] || '' : '',
      statusLabel: member ? MEMBER_STATUS_LABEL[member.status] || '' : '',
      isChairman: !!(member && member.role === 'chairman')
    })
  },

  onOpenTodos() {
    wx.navigateTo({ url: '/pages/todo/list/index' })
  },

  onEditProfile() {
    wx.navigateTo({ url: '/pages/profile/edit/index' })
  },

  onOpenMembers() {
    wx.navigateTo({ url: '/pages/admin/members/index' })
  }
})
