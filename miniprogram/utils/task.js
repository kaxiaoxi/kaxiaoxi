const PHASE_LABEL = {
  not_started: '未开始',
  ongoing: '进行中',
  finished: '已结束',
  cancelled: '已取消',
  draft: '草稿'
}

const PHASE_CLASS = {
  not_started: 'tag--gray',
  ongoing: 'tag--green',
  finished: 'tag--gray',
  cancelled: 'tag--gray',
  draft: 'tag--gray'
}

const MY_SIGNUP_LABEL = {
  pending: '审核中',
  approved: '已报名',
  waitlisted: '候补中',
  rejected: '未通过',
  withdrawn: '已取消',
  leave_pending: '请假待审',
  left: '已请假'
}

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`
}

function toDate(value) {
  return value instanceof Date ? value : new Date(value)
}

function formatDay(value) {
  const date = toDate(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatTime(value) {
  const date = toDate(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatSession(session) {
  return `${formatDay(session.startAt)} ${formatTime(session.startAt)}–${formatTime(session.endAt)}`
}

function formatRange(task) {
  if (!task || !task.startAt) return ''
  if (task.endAt && formatDay(task.startAt) !== formatDay(task.endAt)) {
    return `${formatDay(task.startAt)} ~ ${formatDay(task.endAt)}`
  }
  return `${formatDay(task.startAt)} ${formatTime(task.startAt)}`
}

function quotaText(task) {
  const approved = task.approvedCount || 0
  const waitlist = task.waitlistCount || 0
  const quota = task.quota || 0
  if (!quota) return `已报名 ${approved} 人 · 不限人数`
  if (waitlist > 0) return `${approved}/${quota} 人 · 候补 ${waitlist}`
  return `${approved}/${quota} 人`
}

module.exports = {
  PHASE_LABEL,
  PHASE_CLASS,
  MY_SIGNUP_LABEL,
  formatDay,
  formatTime,
  formatSession,
  formatRange,
  quotaText
}
