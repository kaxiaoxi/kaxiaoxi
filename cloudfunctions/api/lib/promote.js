const { db, _ } = require('./db')
const { notify } = require('./notify')

/**
 * 把候补队列第一位转正。
 * 云开发事务不支持 where 查询，这里用「先改状态、再改计数」的补偿方式，
 * 并通过 updated 数量避免重复转正；每日对账兜底。
 */
async function promoteNext(taskId) {
  const res = await db
    .collection('task_signups')
    .where({ taskId, status: 'waitlisted' })
    .orderBy('queueNo', 'asc')
    .limit(1)
    .get()

  if (!res.data.length) return null

  const next = res.data[0]
  const updated = await db
    .collection('task_signups')
    .doc(next._id)
    .update({ data: { status: 'approved', updatedAt: db.serverDate() } })

  if (!updated.stats || updated.stats.updated === 0) return null

  await db
    .collection('tasks')
    .doc(taskId)
    .update({ data: { approvedCount: _.inc(1), waitlistCount: _.inc(-1) } })

  const taskRes = await db
    .collection('tasks')
    .doc(taskId)
    .get()
    .catch(() => null)
  const title = taskRes && taskRes.data ? taskRes.data.title : '活动'
  await notify(next._openid, {
    type: 'signup',
    title: '候补转正',
    content: `有人退出，「${title}」你已递补成功，请按时参加。`,
    refType: 'task',
    refId: taskId
  })

  return next._openid
}

module.exports = { promoteNext }
