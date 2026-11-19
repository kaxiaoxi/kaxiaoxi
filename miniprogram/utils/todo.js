const PRIORITY_LABEL = { 3: '高', 2: '中', 1: '低' }
const PRIORITY_CLASS = { 3: 'prio--high', 2: 'prio--mid', 1: 'prio--low' }

/** 四档可见范围对应的说明文案 */
const AUDIENCE_LABEL = {
  self: '仅自己',
  dept: '本部门',
  all: '全体',
  staff: '内部'
}

const AUDIENCE_DESC = {
  self: '只有主责人能看到',
  dept: '本部门成员都能看到并加入',
  all: '全体成员都能看到并加入',
  staff: '只有部长与主席能看到'
}

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`
}

function dueText(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  if (sameDay) return '今天截止'
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} 截止`
}

/** 协作人数展示，主责人不计入「协作」。 */
function joinText(count) {
  if (!count) return ''
  return `${count} 人协作`
}

module.exports = {
  PRIORITY_LABEL,
  PRIORITY_CLASS,
  AUDIENCE_LABEL,
  AUDIENCE_DESC,
  dueText,
  joinText
}
