const { db } = require('../lib/db')
const { BizError } = require('../lib/errors')
const { getMemberByOpenid, toProfile } = require('../lib/member')
const { validateRegister } = require('../lib/validate')

const AVATAR_COLORS = ['#4F7691', '#8C79A6', '#5F8C77', '#B07E52', '#63799F']

function academicYearOf(date) {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}

function pickColor(seed) {
  let sum = 0
  for (let i = 0; i < seed.length; i += 1) sum += seed.charCodeAt(i)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

async function currentAcademicYear() {
  const res = await db.collection('configs').where({ key: 'currentAcademicYear' }).limit(1).get()
  if (res.data.length && typeof res.data[0].value === 'string') return res.data[0].value
  return academicYearOf(new Date())
}

async function login(payload, openid) {
  const member = await getMemberByOpenid(openid)
  if (!member) return { state: 'new' }
  return { state: member.status, member: toProfile(member) }
}

async function register(payload, openid) {
  const exists = await getMemberByOpenid(openid)
  if (exists) throw new BizError(40901, '你已提交过资料，请等待审核')

  const check = validateRegister(payload)
  if (!check.ok) throw new BizError(40001, check.message)

  const { name, studentNo, college, phone, dorm, dept } = check.data
  const dup = await db.collection('members').where({ studentNo }).limit(1).get()
  if (dup.data.length) throw new BizError(40902, '该学号已被注册')

  const year = await currentAcademicYear()
  const now = db.serverDate()

  await db.collection('members').add({
    data: {
      _openid: openid,
      name,
      studentNo,
      college,
      phone,
      dorm,
      dept,
      role: 'member',
      status: 'pending',
      academicYear: year,
      avatarText: name.slice(0, 1),
      avatarColor: pickColor(studentNo),
      joinedAt: null,
      lastActiveAt: now,
      createdAt: now,
      updatedAt: now
    }
  })

  return { state: 'pending' }
}

module.exports = { login, register, academicYearOf }
