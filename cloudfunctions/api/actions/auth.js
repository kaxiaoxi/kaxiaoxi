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

async function createReviewTodos(memberId, member, applicantOpenid) {
  try {
    const chairRes = await db
      .collection('members')
      .where({ role: 'chairman', status: 'active' })
      .limit(20)
      .get()
    if (!chairRes.data.length) return

    const now = db.serverDate()
    await Promise.all(
      chairRes.data.map((chair) =>
        db.collection('todos').add({
          data: {
            title: `审核新成员：${member.name}`,
            description: `${member.studentNo} · ${member.college || '未填学院'}`,
            scope: 'personal',
            dept: '',
            ownerOpenid: chair._openid,
            creatorOpenid: applicantOpenid,
            priority: 3,
            dueAt: null,
            status: 'todo',
            source: 'member',
            sourceTaskId: '',
            sourceMemberId: memberId,
            autoRule: 'review_member',
            completedAt: null,
            createdAt: now,
            updatedAt: now
          }
        })
      )
    )
  } catch (err) {
    console.warn('[auth] 审核待办创建失败', err)
  }
}
async function login(payload, openid) {
  const member = await getMemberByOpenid(openid)
  if (!member) return { state: 'new' }
  return { state: member.status, member: toProfile(member) }
}

/**
 * 注册 / 认领：
 * 1. openid 已有记录 -> 报错；
 * 2. 学号已存在且没有 openid（预导入的部长/主席）-> 绑定 openid 并激活；
 * 3. 否则新建 pending 记录。
 */
async function register(payload, openid) {
  const exists = await getMemberByOpenid(openid)
  if (exists) throw new BizError(40901, '你已提交过资料，请等待审核')

  const check = validateRegister(payload)
  if (!check.ok) throw new BizError(40001, check.message)

  const { name, studentNo, college, phone, dorm, dept, birthday } = check.data
  const dup = await db.collection('members').where({ studentNo }).limit(1).get()

  if (dup.data.length) {
    const target = dup.data[0]
    if (target._openid) throw new BizError(40902, '该学号已被注册')
    if (target.name !== name) throw new BizError(40905, '姓名与学号不匹配，请联系主席')

    const now = db.serverDate()
    await db
      .collection('members')
      .doc(target._id)
      .update({
        data: {
          _openid: openid,
          college: target.college || college,
          dept: dept || target.dept || '',
          phone,
          dorm,
          birthday: birthday || target.birthday || '',
          status: target.status === 'active' ? 'active' : 'pending',
          joinedAt: target.joinedAt || now,
          lastActiveAt: now,
          updatedAt: now
        }
      })

    if (target.status !== 'active') {
      await createReviewTodos(target._id, { name, studentNo, college }, openid)
    }

    return { state: target.status === 'active' ? 'active' : 'pending' }
  }

  const year = await currentAcademicYear()
  const now = db.serverDate()

  const created = await db.collection('members').add({
    data: {
      _openid: openid,
      name,
      studentNo,
      college,
      phone,
      dorm,
      dept,
      birthday: birthday || '',
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

  await createReviewTodos(created._id, { name, studentNo, college }, openid)

  return { state: 'pending' }
}

module.exports = { login, register, academicYearOf }
