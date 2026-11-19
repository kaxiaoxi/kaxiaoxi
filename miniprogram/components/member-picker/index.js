const { DEPT_LABEL, ROLE_LABEL } = require('../../utils/constants')

/**
 * 可搜索的成员选择面板。
 * 人数一多，原生 picker 的滚轮很难找，这里改成「搜索 + 按部门分组」的列表。
 */
Component({
  properties: {
    visible: { type: Boolean, value: false },
    title: { type: String, value: '选择负责人' },
    members: { type: Array, value: [] },
    value: { type: String, value: '' },
    exclude: { type: String, value: '' },
    allowEmpty: { type: Boolean, value: false },
    emptyText: { type: String, value: '不设置' }
  },

  data: {
    keyword: '',
    groups: []
  },

  observers: {
    visible(visible) {
      if (!visible) return
      // 每次打开都清空搜索词，避免上次的关键字残留
      this.setData({ keyword: '' }, () => this.build())
    },
    'members, value, exclude'() {
      if (this.properties.visible) this.build()
    }
  },

  methods: {
    build() {
      const keyword = (this.data.keyword || '').trim()
      const exclude = this.properties.exclude
      const value = this.properties.value
      const source = (this.properties.members || []).filter((item) => item.openid !== exclude)

      const chairmen = []
      const depts = {}
      source.forEach((item) => {
        if (item.role === 'chairman') {
          chairmen.push(item)
          return
        }
        const key = item.dept || 'other'
        if (!depts[key]) depts[key] = []
        depts[key].push(item)
      })

      const groups = []
      if (chairmen.length) groups.push({ key: 'chairman', label: '主席', list: chairmen })
      Object.keys(depts).forEach((key) => {
        groups.push({ key, label: DEPT_LABEL[key] || '其他', list: depts[key] })
      })

      const matched = groups
        .map((group) => ({
          key: group.key,
          label: group.label,
          list: group.list
            .filter((item) => {
              if (!keyword) return true
              const name = item.name || ''
              const dept = DEPT_LABEL[item.dept] || ''
              return name.indexOf(keyword) >= 0 || dept.indexOf(keyword) >= 0
            })
            .map((item) => ({
              openid: item.openid,
              name: item.name,
              roleLabel: ROLE_LABEL[item.role] || '成员',
              avatarText: item.avatarText || (item.name || '').slice(0, 1),
              avatarColor: item.avatarColor || '#2E5F7E',
              checked: item.openid === value
            }))
        }))
        .filter((group) => group.list.length)

      this.setData({ groups: matched })
    },

    onInput(e) {
      this.setData({ keyword: e.detail.value }, () => this.build())
    },

    onClear() {
      this.setData({ keyword: '' }, () => this.build())
    },

    onPick(e) {
      const { openid, name } = e.currentTarget.dataset
      this.triggerEvent('select', { openid, name })
    },

    onPickEmpty() {
      this.triggerEvent('select', { openid: '', name: '' })
    },

    onClose() {
      this.triggerEvent('close')
    },

    noop() {}
  }
})
