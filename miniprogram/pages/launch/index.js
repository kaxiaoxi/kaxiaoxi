const { call } = require('../../services/api')

Page({
  data: {
    error: false,
    showConsent: false,
    refused: false,
    contractName: '隐私保护指引'
  },

  onLoad() {
    this.checkConsent()
  },

  checkConsent() {
    if (wx.getPrivacySetting) {
      wx.getPrivacySetting({
        success: (res) => {
          if (res.privacyContractName) {
            this.setData({ contractName: res.privacyContractName })
          }
        }
      })
    }

    if (wx.getStorageSync('loginConsent')) {
      this.bootstrap()
      return
    }
    this.setData({ showConsent: true })
  },

  onOpenContract() {
    if (wx.openPrivacyContract) {
      wx.openPrivacyContract({
        fail: () => {
          wx.showToast({ title: '请在小程序后台配置隐私保护指引', icon: 'none' })
        }
      })
    } else {
      wx.showToast({ title: '当前版本不支持查看', icon: 'none' })
    }
  },

  async onAgree() {
    if (this.agreeing) return
    this.agreeing = true

    try {
      await this.authorizePrivacy()
      wx.setStorageSync('loginConsent', true)
      this.setData({ showConsent: false, refused: false })
      await this.wxLogin()
      this.bootstrap()
    } catch (err) {
      wx.showToast({ title: '需要同意后才能使用', icon: 'none' })
    } finally {
      this.agreeing = false
    }
  },

  onDisagree() {
    this.setData({ refused: true })
    wx.showToast({ title: '不同意将无法使用', icon: 'none' })
  },

  /**
   * 触发微信官方隐私弹窗；未配置隐私指引时降级为本站弹窗授权。
   */
  authorizePrivacy() {
    return new Promise((resolve) => {
      if (!wx.requirePrivacyAuthorize) {
        resolve()
        return
      }
      wx.requirePrivacyAuthorize({
        success: () => resolve(),
        fail: () => resolve()
      })
    })
  },

  /**
   * 微信登录：建立会话，openid 由云函数从上下文获取。
   */
  wxLogin() {
    return new Promise((resolve) => {
      wx.login({
        success: () => resolve(),
        fail: () => resolve()
      })
    })
  },

  /**
   * 启动分流：
   * active -> 首页；new -> 注册；pending/rejected/left -> 等待页
   */
  async bootstrap() {
    try {
      const res = await call('auth.login')
      getApp().globalData.member = res.member || null

      if (res.state === 'active') {
        wx.reLaunch({ url: '/pages/home/index' })
        return
      }
      if (res.state === 'new') {
        wx.redirectTo({ url: '/pages/join/register/index' })
        return
      }
      wx.redirectTo({ url: '/pages/join/pending/index' })
    } catch (err) {
      console.error('[launch] 登录失败', err)
      this.setData({ error: true })
    }
  },

  onRetry() {
    this.setData({ error: false })
    this.bootstrap()
  }
})
