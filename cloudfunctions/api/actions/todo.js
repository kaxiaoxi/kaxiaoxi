const { db, _ } = require('../lib/db')
const { BizError } = require('../lib/errors')
const { getMemberByOpenid } = require('../lib/member')

/**
 * 待办可见范围，四档：
 * - self 仅主责人
 * - dept 主责人 + 本部门全体
 * - all  全体成员
 * - staff 仅部长与主席（内部管理事项）
 */
const AUDIENCES = ['self', 'dept', 'all', 'staff']

const DEPTS = ['photo', 'pr', 'ops']

async function requireActive(openid) {
  const me = await getMemberByOpenid(openid)
  if (!me || me.status !== 'active') throw new BizError(40301, '账号未激活')
  return me
}

function isStaff(member) {
  return !!member && member.role !== 'member'
}

function isChairman(member) {
  return !!member && member.role === 'chairman'
}

/** 是否已经在该待办的协作人里（主责人也算自己人）。 */
function isJoiner(todo, openid) {
  if (todo.ownerOpenid === openid) return true
  return Array.isArray(todo.participants) && todo.participants.includes(openid)
}

/**
 * 可见性判断，所有读接口都走这里。
 * 小干在任何入口都拿不到 staff 待办。
 */
function canSee(me, todo) {
  if (isChairman(me)) return true
  if (isJoiner(todo, me._openid)) return true
  if (todo.audience === 'staff') return isStaff(me)
  if (todo.audience === 'all') return true
  if (todo.audience === 'dept') return me.dept === todo.dept
  return false
}

/** 改：主责人 / 创建人；部长限本部门；主席全部。 */
function canEdit(me, todo) {
  if (isChairman(me)) return true
  if (todo.ownerOpenid === me._openid || todo.creatorOpenid === me._openid) return true
  return me.role === 'minister' && todo.dept === me.dept
}

/** 完成：主责人 / 参与人；部长限本部门；主席全部。 */
function canComplete(me, todo) {
  if (isChairman(me)) return true
  if (isJoiner(todo, me._openid)) return true
  return me.role === 'minister' && todo.dept === me.dept
}

/** 删：小干仅自己建的；部长本部门；主席全部。 */
function canRemove(me, todo) {
  if (isChairman(me)) return true
  if (me.role === 'minister' && todo.dept === me.dept) return true
  return todo.creatorOpenid === me._openid
}

async function nameMapOf(openids) {
  const ids = Array.from(new Set(openids.filter((id) => typeof id === 'string' && id)))
  const map = {}
  if (!ids.length) return map
  const res = await db
    .collection('members')
    .where({ _openid: _.in(ids) })
    .limit(100)
    .get()
  res.data.forEach((member) => {
    map[member._openid] = member.name
  })
  return map
}

function toTodo(item, names = {}) {
  return {
    _id: item._id,
    title: item.title,
    description: item.description || '',
    ownerOpenid: item.ownerOpenid || '',
    ownerName: names[item.ownerOpenid] || '',
    creatorOpenid: item.creatorOpenid || '',
    dept: item.dept || '',
    audience: item.audience || 'self',
    participants: item.participants || [],
    participantCount: (item.participants || []).length,
    priority: item.priority || 2,
    dueAt: item.dueAt || null,
    done: !!item.done,
    source: item.source || 'manual',
    sourceTaskId: item.sourceTaskId || '',
    sourceEventId: item.sourceEventId || '',
    autoRule: item.autoRule || '',
    createdAt: item.createdAt || null
  }
}

/** 优先级降序 + 截止日期升序，无截止的排后面。 */
function sortTodos(list) {
  return list.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    if (!a.dueAt && !b.dueAt) return 0
    if (!a.dueAt) return 1
    if (!b.dueAt) return -1
    return new Date(a.dueAt) - new Date(b.dueAt)
  })
}

async function fetchBy(cond) {
  const res = await db
    .collection('todos')
    .where({ deleted: false, done: false, ...cond })
    .limit(100)
    .get()
  return res.data || []
}

/**
 * 四个 tab 的取数口径：
 * - mine 我负责的 + 我参与的
 * - dept 本部门可加入、但我还没加入的
 * - staff 内部事项，仅部长与主席
 * - done 我参与过且已完成的
 */
