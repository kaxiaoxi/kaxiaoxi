const DEPTS = ['photo', 'pr', 'ops']
const PHONE_RE = /^1[3-9]\d{9}$/
const STUDENT_NO_RE = /^\d{6,20}$/
const DORM_RE = /^[东西][一二三四五六七八九十]+[0-9]{3,4}$/

function text(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function validateRegister(input = {}) {
  const name = text(input.name, 20)
  const studentNo = text(input.studentNo, 20)
  const college = text(input.college, 30)
  const phone = text(input.phone, 11)
  const dorm = text(input.dorm, 15)
  const dept = text(input.dept, 10)

  if (!name) return { ok: false, message: '请填写姓名' }
  if (!STUDENT_NO_RE.test(studentNo)) return { ok: false, message: '请填写完整学号' }
  if (!college) return { ok: false, message: '请填写学院' }
  if (!PHONE_RE.test(phone)) return { ok: false, message: '手机号格式不正确' }
  if (!DORM_RE.test(dorm)) return { ok: false, message: '宿舍号格式如 东一636' }
  if (!DEPTS.includes(dept)) return { ok: false, message: '请选择部门' }

  return { ok: true, data: { name, studentNo, college, phone, dorm, dept } }
}

module.exports = { validateRegister, DEPTS }
