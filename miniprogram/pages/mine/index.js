const { call } = require('../../services/api')
const { resolve, urlOf } = require('../../utils/avatar')
const { DEPT_LABEL, ROLE_LABEL, MEMBER_STATUS_LABEL } = require('../../utils/constants')
const { syncTabBar } = require('../../utils/tabbar')

Page({
  data: {
    member: null,
    deptLabel: '',
    roleLabel: '',
    statusLabel: '',
    isChairman: false,
    isMinister: false,
    isLoading: false,
    loadError: false,
    tabPageEnter: false
  },

  async onShow() {
    syncTabBar(this, 3, 'mine')
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

  onEditProfile() {
    wx.navigateTo({ url: '/pages/profile/edit/index' })
  },

  onOpenAbout() {
    wx.navigateTo({ url: '/pages/about/index' })
  },

  async compressAvatar(path) {
    if (!wx.compressImage) return path
    try {
      const res = await wx.compressImage({
        src: path,
        quality: 60,
        compressedWidth: 300,
        compressedHeight: 300
      })
      return res.tempFilePath || path
    } catch (err) {
      console.warn('[mine] 头像压缩失败，使用原图', err)
      return path
    }
  },

  async onChooseAvatar(e) {
    const tempUrl = e.detail && e.detail.avatarUrl
    const member = this.data.member
    if (!tempUrl || !member || !member._id) return

    wx.showLoading({ title: '上传中', mask: true })
    try {
      const filePath = await this.compressAvatar(tempUrl)
      const ext = (filePath.match(/\.(\w+)$/) || [])[1] || 'jpg'
      const upload = await wx.cloud.uploadFile({
        cloudPath: `avatars/${member._id}-${Date.now()}.${ext}`,
        filePath
      })
      const res = await call('profile.updateAvatar', { fileID: upload.fileID })
      await resolve([res.avatarFileID])
      const updated = {
        ...member,
        avatarFileID: res.avatarFileID,
        avatarUrl: urlOf(res.avatarFileID)
      }
      this.setData({ member: updated })
      getApp().globalData.member = updated
      wx.hideLoading()
      wx.showToast({ title: '头像已更新', icon: 'success' })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: err.message || '上传失败', icon: 'none' })
    }
  },

  onOpenMembers() {
    wx.navigateTo({ url: '/pages/admin/members/index' })
  }
})
