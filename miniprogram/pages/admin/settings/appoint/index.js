const { call } = require('../../../../services/api')
const { DEPT_LABEL } = require('../../../../utils/constants')

const DEPT_KEYS = ['photo', 'pr', 'ops', 'none']
const DEPT_NAMES = {
  photo: '摄影师队',
  pr: '宣传部',
  ops: '运营部',
  none: '未分配'
}

const ROLES = [
  { key: 'chairman', label: '主席' },
  { key: 'minister', label: '部长' }
]

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
    roles: ROLES,
    roleIndex: 0,
    deptLabels: DEPT_KEYS.map(deptLabelOf),
    deptIndex: 0,
    candidates: [],
    count: 0,
    loading: true
  },

  onShow() {
    this.load()
  },

  async load() {
    try {
      const res = await call('member.list', { status: 'active' })
      const list = res.list || []
      this.chairmanGroups = groupBy(list.filter((item) => item.role === 'minister'))
      this.ministerGroups = groupBy(list.filter((item) => item.role === 'member'))
      this.chairmanSelected = []
      this.ministerSelected = []
      this.setData({ deptIndex: this.pickDept(0), roleIndex: 0, count: 0, loading: false })
      this.refresh()
    } catch (err) {
      this.setData({ loading: false })
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }
  },

  selected() {
    return this.data.roleIndex === 0 ? this.chairmanSelected : this.ministerSelected
  },

  groups() {
    return this.data.roleIndex === 0 ? this.chairmanGroups : this.ministerGroups
  },

  pickDept(roleIndex) {
    const groups = roleIndex === 0 ? this.chairmanGroups : this.ministerGroups
    const index = DEPT_KEYS.findIndex((key) => (groups[key] || []).length > 0)
    return index === -1 ? 0 : index
  },

  refresh() {
    const groups = this.groups()
    const key = DEPT_KEYS[this.data.deptIndex]
    const selected = this.selected() || []
    const candidates = (groups[key] || []).map((item) => ({
      ...item,
      checked: selected.includes(item._id)
    }))
    this.setData({ candidates, count: selected.length })
  },

  onRole(e) {
    const index = Number(e.currentTarget.dataset.index)
    if (index === this.data.roleIndex) return
    this.setData({ roleIndex: index, deptIndex: this.pickDept(index) }, () => this.refresh())
  },

  onDept(e) {
    const index = Number(e.currentTarget.dataset.index)
    if (this.data.roleIndex === 1) this.ministerSelected = []
    this.setData({ deptIndex: index }, () => this.refresh())
  },

  onToggle(e) {
    const id = e.currentTarget.dataset.id
    if (this.data.roleIndex === 0) {
      this.chairmanSelected = this.chairmanSelected.includes(id)
        ? this.chairmanSelected.filter((item) => item !== id)
        : [...this.chairmanSelected, id]
    } else {
      this.ministerSelected = this.ministerSelected.includes(id)
        ? this.ministerSelected.filter((item) => item !== id)
        : [...this.ministerSelected, id]
    }
    this.refresh()
  },

  selectedMembers(groups, ids) {
    const all = DEPT_KEYS.reduce((acc, key) => acc.concat(groups[key] || []), [])
    return all.filter((item) => ids.includes(item._id))
  },

  onAppoint() {
    if (this.data.roleIndex === 0) {
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
      return
    }

    const targets = this.selectedMembers(this.ministerGroups, this.ministerSelected)
    if (!targets.length) {
      wx.showToast({ title: '请先选择小干', icon: 'none' })
      return
    }
    const dept = DEPT_KEYS[this.data.deptIndex]
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
