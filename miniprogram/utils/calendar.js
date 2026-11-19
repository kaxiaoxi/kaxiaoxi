/**
 * 年历相关的枚举与展示规则，页面与云函数共用同一套中文取值。
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

/** 类型到配色 key 的映射，wxss 里按 key 写样式。 */
const TYPE_KEY = {
  外拍采风: 'shoot',
  '摄影讲座/培训': 'lecture',
  '比赛/影展/作品评选': 'contest',
  '例会/工作会': 'meeting',
  '器材体验/厂商活动': 'gear',
  专题推文策划: 'article',
  '联谊/年会': 'party',
  招新: 'recruit',
  截止日: 'deadline',
  其他: 'other'
}

const STATUS = ['未开始', '筹备中', '已确定', '卡住', '已结束', '已取消']

const STATUS_CLASS = {
  未开始: 'chip--gray',
  筹备中: 'chip--blue',
  已确定: 'chip--green',
  卡住: 'chip--red',
  已结束: 'chip--gray',
  已取消: 'chip--gray'
}

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`
}

function typeKey(type) {
  return TYPE_KEY[type] || 'other'
}

/** 11/15 或 11/15–11/22，用于列表与详情。 */
function dateRangeText(startDate, endDate) {
  if (!startDate) return ''
  const head = startDate.slice(5).replace('-', '/')
  if (!endDate || endDate === startDate) return head
  return `${head}–${endDate.slice(5).replace('-', '/')}`
}

function todayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

module.exports = {
  TYPES,
  TYPE_KEY,
  STATUS,
  STATUS_CLASS,
  typeKey,
  dateRangeText,
  todayKey,
  pad
}
