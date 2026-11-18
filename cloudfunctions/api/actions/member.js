const { db } = require('../lib/db')
const { BizError } = require('../lib/errors')
const { toProfile, requireChairman } = require('../lib/member')
const { notify } = require('../lib/notify')

const REVIEW_STATUS = {
  approve: 'active',
  reject: 'rejected'
}

async function closeReviewTodos(memberId) {
  try {
    const res = await db
      .collection('todos')
      .where({ sourceMemberId: memberId, status: 'todo' })
      .limit(20)
      .get()
    await Promise.all(
      res.data.map((todo) =>
        db
          .collection('todos')
          .doc(todo._id)
          .update({
            data: { status: 'done', completedAt: db.serverDate(), updatedAt: db.serverDate() }
          })
      )
    )
  } catch (err) {
    console.warn('[member] 关闭审核待办失败', err)
  }
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

module.exports = { review, list }
