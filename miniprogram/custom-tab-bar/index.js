Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: '/pages/home/index',
        text: '首页',
        iconPath: '/images/tab/home.png',
        selectedIconPath: '/images/tab/home-active.png'
      },
      {
        pagePath: '/pages/task/list',
        text: '任务',
        iconPath: '/images/tab/task.png',
        selectedIconPath: '/images/tab/task-active.png'
      },
      {
        pagePath: '/pages/calendar/month',
        text: '年历',
        iconPath: '/images/tab/calendar.png',
        selectedIconPath: '/images/tab/calendar-active.png'
      },
      {
        pagePath: '/pages/mine/index',
        text: '我的',
        iconPath: '/images/tab/mine.png',
        selectedIconPath: '/images/tab/mine-active.png'
      }
    ]
  },

  methods: {
    onSwitchTab(e) {
      const index = Number(e.currentTarget.dataset.index)
      const { path } = e.currentTarget.dataset
      if (index === this.data.selected) return
      wx.switchTab({ url: path })
    }
  }
})
