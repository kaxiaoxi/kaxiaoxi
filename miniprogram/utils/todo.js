const PRIORITY_LABEL = { 3: '高', 2: '中', 1: '低' }
const PRIORITY_CLASS = { 3: 'prio--high', 2: 'prio--mid', 1: 'prio--low' }

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

module.exports = { PRIORITY_LABEL, PRIORITY_CLASS, dueText }
