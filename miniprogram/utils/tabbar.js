let lastTabRoute = ''

function syncTabBar(page, selected, route) {
  if (!page || typeof page.getTabBar !== 'function') return
  const tabBar = page.getTabBar()
  const app = getApp()

  if (tabBar) {
    const prev = app.globalData.tabIndex
    if (typeof prev === 'number' && prev !== selected) {
      tabBar.setData({ selected: prev, animate: false })
      setTimeout(() => {
        tabBar.setData({ animate: true })
        setTimeout(() => tabBar.setData({ selected }), 20)
      }, 20)
    } else {
      tabBar.setData({ selected, animate: false })
    }
  }

  app.globalData.tabIndex = selected
  lastTabRoute = route
}

module.exports = {
  syncTabBar
}
