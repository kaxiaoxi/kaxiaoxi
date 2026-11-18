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
    chairmanDept: 0,
    chairmanCandidates: [],
    chairmanCount: 0,
    ministerDept: 0,
    ministerCandidates: [],
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
      const list = memberRes.list || []

      this.chairmanGroups = groupBy(list.filter((item) => item.role === 'minister'))
      this.ministerGroups = groupBy(list.filter((item) => item.role === 'member'))
      this.chairmanSelected = []
      this.ministerSelected = []

      this.setData({
        year: settings.academicYear,
        nextYear: `${Number(start) + 1}-${Number(start) + 2}`,
        chairmanDept: 0,
        ministerDept: 0,
        chairmanCandidates: this.candidatesOf(this.chairmanGroups, 0, this.chairmanSelected),
        ministerCandidates: this.candidatesOf(this.ministerGroups, 0, this.ministerSelected),
        chairmanCount: 0,
        ministerCount: 0,
        loading: false
      })
    } catch (err) {
      this.setData({ loading: false })
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }
  },

  candidatesOf(groups, deptIndex, selected) {
    const key = DEPT_KEYS[deptIndex]
    return (groups[key] || []).map((item) => ({
      ...item,
      checked: selected.includes(item._id)
    }))
  },

  onChairmanDept(e) {
    const index = Number(e.currentTarget.dataset.index)
    this.setData({
      chairmanDept: index,
      chairmanCandidates: this.candidatesOf(this.chairmanGroups, index, this.chairmanSelected)
    })
  },

  onMinisterDept(e) {
    const index = Number(e.currentTarget.dataset.index)
    this.ministerSelected = []
    this.setData({
      ministerDept: index,
      ministerCandidates: this.candidatesOf(this.ministerGroups, index, this.ministerSelected),
      ministerCount: 0
    })
  },

  onToggleChairman(e) {
    const id = e.currentTarget.dataset.id
    this.chairmanSelected = this.chairmanSelected.includes(id)
      ? this.chairmanSelected.filter((item) => item !== id)
      : [...this.chairmanSelected, id]
    this.setData({
      chairmanCandidates: this.candidatesOf(
        this.chairmanGroups,
        this.data.chairmanDept,
        this.chairmanSelected
      ),
      chairmanCount: this.chairmanSelected.length
    })
  },

  onToggleMinister(e) {
    const id = e.currentTarget.dataset.id
    this.ministerSelected = this.ministerSelected.includes(id)
      ? this.ministerSelected.filter((item) => item !== id)
      : [...this.ministerSelected, id]
    this.setData({
      ministerCandidates: this.candidatesOf(
        this.ministerGroups,
        this.data.ministerDept,
        this.ministerSelected
      ),
      ministerCount: this.ministerSelected.length
    })
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

  selectedMembers(groups, ids) {
    const all = DEPT_KEYS.reduce((acc, key) => acc.concat(groups[key] || []), [])
    return all.filter((item) => ids.includes(item._id))
  },

  onAppointChairmen() {
    const targets = this.selectedMembers(this.chairmanGroups, this.chairmanSelected)
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
    const targets = this.selectedMembers(this.ministerGroups, this.ministerSelected)
    if (!targets.length) {
      wx.showToast({ title: '请先选择小干', icon: 'none' })
      return
    }
    const dept = DEPT_KEYS[this.data.ministerDept]
    const names = targets.map((item) => item.name).join('、')
    wx.showModal({
      title: '任命新部长',
      content: `确认任命 ${names} 为${deptLabelOf(dept)}部长？`,
      success: async (res) => {
        if (!res.confirm) return
        let success = 0
        for (const item of targets) {
          try {
            await call('admin.appointMinister', { studentNo: item.studentNo, dept })
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
