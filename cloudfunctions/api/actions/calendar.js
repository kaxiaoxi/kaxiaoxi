const { db, _ } = require('../lib/db')
const { BizError } = require('../lib/errors')
const { getMemberByOpenid } = require('../lib/member')

/**
 * 活动类型：与协会实际在用的《影协日历与计划表》对齐，共 10 类。
 */
const TYPES = [
  '外拍采风',
  '摄影讲座/培训',
  '比赛/影展/作品评选',
  '例会/工作会',
  '器材体验/厂商活动',
  '专题推文策划',
  '联谊/年会',
  '招新',
  '截止日',
  '其他'
]

/**
 * 状态：实际表格里有 6 种，比最初设计多出「未开始」「卡住」。
 */
const STATUS = ['未开始', '筹备中', '已确定', '卡住', '已结束', '已取消']

/**
 * 可见范围：public 全体可见，staff 仅部长与主席可见。
 */
const VISIBILITIES = ['public', 'staff']

/**
 * 旧版 7 类到新版 10 类的映射，用于兼容历史上按旧枚举写入的数据。
 */
const TYPE_ALIAS = {
  招新: '招新',
  例会: '例会/工作会',
  外拍: '外拍采风',
  比赛: '比赛/影展/作品评选',
  展览: '比赛/影展/作品评选',
  截止: '截止日',
  其他: '其他'
}

function normalizeType(type) {
  if (TYPES.includes(type)) return type
  return TYPE_ALIAS[type] || '其他'
}

async function requireActive(openid) {
  const me = await getMemberByOpenid(openid)
  if (!me || me.status !== 'active') throw new BizError(40301, '账号未激活')
  return me
}

