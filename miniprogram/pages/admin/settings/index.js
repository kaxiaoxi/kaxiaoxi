const { call } = require('../../../services/api')
const { DEPT_LABEL } = require('../../../utils/constants')

const DEPTS = [
  { value: 'photo', label: '摄影师队' },
  { value: 'pr', label: '宣传部' },
  { value: 'ops', label: '运营部' }
]

Page({
  data: {
    year: '',
    nextYear: '',
    depts: DEPTS,
    deptIndex: 0,
    ministers: [],
    youngMembers: [],
    chairmanCount: 0,
    ministerCount: 0,
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
      const list = (memberRes.list || []).map((item) => ({
        ...item,
        deptLabel: DEPT_LABEL[item.dept] || '未分配'
      }))

      this.setData({
        year: settings.academicYear,
        nextYear: `${Number(start) + 1}-${Number(start) + 2}`,
        ministers: list
          .filter((item) => item.role === 'minister')
          .map((item) => ({ ...item, checked: false })),
        youngMembers: list
          .filter((item) => item.role === 'member')
          .map((item) => ({ ...item, checked: false })),
        chairmanCount: 0,
        ministerCount: 0,
        loading: false
      })
    } catch (err) {
      this.setData({ loading: false })
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }
  },

  onNextYear(e) {
    this.setData({ nextYear: e.detail.value })
  },

  onDept(e) {
    this.setData({ deptIndex: Number(e.detail.value) })
  },

  onToggleChairman(e) {
    const id = e.currentTarget.dataset.id
    const ministers = this.data.ministers.map((item) =>
      item._id === id ? { ...item, checked: !item.checked } : item
    )
    this.setData({ ministers, chairmanCount: ministers.filter((item) => item.checked).length })
  },

  onToggleMinister(e) {
    const id = e.currentTarget.dataset.id
    const youngMembers = this.data.youngMembers.map((item) =>
      item._id === id ? { ...item, checked: !item.checked } : item
    )
    this.setData({
      youngMembers,
      ministerCount: youngMembers.filter((item) => item.checked).length
    })
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

  onAppointChairmen() {
    const targets = this.data.ministers.filter((item) => item.checked)
    if (!targets.length) {
      wx.showToast({ title: '请先选择部长', icon: 'none' })
      return
    }
    const names = targets.map((item) => item.name).join('、')
    wx.showModal({
      title: '任命新主席',
      content: `确认任命 ${names} 为影协主席？`,
      success: async (res) => {
        if (!res.confirm) return
        let success = 0
        for (const item of targets) {
          try {
            await call('admin.appointChairman', { studentNo: item.studentNo })
            success += 1
          } catch (err) {
            // 单个失败不影响其他
          }
        }
        wx.showToast({ title: `已任命 ${success} 人`, icon: 'none' })
        this.load()
      }
    })
  },

  onAppointMinisters() {
    const { youngMembers, depts, deptIndex } = this.data
    const targets = youngMembers.filter((item) => item.checked)
    if (!targets.length) {
      wx.showToast({ title: '请先选择小干', icon: 'none' })
      return
    }
    const dept = depts[deptIndex]
    const names = targets.map((item) => item.name).join('、')
    wx.showModal({
      title: '任命新部长',
      content: `确认任命 ${names} 为${dept.label}部长？`,
      success: async (res) => {
        if (!res.confirm) return
        let success = 0
        for (const item of targets) {
          try {
            await call('admin.appointMinister', { studentNo: item.studentNo, dept: dept.value })
            success += 1
          } catch (err) {
            // 单个失败不影响其他
          }
        }
        wx.showToast({ title: `已任命 ${success} 人`, icon: 'none' })
        this.load()
      }
    })
  }
})
