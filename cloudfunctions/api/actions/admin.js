const { db } = require('../lib/db')
const { BizError } = require('../lib/errors')
const { requireChairman } = require('../lib/member')
const { notify } = require('../lib/notify')

const DEPTS = ['photo', 'pr', 'ops']
const DEPT_LABEL = { photo: '摄影师队', pr: '宣传部', ops: '运营部' }

async function readConfig(key) {
  const res = await db.collection('configs').where({ key }).limit(1).get()
  return res.data.length ? res.data[0] : null
}

async function writeConfig(key, value) {
  const existing = await readConfig(key)
  if (existing) {
    await db
      .collection('configs')
      .doc(existing._id)
      .update({ data: { value, updatedAt: db.serverDate() } })
    return
  }
  await db.collection('configs').add({
    data: { key, value, updatedAt: db.serverDate() }
  })
}

function academicYearOf(date) {
  const year = date.getFullYear()
  return date.getMonth() + 1 >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}

async function findMember(studentNo) {
  if (!/^\d{10}$/.test(studentNo)) throw new BizError(40001, '请填写 10 位学号')
  const res = await db.collection('members').where({ studentNo }).limit(1).get()
  if (!res.data.length) throw new BizError(40401, '未找到该学号')
  const target = res.data[0]
  if (target.status !== 'active') throw new BizError(40009, '该成员未激活')
  return target
}

async function getSettings(payload = {}, openid) {
  const me = await requireChairman(openid)
  const yearConfig = await readConfig('currentAcademicYear')
  return {
    academicYear: yearConfig ? yearConfig.value : academicYearOf(new Date()),
    chairmanName: me.name
  }
}

async function archiveYear(payload = {}, openid) {
  await requireChairman(openid)
  const year = typeof payload.year === 'string' ? payload.year : ''
  if (!/^\d{4}-\d{4}$/.test(year)) throw new BizError(40001, '学年格式如 2027-2028')
  await writeConfig('currentAcademicYear', year)
  return { academicYear: year }
}

/**
 * 任命新主席：只提升角色，不改变现任主席（协会可有多位主席）。
 */
async function appointChairman(payload = {}, openid) {
  await requireChairman(openid)
  const studentNo = typeof payload.studentNo === 'string' ? payload.studentNo.trim() : ''
  const target = await findMember(studentNo)
  if (target.role === 'chairman') throw new BizError(40008, '该成员已经是主席')

  await db
    .collection('members')
    .doc(target._id)
    .update({ data: { role: 'chairman', updatedAt: db.serverDate() } })

  await notify(target._openid, {
    type: 'system',
    title: '任命通知',
    content: '你已被任命为影协主席，可在「我的」中查看新权限。'
  })

  return { name: target.name }
}

/**
 * 任命新部长：提升角色并指定部门。
 */
async function appointMinister(payload = {}, openid) {
  await requireChairman(openid)
  const studentNo = typeof payload.studentNo === 'string' ? payload.studentNo.trim() : ''
  const dept = typeof payload.dept === 'string' ? payload.dept : ''
  if (!DEPTS.includes(dept)) throw new BizError(40001, '请选择部门')

  const target = await findMember(studentNo)
  if (target.role === 'minister' && target.dept === dept) {
    throw new BizError(40008, '该成员已经是该部门部长')
  }

  await db
    .collection('members')
    .doc(target._id)
    .update({
      data: { role: 'minister', dept, updatedAt: db.serverDate() }
    })

  await notify(target._openid, {
    type: 'system',
    title: '任命通知',
    content: `你已被任命为${DEPT_LABEL[dept]}部长，可在「我的」中查看新权限。`
  })

  return { name: target.name, dept: DEPT_LABEL[dept] }
}

module.exports = { getSettings, archiveYear, appointChairman, appointMinister }