/** 部长与主席统称 staff，可见内部日程。 */
function isStaff(member) {
  return !!member && member.role !== 'member'
}

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`
}

/** 年月转成当月首末日，日期统一用 YYYY-MM-DD 字符串，避免时区偏移。 */
function monthBounds(year, monthNumber) {
  const lastDay = new Date(year, monthNumber, 0).getDate()
  return {
    startKey: `${year}-${pad(monthNumber)}-01`,
    endKey: `${year}-${pad(monthNumber)}-${pad(lastDay)}`
  }
}

/**
 * 只取 openid 对应的姓名，用于展示负责人。
 * 年历是全员可见的，这里刻意不返回学院、电话等字段。
 */
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

function toEvent(item, names) {
  return {
    _id: item._id,
    title: item.title,
    type: normalizeType(item.type),
    startDate: item.startDate,
    endDate: item.endDate || '',
    timeText: item.timeText || '',
    location: item.location || '',
    ownerOpenid: item.ownerOpenid || '',
    ownerName: names[item.ownerOpenid] || '',
    deputyOpenid: item.deputyOpenid || '',
    deputyName: names[item.deputyOpenid] || '',
    status: item.status || '筹备中',
    visibility: item.visibility || 'public',
    note: item.note || '',
    remindDate: item.remindDate || '',
    sourceTaskId: item.sourceTaskId || '',
    createdBy: item.createdBy || ''
  }
}

/**
 * 月视图：返回与本月有交集的日程。
 * 权限：小干只返回 visibility = public，staff 日程在查询条件里就过滤掉，不靠前端隐藏。
 */
async function month(payload = {}, openid) {
  const me = await requireActive(openid)
  const year = Number(payload.year)
  const monthNumber = Number(payload.month)
  if (!year || !monthNumber || monthNumber < 1 || monthNumber > 12) {
    throw new BizError(40001, '年月参数不正确')
  }

  const { startKey, endKey } = monthBounds(year, monthNumber)
  const cond = { deleted: false, startDate: _.lte(endKey) }
  if (!isStaff(me)) cond.visibility = 'public'

  const res = await db
    .collection('calendar_events')
    .where(cond)
    .orderBy('startDate', 'asc')
    .limit(300)
    .get()

  // 跨月日程：开始日早于本月、结束日在月内的也要显示
  const rows = res.data.filter((item) =>
    item.endDate ? item.endDate >= startKey : item.startDate >= startKey
  )
  const names = await nameMapOf(
    rows.reduce((acc, item) => acc.concat([item.ownerOpenid, item.deputyOpenid]), [])
  )
  return { list: rows.map((item) => toEvent(item, names)) }
}

/**
 * 列表视图：部长/主席专用的表格式数据源。
 * 权限：仅 staff。小干调用直接拒绝，不做「返回空数组」这种暧昧处理。
 */
async function list(payload = {}, openid) {
  const me = await requireActive(openid)
  if (!isStaff(me)) throw new BizError(40301, '仅部长或主席可查看列表视图')

  const range = ['thisMonth', 'nextMonth', 'all'].includes(payload.range)
    ? payload.range
    : 'thisMonth'
  const visibility = VISIBILITIES.includes(payload.visibility) ? payload.visibility : ''

  const now = new Date()
  const baseMonth = range === 'nextMonth' ? now.getMonth() + 2 : now.getMonth() + 1
  const target = new Date(now.getFullYear(), baseMonth - 1, 1)

  const cond = { deleted: false }
  if (visibility) cond.visibility = visibility
  if (range !== 'all') {
    const { endKey } = monthBounds(target.getFullYear(), target.getMonth() + 1)
    cond.startDate = _.lte(endKey)
  }

  const res = await db
    .collection('calendar_events')
    .where(cond)
    .orderBy('startDate', 'asc')
    .limit(300)
    .get()

  let rows = res.data
  if (range !== 'all') {
    const { startKey } = monthBounds(target.getFullYear(), target.getMonth() + 1)
    rows = rows.filter((item) =>
      item.endDate ? item.endDate >= startKey : item.startDate >= startKey
    )
  }

  const names = await nameMapOf(
    rows.reduce((acc, item) => acc.concat([item.ownerOpenid, item.deputyOpenid]), [])
  )
  return { list: rows.map((item) => toEvent(item, names)) }
}

/**
 * 详情：小干读 staff 日程直接 403，避免通过猜 ID 拿到内部事项。
 * 附带：来源任务摘要、关联未完成待办（最多 3 条，只读）。
 */
async function detail(payload = {}, openid) {
  const me = await requireActive(openid)
  const id = typeof payload.id === 'string' ? payload.id : ''
  if (!id) throw new BizError(40001, '缺少事件 ID')

  const res = await db
    .collection('calendar_events')
    .doc(id)
    .get()
    .catch(() => null)
  if (!res || !res.data || res.data.deleted) throw new BizError(40401, '事件不存在')

  const item = res.data
  if (!isStaff(me) && item.visibility === 'staff') throw new BizError(40301, '该日程仅内部可见')

  const names = await nameMapOf([item.ownerOpenid, item.deputyOpenid])

  let sourceTask = null
  if (item.sourceTaskId) {
    const taskRes = await db
      .collection('tasks')
      .doc(item.sourceTaskId)
      .get()
      .catch(() => null)
    if (taskRes && taskRes.data) {
      sourceTask = {
        _id: taskRes.data._id,
        title: taskRes.data.title,
        startAt: taskRes.data.startAt,
        locationName: taskRes.data.locationName || ''
      }
    }
  }

  const todoRes = await db
    .collection('todos')
    .where({ sourceEventId: id, done: false, deleted: false })
    .limit(3)
    .get()
    .catch(() => ({ data: [] }))

  return {
    event: toEvent(item, names),
    sourceTask,
    relatedTodos: (todoRes.data || []).map((todo) => ({ _id: todo._id, title: todo.title }))
  }
}

/**
 * 新建 / 编辑：仅部长与主席。
 * 按已确认的口径，部长可以修改、删除他人创建的事件，因此这里不做创建人校验。
 */
async function save(payload = {}, openid) {
  const me = await requireStaff(openid)

  const title = typeof payload.title === 'string' ? payload.title.trim().slice(0, 30) : ''
  const type = normalizeType(payload.type)
  const startDate = typeof payload.startDate === 'string' ? payload.startDate.trim() : ''
  const endDate =
    typeof payload.endDate === 'string' && payload.endDate ? payload.endDate.trim() : ''
  const timeText = typeof payload.timeText === 'string' ? payload.timeText.trim().slice(0, 20) : ''
  const location = typeof payload.location === 'string' ? payload.location.trim().slice(0, 40) : ''
  const note = typeof payload.note === 'string' ? payload.note.trim().slice(0, 500) : ''
  const ownerOpenid = typeof payload.ownerOpenid === 'string' ? payload.ownerOpenid : ''
  const deputyOpenid = typeof payload.deputyOpenid === 'string' ? payload.deputyOpenid : ''
  const remindDate =
    typeof payload.remindDate === 'string' && payload.remindDate ? payload.remindDate : ''
  const status = STATUS.includes(payload.status) ? payload.status : '筹备中'

  if (!title) throw new BizError(40001, '请填写日程名称')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) throw new BizError(40001, '请选择开始日期')
  if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate))
    throw new BizError(40001, '结束日期格式不正确')
  if (endDate && endDate < startDate) throw new BizError(40001, '结束日期不能早于开始日期')
  if (remindDate && !/^\d{4}-\d{2}-\d{2}$/.test(remindDate)) {
    throw new BizError(40001, '提醒日期格式不正确')
  }
  if (!ownerOpenid) throw new BizError(40001, '请选择主负责人')
  if (deputyOpenid && deputyOpenid === ownerOpenid)
    throw new BizError(40001, '副负责人不能与主负责人相同')

  // 只有部长与主席能建内部日程，这里已经是 staff，直接按入参校验枚举即可
  const visibility = VISIBILITIES.includes(payload.visibility) ? payload.visibility : 'public'

  const data = {
    title,
    type,
    startDate,
    endDate: endDate || null,
    timeText: timeText || '全天',
    location,
    ownerOpenid,
    deputyOpenid: deputyOpenid || null,
    status,
    visibility,
    note,
    remindDate: remindDate || null,
    updatedAt: db.serverDate()
  }

  const id = typeof payload.id === 'string' ? payload.id : ''
  if (id) {
    const res = await db
      .collection('calendar_events')
      .doc(id)
      .get()
      .catch(() => null)
    if (!res || !res.data || res.data.deleted) throw new BizError(40401, '事件不存在')
    await db.collection('calendar_events').doc(id).update({ data })
    return { id }
  }

  const created = await db.collection('calendar_events').add({
    data: {
      ...data,
      sourceTaskId: '',
      deleted: false,
      createdBy: me._openid || openid,
      createdAt: db.serverDate()
    }
  })
  return { id: created._id }
}

/**
 * 删除：仅部长与主席，软删留痕（deleted = true），不做物理删除。
 */
async function remove(payload = {}, openid) {
  await requireStaff(openid)
  const id = typeof payload.id === 'string' ? payload.id : ''
  if (!id) throw new BizError(40001, '缺少事件 ID')

  const res = await db
    .collection('calendar_events')
    .doc(id)
    .get()
    .catch(() => null)
  if (!res || !res.data || res.data.deleted) throw new BizError(40401, '事件不存在')

  await db
    .collection('calendar_events')
    .doc(id)
    .update({ data: { deleted: true, updatedAt: db.serverDate() } })
  return { id }
}

/** 部长与主席，权限判断集中在这里。 */
async function requireStaff(openid) {
  const me = await requireActive(openid)
  if (!isStaff(me)) throw new BizError(40301, '仅部长或主席可操作')
  return me
}

module.exports = { month, list, detail, save, remove, TYPES, STATUS, normalizeType }
