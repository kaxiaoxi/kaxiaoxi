let lastTabRoute = ''

function syncTabBar(page, selected, route) {
  if (!page || typeof page.getTabBar !== 'function') return
  const tabBar = page.getTabBar()
  const app = getApp()
  if (tabBar) {
    const prev = app.globalData.tabIndex
    if (typeof prev === 'number' && prev !== selected) {
      tabBar.setData({ selected: prev, animate: false })
      wx.nextTick(() => tabBar.setData({ selected, animate: true }))
    } else {
      tabBar.setData({ selected, animate: false })
    }
  }
  app.globalData.tabIndex = selected

  if (!route || route === lastTabRoute) return
  lastTabRoute = route
  page.setData({ tabPageEnter: false }, () => {
    wx.nextTick(() => page.setData({ tabPageEnter: true }))
  })
}

module.exports = {
  syncTabBar
}