async function list(payload = {}, openid) {
  const me = await requireActive(openid)
  const scope = payload.scope || 'mine'
  let rows = []

  if (scope === 'dept') {
    // 本部门的 dept 待办 + 面向全体的 all 待办，都会出现在「部门」tab
    const deptItems = await fetchBy({ audience: 'dept', dept: me.dept })
    const allItems = await fetchBy({ audience: 'all' })
    rows = deptItems.concat(allItems).filter((item) => !isJoiner(item, openid))
  } else if (scope === 'staff') {
    if (!isStaff(me)) throw new BizError(40301, '仅部长或主席可查看内部待办')
    rows = await fetchBy({ audience: 'staff' })
  } else if (scope === 'done') {
    const own = await db
      .collection('todos')
      .where({ deleted: false, done: true, ownerOpenid: openid })
      .limit(50)
      .get()
    const joined = await db
      .collection('todos')
      .where({ deleted: false, done: true, participants: openid })
      .limit(50)
      .get()
    const merged = {}
    ;(own.data || []).concat(joined.data || []).forEach((item) => {
      merged[item._id] = item
    })
    rows = Object.keys(merged).map((key) => merged[key])
  } else {
    const own = await fetchBy({ ownerOpenid: openid })
    const joined = await fetchBy({ participants: openid })
    const merged = {}
    own.concat(joined).forEach((item) => {
      merged[item._id] = item
    })
    rows = Object.keys(merged).map((key) => merged[key])
  }

  // 小干的任何列表都不返回 staff 待办
  if (!isStaff(me)) rows = rows.filter((item) => item.audience !== 'staff')

  const names = await nameMapOf(rows.map((item) => item.ownerOpenid))
  return { list: sortTodos(rows.map((item) => toTodo(item, names))) }
}

/**
 * 详情：先算可见性，再返回协作人姓名与当前用户能做什么。
 */
async function detail(payload = {}, openid) {
  const me = await requireActive(openid)
  const id = typeof payload.id === 'string' ? payload.id : ''
  if (!id) throw new BizError(40001, '缺少待办 ID')

  const res = await db
    .collection('todos')
    .doc(id)
    .get()
    .catch(() => null)
  if (!res || !res.data || res.data.deleted) throw new BizError(40401, '待办不存在')

  const item = res.data
  if (!canSee(me, item)) throw new BizError(40301, '无权查看该待办')

  const names = await nameMapOf([item.ownerOpenid].concat(item.participants || []))
  const participants = (item.participants || []).map((oid) => ({
    openid: oid,
    name: names[oid] || '成员'
  }))

  return {
    todo: toTodo(item, names),
    participants,
    joined: isJoiner(item, openid),
    can: {
      join: ['dept', 'all'].includes(item.audience || 'self') && !isJoiner(item, openid),
      quit: Array.isArray(item.participants) && item.participants.includes(openid),
      complete: canComplete(me, item),
      edit: canEdit(me, item),
      remove: canRemove(me, item)
    }
  }
}

/**
 * 新建 / 编辑。
 * 权限：小干只能建 self 待办；部长本部门；主席可指定部门。
 * 主责人默认是创建人，部长与主席可以指派给他人。
 */
async function save(payload = {}, openid) {
  const me = await requireActive(openid)
  const title = typeof payload.title === 'string' ? payload.title.trim().slice(0, 50) : ''
  const description =
    typeof payload.description === 'string' ? payload.description.trim().slice(0, 500) : ''
  const priority = [1, 2, 3].includes(Number(payload.priority)) ? Number(payload.priority) : 2
  const dueAt = payload.dueAt ? new Date(payload.dueAt) : null
  const audience = AUDIENCES.includes(payload.audience) ? payload.audience : 'self'

  if (!title) throw new BizError(40001, '请填写待办标题')
  if (dueAt && Number.isNaN(dueAt.getTime())) throw new BizError(40001, '截止日期格式不正确')

  // 小干只能建只属于自己的待办，部门与全体待办属于管理动作
  if (!isStaff(me) && audience !== 'self') {
    throw new BizError(40301, '只有部长或主席可以建部门、全体待办')
  }

  // 部门归属：主席可指定，部长固定本部门，self 待办不需要部门
  let dept = ''
  if (audience !== 'self') {
    if (isChairman(me)) {
      dept = DEPTS.includes(payload.dept) ? payload.dept : me.dept
    } else {
      dept = me.dept
    }
  }

  // 主责人：小干固定自己，部长与主席可指派
  let ownerOpenid = openid
  if (isStaff(me) && typeof payload.ownerOpenid === 'string' && payload.ownerOpenid) {
    ownerOpenid = payload.ownerOpenid
  }

  const id = typeof payload.id === 'string' ? payload.id : ''
  const data = {
    title,
    description,
    audience,
    dept,
    ownerOpenid,
    priority,
    dueAt,
    updatedAt: db.serverDate()
  }

  if (id) {
    const res = await db
      .collection('todos')
      .doc(id)
      .get()
      .catch(() => null)
    if (!res || !res.data || res.data.deleted) throw new BizError(40401, '待办不存在')
    if (!canEdit(me, res.data)) throw new BizError(40301, '无权修改该待办')
    await db.collection('todos').doc(id).update({ data })
    return { id }
  }

  const created = await db.collection('todos').add({
    data: {
      ...data,
      creatorOpenid: openid,
      participants: [],
      done: false,
      deleted: false,
      source: 'manual',
      sourceTaskId: '',
      sourceEventId: '',
      autoRule: '',
      completedAt: null,
      createdAt: db.serverDate()
    }
  })
  return { id: created._id }
}

