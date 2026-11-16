const { DEPT_LABEL, ROLE_LABEL, MEMBER_STATUS_LABEL } = require('../../utils/constants')

Page({
  data: {
    member: null,
    deptLabel: '',
    roleLabel: '',
    statusLabel: ''
  },

  onShow() {
    const member = getApp().globalData.member
    this.setData({
      member,
      deptLabel: member ? DEPT_LABEL[member.dept] || '' : '',
      roleLabel: member ? ROLE_LABEL[member.role] || '' : '',
      statusLabel: member ? MEMBER_STATUS_LABEL[member.status] || '' : ''
    })
  }
})
