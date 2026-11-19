const { call } = require('../../../services/api')
const { AUDIENCE_LABEL, AUDIENCE_DESC } = require('../../../utils/todo')
const { ROLE } = require('../../../utils/constants')
const { ensureMember } = require('../../../utils/session')

const PRIORITIES = [
  { value: 3, label: '高' },
  { value: 2, label: '中' },
  { value: 1, label: '低' }
]

const STAFF_AUDIENCES = ['self', 'dept', 'all', 'staff']
const MEMBER_AUDIENCES = ['self']

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`
}

Page({
  data: {
    id: '',
    form: {
      title: '',
      description: ''
    },
    audiences: [],
    audience: 'self',
    audienceDesc: '',
    priorities: PRIORITIES,
    priority: 2,
    members: [],
    ownerOpenid: '',
    ownerName: '',
    pickerVisible: false,
    pickerValue: '',
    isStaff: false,
    isChairman: false,
    depts: ['photo', 'pr', 'ops'],
    deptLabels: ['摄影师队', '宣传部', '运营部'],
    deptIndex: 0,
    showOwner: false,
    showDept: false,
    dueDate: '',
    submitting: false
  },

  async onLoad(options) {
    const member = (await ensureMember()) || {}
    const isStaff = member.role !== ROLE.MEMBER
    const isChairman = member.role === ROLE.CHAIRMAN
    const keys = isStaff ? STAFF_AUDIENCES : MEMBER_AUDIENCES
    const audiences = keys.map((key) => ({ key, label: AUDIENCE_LABEL[key] }))
    const deptIndex = Math.max(this.data.depts.indexOf(member.dept), 0)

    this.setData({
      isStaff,
      isChairman,
      audiences,
      deptIndex,
      showOwner: isStaff,
      audienceDesc: AUDIENCE_DESC.self
    })

    const id = options.id || ''
    if (id) {
      this.setData({ id })
      this.load(id)
    } else if (isStaff) {
      this.loadMembers().then(() => this.setDefaultOwner())
    }
  },

  async loadMembers() {
    try {
      const res = await call('member.options')
      const members = res.list || []
      this.setData({ members })
    } catch (err) {
      wx.showToast({ title: err.message || '成员加载失败', icon: 'none' })
    }
  },

  setDefaultOwner() {
    const member = getApp().globalData.member || {}
    const target = this.data.members.find((item) => item.openid === member._openid)
    if (!target) return
    this.setData({ ownerOpenid: target.openid, ownerName: target.name })
  },

  onOpenOwnerPicker() {
    this.setData({
      pickerVisible: true,
      pickerValue: this.data.ownerOpenid
    })
  },

  onPickerClose() {
    this.setData({ pickerVisible: false })
  },

  onPickerSelect(e) {
    const { openid, name } = e.detail
    this.setData({ ownerOpenid: openid, ownerName: name, pickerVisible: false })
  },

  async load(id) {
    if (this.data.isStaff) await this.loadMembers()
    try {
      const res = await call('todo.detail', { id })
      const todo = res.todo
      const due = todo.dueAt ? new Date(todo.dueAt) : null
      const owner = this.data.members.find((item) => item.openid === todo.ownerOpenid)
      const deptIndex = Math.max(this.data.depts.indexOf(todo.dept), 0)

      this.setData({
        form: { title: todo.title, description: todo.description || '' },
        audience: todo.audience,
        audienceDesc: AUDIENCE_DESC[todo.audience] || '',
        priority: todo.priority,
        ownerOpenid: todo.ownerOpenid || '',
        ownerName: owner ? owner.name : todo.ownerName || '',
        deptIndex,
        dueDate: due ? `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}` : ''
      })
      this.syncDeptVisibility()
    } catch (err) {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    }
  },

  /** 只有主席、且不是「仅自己」时才需要选部门。 */
  syncDeptVisibility() {
    this.setData({
      showDept: this.data.isChairman && this.data.audience !== 'self'
    })
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  onAudience(e) {
    const audience = e.currentTarget.dataset.key
    this.setData({ audience, audienceDesc: AUDIENCE_DESC[audience] || '' }, () =>
      this.syncDeptVisibility()
    )
  },

  onPriority(e) {
    this.setData({ priority: Number(e.currentTarget.dataset.value) })
  },

  onDept(e) {
    this.setData({ deptIndex: Number(e.detail.value) })
  },

  onDue(e) {
    this.setData({ dueDate: e.detail.value })
  },

  onClearDue() {
    this.setData({ dueDate: '' })
  },

  async onSubmit() {
    if (this.data.submitting) return
    const { id, form, audience, priority, dueDate, isStaff, isChairman, ownerOpenid } = this.data

    if (!form.title.trim()) {
      wx.showToast({ title: '请填写标题', icon: 'none' })
      return
    }

    const payload = {
      id,
      title: form.title,
      description: form.description,
      audience,
      priority,
      dueAt: dueDate ? `${dueDate}T18:00:00+08:00` : ''
    }

    if (isStaff) {
      if (!ownerOpenid) {
        wx.showToast({ title: '请选择主责人', icon: 'none' })
        return
      }
      payload.ownerOpenid = ownerOpenid
    }
    if (isChairman && audience !== 'self') {
      payload.dept = this.data.depts[this.data.deptIndex]
    }

    this.setData({ submitting: true })
    try {
      await call('todo.save', payload)
      wx.showToast({ title: '已保存', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 500)
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },

  onDelete() {
    wx.showModal({
      title: '删除待办',
      content: '删除后将不再显示，确定吗？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await call('todo.remove', { id: this.data.id })
          wx.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 500)
        } catch (err) {
          wx.showToast({ title: err.message || '删除失败', icon: 'none' })
        }
      }
    })
  }
})