/**
 * 完成 / 取消完成：主责人、参与人、本部门部长、主席。
 */
async function complete(payload = {}, openid) {
  const me = await requireActive(openid)
  const id = typeof payload.id === 'string' ? payload.id : ''
  if (!id) throw new BizError(40001, '缺少待办 ID')

  const res = await db
    .collection('todos')
    .doc(id)
    .get()
    .catch(() => null)
  if (!res || !res.data || res.data.deleted) throw new BizError(40401, '待办不存在')
  if (!canComplete(me, res.data)) throw new BizError(40301, '无权操作该待办')

  const done = payload.done !== false
  await db
    .collection('todos')
    .doc(id)
    .update({
      data: {
        done,
        completedAt: done ? db.serverDate() : null,
        updatedAt: db.serverDate()
      }
    })
  return { done }
}

/** 删除：软删，保留记录。 */
async function remove(payload = {}, openid) {
  const me = await requireActive(openid)
  const id = typeof payload.id === 'string' ? payload.id : ''
  if (!id) throw new BizError(40001, '缺少待办 ID')

  const res = await db
    .collection('todos')
    .doc(id)
    .get()
    .catch(() => null)
  if (!res || !res.data || res.data.deleted) throw new BizError(40401, '待办不存在')
  if (!canRemove(me, res.data)) throw new BizError(40301, '无权删除该待办')

  await db
    .collection('todos')
    .doc(id)
    .update({ data: { deleted: true, updatedAt: db.serverDate() } })
  return { id }
}

/**
 * 加入协作：仅 dept / all 待办，主责人不需要加入，不设审批。
 * 这里用 addToSet，重复点击不会产生重复记录。
 */
async function join(payload = {}, openid) {
  await requireActive(openid)
  const id = typeof payload.id === 'string' ? payload.id : ''
  if (!id) throw new BizError(40001, '缺少待办 ID')

  const res = await db
    .collection('todos')
    .doc(id)
    .get()
    .catch(() => null)
  if (!res || !res.data || res.data.deleted) throw new BizError(40401, '待办不存在')

  const item = res.data
  if (!['dept', 'all'].includes(item.audience || 'self')) {
    throw new BizError(40301, '该待办不接受加入')
  }
  if (item.ownerOpenid === openid) throw new BizError(40301, '你已经是主责人')

  await db
    .collection('todos')
    .doc(id)
    .update({ data: { participants: _.addToSet(openid), updatedAt: db.serverDate() } })
  return { joined: true }
}

/** 退出协作：只能退自己，主责人不受影响。 */
async function quit(payload = {}, openid) {
  await requireActive(openid)
  const id = typeof payload.id === 'string' ? payload.id : ''
  if (!id) throw new BizError(40001, '缺少待办 ID')

  const res = await db
    .collection('todos')
    .doc(id)
    .get()
    .catch(() => null)
  if (!res || !res.data || res.data.deleted) throw new BizError(40401, '待办不存在')

  await db
    .collection('todos')
    .doc(id)
    .update({ data: { participants: _.pull(openid), updatedAt: db.serverDate() } })
  return { joined: false }
}

module.exports = { list, detail, save, complete, remove, join, quit, toTodo }
