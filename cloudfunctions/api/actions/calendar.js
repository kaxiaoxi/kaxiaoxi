const { db, _ } = require('../lib/db')
const { BizError } = require('../lib/errors')
const { getMemberByOpenid } = require('../lib/member')

const TYPES = ['招新', '例会', '外拍', '比赛', '展览', '截止', '其他']

async function requireActive(openid) {
  const me = await getMemberByOpenid(openid)
  if (!me || me.status !== 'active') throw new BizError(40301, '账号未激活')
  return me
}

async function requireStaff(openid) {
  const me = await requireActive(openid)
  if (me.role === 'member') throw new BizError(40301, '仅部长或主席可操作')
  return me
}

function toDate(value) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function toEvent(item) {
  return {
    _id: item._id,
    title: item.title,
    type: item.type,
    startAt: item.startAt,
    endAt: item.endAt,
    allDay: !!item.allDay,
    locationName: item.locationName || '',
    description: item.description || '',
    createdBy: item.createdBy
  }
}

async function month(payload = {}, openid) {
  await requireActive(openid)
  const year = Number(payload.year)
  const monthNumber = Number(payload.month)
  if (!year || !monthNumber || monthNumber < 1 || monthNumber > 12) {
    throw new BizError(40001, '年月参数不正确')
  }

  const start = new Date(year, monthNumber - 1, 1)
  const end = new Date(year, monthNumber, 1)

  const res = await db
    .collection('calendar_events')
    .where({ deletedAt: _.exists(false), startAt: _.lt(end), endAt: _.gte(start) })
    .orderBy('startAt', 'asc')
    .limit(200)
    .get()

  return { list: res.data.map(toEvent) }
}

async function detail(payload = {}, openid) {
  await requireActive(openid)
  const id = typeof payload.id === 'string' ? payload.id : ''
  if (!id) throw new BizError(40001, '缺少事件 ID')
  const res = await db
    .collection('calendar_events')
    .doc(id)
    .get()
    .catch(() => null)
  if (!res || !res.data) throw new BizError(40401, '事件不存在')
  return { event: toEvent(res.data) }
}

async function save(payload = {}, openid) {
  const me = await requireStaff(openid)
  const title = typeof payload.title === 'string' ? payload.title.trim().slice(0, 30) : ''
  const type = TYPES.includes(payload.type) ? payload.type : '其他'
  const startAt = toDate(payload.startAt)
  const endAt = toDate(payload.endAt)
  const locationName =
    typeof payload.locationName === 'string' ? payload.locationName.trim().slice(0, 40) : ''
  const description =
    typeof payload.description === 'string' ? payload.description.trim().slice(0, 500) : ''

  if (!title) throw new BizError(40001, '请填写事件名称')
  if (!startAt || !endAt) throw new BizError(40001, '时间格式不正确')
  if (endAt < startAt) throw new BizError(40001, '结束时间需晚于开始时间')

  const data = {
    title,
    type,
    startAt,
    endAt,
    allDay: !!payload.allDay,
    locationName,
    description,
    updatedAt: db.serverDate()
  }

  const id = typeof payload.id === 'string' ? payload.id : ''
  if (id) {
    const res = await db
      .collection('calendar_events')
      .doc(id)
      .get()
      .catch(() => null)
    if (!res || !res.data) throw new BizError(40401, '事件不存在')
    if (res.data.createdBy !== openid && me.role !== 'chairman') {
      throw new BizError(40301, '仅创建人或主席可修改')
    }
    await db.collection('calendar_events').doc(id).update({ data })
    return { id }
  }

  const created = await db.collection('calendar_events').add({
    data: {
      ...data,
      relatedTaskId: '',
      createdBy: openid,
      createdAt: db.serverDate()
    }
  })
  return { id: created._id }
}

async function remove(payload = {}, openid) {
  const me = await requireStaff(openid)
  const id = typeof payload.id === 'string' ? payload.id : ''
  if (!id) throw new BizError(40001, '缺少事件 ID')

  const res = await db
    .collection('calendar_events')
    .doc(id)
    .get()
    .catch(() => null)
  if (!res || !res.data) throw new BizError(40401, '事件不存在')
  if (res.data.createdBy !== openid && me.role !== 'chairman') {
    throw new BizError(40301, '仅创建人或主席可删除')
  }

  await db
    .collection('calendar_events')
    .doc(id)
    .update({ data: { deletedAt: db.serverDate(), updatedAt: db.serverDate() } })
  return { id }
}

module.exports = { month, detail, save, remove, TYPES }
