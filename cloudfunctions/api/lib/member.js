const { db } = require('./db')
const { BizError } = require('./errors')

async function getMemberByOpenid(openid) {
  if (!openid) return null
  const res = await db.collection('members').where({ _openid: openid }).limit(1).get()
  return res.data[0] || null
}

function toProfile(member) {
  if (!member) return null
  return {
    _id: member._id,
    name: member.name,
    studentNo: member.studentNo,
    college: member.college,
    phone: member.phone,
    dorm: member.dorm,
    birthday: member.birthday || '',
    dept: member.dept,
    role: member.role,
    status: member.status,
    academicYear: member.academicYear,
    avatarText: member.avatarText,
    avatarColor: member.avatarColor,
    avatarFileID: member.avatarFileID || ''
  }
}

async function requireChairman(openid) {
  const me = await getMemberByOpenid(openid)
  if (!me || me.status !== 'active' || me.role !== 'chairman') {
    throw new BizError(40301, '仅主席可操作')
  }
  return me
}

module.exports = { getMemberByOpenid, toProfile, requireChairman }
