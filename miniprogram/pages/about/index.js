Page({
  data: {
    version: '1.6.0'
  },

  onOpenDoc(e) {
    const type = e.currentTarget.dataset.type
    wx.navigateTo({ url: `/pages/about/doc/index?type=${type}` })
  }
})
