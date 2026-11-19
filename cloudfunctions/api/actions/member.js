const { db } = require('../lib/db')
const { BizError } = require('../lib/errors')
const { toProfile, requireChairman, getMemberByOpenid } = require('../lib/member')
const { notify } = require('../lib/notify')

const REVIEW_STATUS = {
  approve: 'active',
  reject: 'rejected'
}

async function closeReviewTodos(memberId) {
  try {
    const res = await db
      .collection('todos')
      .where({ sourceMemberId: memberId, done: false, deleted: false })
      .limit(20)
      .get()
    await Promise.all(
      res.data.map((todo) =>
        db
          .collection('todos')
          .doc(todo._id)
          .update({
            data: { done: true, completedAt: db.serverDate(), updatedAt: db.serverDate() }
          })
      )
    )
  } catch (err) {
    console.warn('[member] 关闭审核待办失败', err)
  }
}

async function requireActive(openid) {
  const me = await getMemberByOpenid(openid)
  if (!me || me.status !== 'active') throw new BizError(40301, '账号未激活')
  return me
}
async function review(payload = {}, openid) {
  const me = await requireChairman(openid)
  const memberId = typeof payload.memberId === 'string' ? payload.memberId : ''
  const status = REVIEW_STATUS[payload.action]

  if (!memberId) throw new BizError(40001, '缺少成员 ID')
  if (!status) throw new BizError(40001, '审核动作不合法')
  if (memberId === me._id) throw new BizError(40003, '不能审核自己')

  const res = await db
    .collection('members')
    .doc(memberId)
    .get()
    .catch(() => null)
  if (!res || !res.data) throw new BizError(40401, '成员不存在')
  if (res.data.status !== 'pending') throw new BizError(40903, '该成员不在待审核状态')

  const now = db.serverDate()
  const data = {
    status,
    reviewedBy: openid,
    reviewedAt: now,
    updatedAt: now
  }
  if (status === 'active') data.joinedAt = now

  await db.collection('members').doc(memberId).update({ data })
  await closeReviewTodos(memberId)

  await notify(res.data._openid, {
    type: 'system',
    title: status === 'active' ? '入会申请已通过' : '入会申请未通过',
    content:
      status === 'active'
        ? '欢迎加入影协，现在可以报名任务了。'
        : '你的入会申请未通过，如有疑问请联系主席。'
  })

  return { status }
}

async function list(payload = {}, openid) {
  await requireChairman(openid)
  const status = typeof payload.status === 'string' ? payload.status : 'pending'
  const res = await db
    .collection('members')
    .where({ status })
    .orderBy('createdAt', 'asc')
    .limit(100)
    .get()
  return { list: res.data.map(toProfile), total: res.data.length }
}

/**
 * 选人用的成员清单：年历的主/副负责人、待办的主责人都要用。
 * 权限：仅部长与主席；只返回 openid / 姓名 / 部门 / 角色，不返回学号电话。
 */
async function options(payload = {}, openid) {
  const me = await requireActive(openid)
  if (me.role === 'member') throw new BizError(40301, '仅部长或主席可选择负责人')

  const res = await db.collection('members').where({ status: 'active' }).limit(100).get()

  // 不在数据库层排序，避免依赖 name 索引
  const list = (res.data || [])
    .map((member) => ({
      openid: member._openid,
      name: member.name,
      dept: member.dept,
      role: member.role
    }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'zh'))

  return { list }
}

module.exports = { review, list, options }
