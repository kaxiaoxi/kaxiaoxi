const DEPTS = ['photo', 'pr', 'ops']
const PHONE_RE = /^1[3-9]\d{9}$/
const STUDENT_NO_RE = /^\d{10}$/
const DORM_RE = /^[东西][一二三四五六七八九十]+[0-9]{3,4}$/

/**
 * 客户端预校验，规则必须与云函数 lib/validate.js 保持一致。
 */
function validateRegister(form = {}) {
  const name = (form.name || '').trim()
  const studentNo = (form.studentNo || '').trim()
  const college = (form.college || '').trim()
  const phone = (form.phone || '').trim()
  const dorm = (form.dorm || '').trim()
  const dept = form.dept || ''

  if (!name) return { ok: false, message: '请填写姓名' }
  if (!STUDENT_NO_RE.test(studentNo)) return { ok: false, message: '请填写完整学号' }
  if (!college) return { ok: false, message: '请填写学院' }
  if (!PHONE_RE.test(phone)) return { ok: false, message: '手机号格式不正确' }
  if (!DORM_RE.test(dorm)) return { ok: false, message: '宿舍号格式如 东一636' }
  if (!DEPTS.includes(dept)) return { ok: false, message: '请选择部门' }

  return { ok: true, data: { name, studentNo, college, phone, dorm, dept } }
}

module.exports = { validateRegister, DEPTS }
