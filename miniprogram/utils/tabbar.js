let lastTabRoute = ''

function syncTabBar(page, selected, route) {
  if (!page || typeof page.getTabBar !== 'function') return
  const tabBar = page.getTabBar()
  if (tabBar) tabBar.setData({ selected })

  if (!route || route === lastTabRoute) return
  lastTabRoute = route
  page.setData({ tabPageEnter: false }, () => {
    wx.nextTick(() => page.setData({ tabPageEnter: true }))
  })
}

module.exports = {
  syncTabBar
}
