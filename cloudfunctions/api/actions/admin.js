const { db } = require('../lib/db')
const { BizError } = require('../lib/errors')
const { getMemberByOpenid, requireChairman } = require('../lib/member')

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

async function transferChairman(payload = {}, openid) {
  const me = await requireChairman(openid)
  const studentNo = typeof payload.studentNo === 'string' ? payload.studentNo.trim() : ''
  if (!/^\d{10}$/.test(studentNo)) throw new BizError(40001, '请填写 10 位学号')

  const res = await db.collection('members').where({ studentNo }).limit(1).get()
  if (!res.data.length) throw new BizError(40401, '未找到该学号')
  const target = res.data[0]
  if (target.status !== 'active') throw new BizError(40009, '该成员未激活')
  if (target._openid === me._openid) throw new BizError(40008, '不能移交给自己')

  await db
    .collection('members')
    .doc(target._id)
    .update({ data: { role: 'chairman' } })
  await db
    .collection('members')
    .doc(me._id)
    .update({ data: { role: 'minister' } })
  await writeConfig('chairmanOpenid', target._openid)

  return { name: target.name }
}

module.exports = { getSettings, archiveYear, transferChairman }
