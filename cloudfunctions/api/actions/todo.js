const { db, _ } = require('../lib/db')
const { BizError } = require('../lib/errors')
const { getMemberByOpenid } = require('../lib/member')

async function requireActive(openid) {
  const me = await getMemberByOpenid(openid)
  if (!me || me.status !== 'active') throw new BizError(40301, '账号未激活')
  return me
}

function toTodo(item) {
  return {
    _id: item._id,
    title: item.title,
    description: item.description || '',
    scope: item.scope,
    dept: item.dept || '',
    ownerOpenid: item.ownerOpenid,
    priority: item.priority || 2,
    dueAt: item.dueAt || null,
    status: item.status,
    source: item.source || 'manual',
    autoRule: item.autoRule || ''
  }
}

async function list(payload = {}, openid) {
  const me = await requireActive(openid)
  const scope = payload.scope || 'mine'

  let cond
  if (scope === 'dept') {
    cond = { dept: me.dept, status: 'todo', scope: 'dept' }
  } else if (scope === 'done') {
    cond = { ownerOpenid: openid, status: 'done' }
  } else {
    cond = { ownerOpenid: openid, status: 'todo' }
  }

  const res = await db.collection('todos').where(cond).orderBy('createdAt', 'desc').limit(100).get()

  const list = res.data.map(toTodo).sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    if (!a.dueAt && !b.dueAt) return 0
    if (!a.dueAt) return 1
    if (!b.dueAt) return -1
    return new Date(a.dueAt) - new Date(b.dueAt)
  })

  return { list }
}

async function save(payload = {}, openid) {
  const me = await requireActive(openid)
  const title = typeof payload.title === 'string' ? payload.title.trim().slice(0, 50) : ''
  const description =
    typeof payload.description === 'string' ? payload.description.trim().slice(0, 500) : ''
  const scope = payload.scope === 'dept' ? 'dept' : 'personal'
  const priority = [1, 2, 3].includes(Number(payload.priority)) ? Number(payload.priority) : 2
  const dueAt = payload.dueAt ? new Date(payload.dueAt) : null
  const dept = scope === 'dept' ? me.dept : ''

  if (!title) throw new BizError(40001, '请填写待办标题')
  if (scope === 'dept' && me.role === 'member') {
    throw new BizError(40301, '仅部长或主席可建部门待办')
  }
  if (dueAt && Number.isNaN(dueAt.getTime())) throw new BizError(40001, '截止时间格式不正确')

  const id = typeof payload.id === 'string' ? payload.id : ''
  const data = {
    title,
    description,
    scope,
    dept,
    ownerOpenid: openid,
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
    if (!res || !res.data) throw new BizError(40401, '待办不存在')
    if (res.data.ownerOpenid !== openid && res.data.creatorOpenid !== openid) {
      throw new BizError(40301, '仅负责人或创建人可修改')
    }
    await db.collection('todos').doc(id).update({ data })
    return { id }
  }

  const created = await db.collection('todos').add({
    data: {
      ...data,
      creatorOpenid: openid,
      status: 'todo',
      source: 'manual',
      sourceTaskId: '',
      autoRule: '',
      completedAt: null,
      createdAt: db.serverDate()
    }
  })
  return { id: created._id }
}

async function complete(payload = {}, openid) {
  await requireActive(openid)
  const id = typeof payload.id === 'string' ? payload.id : ''
  if (!id) throw new BizError(40001, '缺少待办 ID')

  const res = await db
    .collection('todos')
    .doc(id)
    .get()
    .catch(() => null)
  if (!res || !res.data) throw new BizError(40401, '待办不存在')
  if (res.data.ownerOpenid !== openid && res.data.creatorOpenid !== openid) {
    throw new BizError(40301, '仅负责人或创建人可操作')
  }

  const done = payload.done !== false
  await db
    .collection('todos')
    .doc(id)
    .update({
      data: {
        status: done ? 'done' : 'todo',
        completedAt: done ? db.serverDate() : null,
        updatedAt: db.serverDate()
      }
    })
  return { status: done ? 'done' : 'todo' }
}

async function remove(payload = {}, openid) {
  await requireActive(openid)
  const id = typeof payload.id === 'string' ? payload.id : ''
  if (!id) throw new BizError(40001, '缺少待办 ID')

  const res = await db
    .collection('todos')
    .doc(id)
    .get()
    .catch(() => null)
  if (!res || !res.data) throw new BizError(40401, '待办不存在')
  if (res.data.ownerOpenid !== openid && res.data.creatorOpenid !== openid) {
    throw new BizError(40301, '仅负责人或创建人可删除')
  }

  await db
    .collection('todos')
    .doc(id)
    .update({ data: { status: 'cancelled', updatedAt: db.serverDate() } })
  return { status: 'cancelled' }
}

async function detail(payload = {}, openid) {
  await requireActive(openid)
  const id = typeof payload.id === 'string' ? payload.id : ''
  if (!id) throw new BizError(40001, '缺少待办 ID')

  const res = await db
    .collection('todos')
    .doc(id)
    .get()
    .catch(() => null)
  if (!res || !res.data) throw new BizError(40401, '待办不存在')
  return { todo: toTodo(res.data) }
}

module.exports = { list, save, complete, remove, detail, toTodo }
