const DEPTS = ['photo', 'pr', 'ops']
const PHONE_RE = /^1[3-9]\d{9}$/
const STUDENT_NO_RE = /^\d{10}$/
const DORM_RE = /^[东西][一二三四五六七八九十]+[0-9]{3,4}$/
const BIRTHDAY_RE = /^\d{4}-\d{2}-\d{2}$/
const SIGNUP_MODES = ['first_come', 'review']
const AUDIENCES = ['all', 'depts']

function text(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function toDate(value) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function validateRegister(input = {}) {
  const name = text(input.name, 20)
  const studentNo = text(input.studentNo, 20)
  const college = text(input.college, 40)
  const phone = text(input.phone, 11)
  const dorm = text(input.dorm, 15)
  const dept = text(input.dept, 10)
  const birthday = text(input.birthday, 10)

  if (!name) return { ok: false, message: '请填写姓名' }
  if (!STUDENT_NO_RE.test(studentNo)) return { ok: false, message: '请填写完整学号' }
  if (!college) return { ok: false, message: '请填写学院全称' }
  if (!PHONE_RE.test(phone)) return { ok: false, message: '手机号格式不正确' }
  if (!DORM_RE.test(dorm)) return { ok: false, message: '宿舍号格式如 东一636' }
  if (!DEPTS.includes(dept)) return { ok: false, message: '请选择部门' }
  if (birthday && !BIRTHDAY_RE.test(birthday)) return { ok: false, message: '生日格式不正确' }

  return {
    ok: true,
    data: { name, studentNo, college, phone, dorm, dept, birthday }
  }
}

function validateTask(input = {}) {
  const title = text(input.title, 30)
  const description = text(input.description, 2000)
  const locationName = text(input.locationName, 40)
  const collectMethod = text(input.collectMethod, 200)
  const signupMode = SIGNUP_MODES.includes(input.signupMode) ? input.signupMode : 'review'
  const audience = AUDIENCES.includes(input.audience) ? input.audience : 'all'
  const quota = Number(input.quota)
  const erkeHours = Number(input.erkeHours)

  if (!title) return { ok: false, message: '请选择活动类型' }
  if (!Number.isInteger(quota) || quota < 0 || quota > 200) {
    return { ok: false, message: '人数需为 0-200 的整数（0 表示不限）' }
  }
  if (!Number.isInteger(erkeHours) || erkeHours < 0 || erkeHours > 99) {
    return { ok: false, message: '二课学时需为 0-99 的整数' }
  }

  const rawSessions = Array.isArray(input.sessions) ? input.sessions : []
  if (!rawSessions.length) return { ok: false, message: '请至少添加一个场次' }
  if (rawSessions.length > 10) return { ok: false, message: '场次最多 10 个' }

  const sessions = []
  for (const item of rawSessions) {
    const start = toDate(item.startAt)
    const end = toDate(item.endAt)
    if (!start || !end) return { ok: false, message: '场次时间格式不正确' }
    if (start >= end) return { ok: false, message: '每场结束时间需晚于开始时间' }
    sessions.push({ startAt: start, endAt: end })
  }
  sessions.sort((a, b) => a.startAt - b.startAt)

  const startAt = sessions[0].startAt
  const endAt = sessions[sessions.length - 1].endAt

  const signupStartAt = toDate(input.signupStartAt)
  const signupDeadline = toDate(input.signupDeadline)
  if (!signupStartAt || !signupDeadline) return { ok: false, message: '报名时间格式不正确' }
  if (signupDeadline <= signupStartAt) return { ok: false, message: '报名截止需晚于报名开始' }
  if (signupDeadline > startAt) return { ok: false, message: '报名截止需早于或等于首场开始' }

  const targetDepts = Array.isArray(input.targetDepts)
    ? input.targetDepts.filter((d) => DEPTS.includes(d))
    : []
  if (audience === 'depts' && !targetDepts.length) {
    return { ok: false, message: '请选择面向的部门' }
  }

  return {
    ok: true,
    data: {
      title,
      description,
      locationName,
      collectMethod,
      signupMode,
      audience,
      targetDepts: audience === 'depts' ? targetDepts : [],
      quota,
      erkeHours,
      sessions,
      startAt,
      endAt,
      signupStartAt,
      signupDeadline
    }
  }
}

module.exports = { validateRegister, validateTask, DEPTS }
