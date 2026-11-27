const { call } = require('../../services/api')
const { resolve, urlOf } = require('../../utils/avatar')
const { DEPT_LABEL, ROLE_LABEL, MEMBER_STATUS_LABEL } = require('../../utils/constants')
const { syncTabBar } = require('../../utils/tabbar')
const guest = require('../../utils/guest')

Page({
  data: {
    member: null,
    deptLabel: '',
    roleLabel: '',
    statusLabel: '',
    isChairman: false,
    isMinister: false,
    isGuest: false,
    isLoading: false,
    loadError: false,
    tabPageEnter: false
  },

  async onShow() {
    syncTabBar(this, 3, 'mine')

    if (getApp().globalData.isGuest) {
      const guestMember = getApp().globalData.member
      this.setData({
        member: guestMember,
        isGuest: true,
        deptLabel: '访客模式',
        roleLabel: '',
        statusLabel: '访客',
        isChairman: false,
        isMinister: false,
        isLoading: false,
        loadError: false
      })
      return
    }

    let member = getApp().globalData.member
    let loadError = false
    this.setData({ isLoading: true, loadError: false })
    try {
      const res = await call('auth.login')
      if (res.member) {
        member = res.member
        getApp().globalData.member = member
      }
    } catch (err) {
      console.warn('[mine] 刷新资料失败', err)
      loadError = true
    }

    if (member && member.avatarFileID) {
      await resolve([member.avatarFileID])
      member = { ...member, avatarUrl: urlOf(member.avatarFileID) }
    }

    this.setData({
      member,
      deptLabel: member ? DEPT_LABEL[member.dept] || '' : '',
      roleLabel: member ? ROLE_LABEL[member.role] || '' : '',
      statusLabel: member ? MEMBER_STATUS_LABEL[member.status] || '' : '',
      isChairman: !!(member && member.role === 'chairman'),
      isMinister: !!(member && member.role !== 'member'),
      isLoading: false,
      loadError
    })
  },

  onRetry() {
    this.onShow()
  },

  onExitGuest() {
    guest.exit()
    wx.reLaunch({ url: '/pages/launch/index' })
  },

  onOpenErke() {
    wx.navigateTo({ url: '/pages/mine/erke/index' })
  },

  onOpenSummary() {
    wx.navigateTo({ url: '/pages/admin/erke/index' })
  },

  onOpenMessages() {
    wx.navigateTo({ url: '/pages/message/list/index' })
  },

  onOpenRemind() {
    wx.navigateTo({ url: '/pages/mine/remind/index' })
  },

  onOpenSettings() {
    wx.navigateTo({ url: '/pages/admin/settings/index' })
  },

  onOpenTodos() {
    wx.navigateTo({ url: '/pages/todo/list/index' })
  },

  onOpenMembers() {
    wx.navigateTo({ url: '/pages/admin/members/index' })
  }
})
