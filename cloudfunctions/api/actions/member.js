const { db } = require('../lib/db')
const { BizError } = require('../lib/errors')
const { toProfile, requireChairman } = require('../lib/member')

const REVIEW_STATUS = {
  approve: 'active',
  reject: 'rejected'
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
