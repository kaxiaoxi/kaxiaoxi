function toDate(value) {
  return value instanceof Date ? value : new Date(value)
}

function phaseOf(task, now = new Date()) {
  if (task.cancelledAt) return 'cancelled'
  if (!task.published) return 'draft'
  if (now < toDate(task.startAt)) return 'not_started'
  if (now < toDate(task.endAt)) return 'ongoing'
  return 'finished'
}

function signupPhaseOf(task, now = new Date()) {
  if (now < toDate(task.signupStartAt)) return 'not_open'
  if (now < toDate(task.signupDeadline)) return 'open'
  return 'closed'
}

function visibleTo(task, me) {
  if (!me) return false
  if (me.role === 'chairman') return true
  if (task.audience === 'all') return true
  return Array.isArray(task.targetDepts) && task.targetDepts.includes(me.dept)
}

module.exports = { toDate, phaseOf, signupPhaseOf, visibleTo }
