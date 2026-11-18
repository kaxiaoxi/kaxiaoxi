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
    ministerNo: '',
    depts: DEPTS,
    deptIndex: 0,
    chairmanList: [],
    selectedId: '',
    selectedName: '',
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
      const chairmanList = (memberRes.list || [])
        .filter((item) => item.role !== 'chairman')
        .map((item) => ({
          ...item,
          deptLabel: DEPT_LABEL[item.dept] || '未分配'
        }))

      this.setData({
        year: settings.academicYear,
        nextYear: `${Number(start) + 1}-${Number(start) + 2}`,
        chairmanList,
        selectedId: '',
        selectedName: '',
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

  onMinisterNo(e) {
    this.setData({ ministerNo: e.detail.value })
  },

  onDept(e) {
    this.setData({ deptIndex: Number(e.detail.value) })
  },

  onSelectChairman(e) {
    const id = e.currentTarget.dataset.id
    const target = this.data.chairmanList.find((item) => item._id === id)
    if (!target) return
    const same = this.data.selectedId === id
    this.setData({
      selectedId: same ? '' : id,
      selectedName: same ? '' : target.name
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

  onAppointChairman() {
    const { chairmanList, selectedId } = this.data
    const target = chairmanList.find((item) => item._id === selectedId)
    if (!target) {
      wx.showToast({ title: '请先选择成员', icon: 'none' })
      return
    }
    wx.showModal({
      title: '任命新主席',
      content: `确认任命 ${target.name} 为影协主席？对方将获得全部管理权限。`,
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
    const { ministerNo, depts, deptIndex } = this.data
    if (!/^\d{10}$/.test(ministerNo)) {
      wx.showToast({ title: '请填写 10 位学号', icon: 'none' })
      return
    }
    const dept = depts[deptIndex]
    wx.showModal({
      title: '任命新部长',
      content: `确认任命学号 ${ministerNo} 为${dept.label}部长？`,
      success: async (res) => {
        if (!res.confirm) return
        try {
          const result = await call('admin.appointMinister', {
            studentNo: ministerNo,
            dept: dept.value
          })
          wx.showToast({ title: `已任命 ${result.name}`, icon: 'success' })
          this.setData({ ministerNo: '' })
        } catch (err) {
          wx.showToast({ title: err.message || '任命失败', icon: 'none' })
        }
      }
    })
  }
})
