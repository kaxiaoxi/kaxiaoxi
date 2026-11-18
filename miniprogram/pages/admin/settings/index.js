const { call } = require('../../../services/api')
const { DEPT_LABEL } = require('../../../utils/constants')

const DEPT_KEYS = ['photo', 'pr', 'ops', 'none']
const DEPT_NAMES = {
  photo: '摄影师队',
  pr: '宣传部',
  ops: '运营部',
  none: '未分配'
}

function groupBy(list) {
  const map = { photo: [], pr: [], ops: [], none: [] }
  list.forEach((item) => {
    const key = ['photo', 'pr', 'ops'].includes(item.dept) ? item.dept : 'none'
    map[key].push(item)
  })
  return map
}

function deptLabelOf(key) {
  return DEPT_NAMES[key] || DEPT_LABEL[key] || '未分配'
}

Page({
  data: {
    year: '',
    nextYear: '',
    deptLabels: DEPT_KEYS.map(deptLabelOf),
    chairmanRange: [[], []],
    chairmanValue: [0, 0],
    chairmanText: '',
    ministerRange: [[], []],
    ministerValue: [0, 0],
    ministerText: '',
    loading: true
  },

  onShow() {
    this.load()
  },

  async load() {
    try {
      const [settings, memberRes] = await Promise.all([
        call('admin.getSettings', {}),
        call('member.list', { status: 'active' })
      ])
      const [start] = settings.academicYear.split('-')
      const list = memberRes.list || []

      this.chairmanGroups = groupBy(list.filter((item) => item.role === 'minister'))
      this.ministerGroups = groupBy(list.filter((item) => item.role === 'member'))

      const chairmanText = this.buildText(this.chairmanGroups, 0, 0)
      const ministerText = this.buildText(this.ministerGroups, 0, 0)

      this.setData({
        year: settings.academicYear,
        nextYear: `${Number(start) + 1}-${Number(start) + 2}`,
        chairmanRange: [this.data.deptLabels, this.namesOf(this.chairmanGroups, 0)],
        chairmanText,
        ministerRange: [this.data.deptLabels, this.namesOf(this.ministerGroups, 0)],
        ministerText,
        loading: false
      })
    } catch (err) {
      this.setData({ loading: false })
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }
  },

  namesOf(groups, deptIndex) {
    const key = DEPT_KEYS[deptIndex]
    const items = groups[key] || []
    return items.length ? items.map((item) => item.name) : ['暂无成员']
  },

  buildText(groups, deptIndex, memberIndex) {
    const key = DEPT_KEYS[deptIndex]
    const items = groups[key] || []
    if (!items.length) return '暂无可选成员'
    const member = items[Math.min(memberIndex, items.length - 1)]
    return `${deptLabelOf(key)} / ${member.name}`
  },

  onChairmanColumn(e) {
    const column = e.detail.column
    const value = e.detail.value
    if (column !== 0) return
    const names = this.namesOf(this.chairmanGroups, value)
    this.setData({
      chairmanRange: [this.data.deptLabels, names],
      chairmanValue: [value, 0],
      chairmanText: this.buildText(this.chairmanGroups, value, 0)
    })
  },

  onChairmanChange(e) {
    const [deptIndex, memberIndex] = e.detail.value
    this.setData({
      chairmanValue: [deptIndex, memberIndex],
      chairmanText: this.buildText(this.chairmanGroups, deptIndex, memberIndex)
    })
  },

  onMinisterColumn(e) {
    const column = e.detail.column
    const value = e.detail.value
    if (column !== 0) return
    const names = this.namesOf(this.ministerGroups, value)
    this.setData({
      ministerRange: [this.data.deptLabels, names],
      ministerValue: [value, 0],
      ministerText: this.buildText(this.ministerGroups, value, 0)
    })
  },

  onMinisterChange(e) {
    const [deptIndex, memberIndex] = e.detail.value
    this.setData({
      ministerValue: [deptIndex, memberIndex],
      ministerText: this.buildText(this.ministerGroups, deptIndex, memberIndex)
    })
  },

  currentChairman() {
    const [deptIndex, memberIndex] = this.data.chairmanValue
    const key = DEPT_KEYS[deptIndex]
    const items = this.chairmanGroups[key] || []
    return items[memberIndex] || null
  },

  currentMinister() {
    const [deptIndex, memberIndex] = this.data.ministerValue
    const key = DEPT_KEYS[deptIndex]
    const items = this.ministerGroups[key] || []
    return { member: items[memberIndex] || null, dept: key }
  },

  onNextYear(e) {
    this.setData({ nextYear: e.detail.value })
  },

  onArchive() {
    wx.showModal({
      title: '开启新学年',
      content: `确认把当前学年切换为 ${this.data.nextYear}？毕业成员请先在成员管理中归档。`,
      success: async (res) => {
        if (!res.confirm) return
        try {
          await call('admin.archiveYear', { year: this.data.nextYear })
          wx.showToast({ title: '已切换', icon: 'success' })
          this.load()
        } catch (err) {
          wx.showToast({ title: err.message || '操作失败', icon: 'none' })
        }
      }
    })
  },

  onAppointChairman() {
    const target = this.currentChairman()
    if (!target) {
      wx.showToast({ title: '请选择部长', icon: 'none' })
      return
    }
    wx.showModal({
      title: '任命新主席',
      content: `确认任命 ${target.name} 为影协主席？`,
      success: async (res) => {
        if (!res.confirm) return
        try {
          const result = await call('admin.appointChairman', { studentNo: target.studentNo })
          wx.showToast({ title: `已任命 ${result.name}`, icon: 'success' })
          this.load()
        } catch (err) {
          wx.showToast({ title: err.message || '任命失败', icon: 'none' })
        }
      }
    })
  },

  onAppointMinister() {
    const { member, dept } = this.currentMinister()
    if (!member) {
      wx.showToast({ title: '请选择小干', icon: 'none' })
      return
    }
    wx.showModal({
      title: '任命新部长',
      content: `确认任命 ${member.name} 为${deptLabelOf(dept)}部长？`,
      success: async (res) => {
        if (!res.confirm) return
        try {
          const result = await call('admin.appointMinister', {
            studentNo: member.studentNo,
            dept
          })
          wx.showToast({ title: `已任命 ${result.name}`, icon: 'success' })
          this.load()
        } catch (err) {
          wx.showToast({ title: err.message || '任命失败', icon: 'none' })
        }
      }
    })
  }
})
