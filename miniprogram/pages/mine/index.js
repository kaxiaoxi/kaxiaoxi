Page({
  data: {
    member: null
  },

  onShow() {
    this.setData({ member: getApp().globalData.member })
  }
})
