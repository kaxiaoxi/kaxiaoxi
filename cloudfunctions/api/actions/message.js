const { db } = require('../lib/db')
const { BizError } = require('../lib/errors')
const { getMemberByOpenid } = require('../lib/member')

async function requireActive(openid) {
  const me = await getMemberByOpenid(openid)
  if (!me || me.status !== 'active') throw new BizError(40301, '账号未激活')
  return me
}

async function list(payload = {}, openid) {
  await requireActive(openid)
  const where = { openid }
  if (payload.read === true) where.read = true
  if (payload.read === false) where.read = false

  const res = await db
    .collection('messages')
    .where(where)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get()
  return { list: res.data }
}

async function read(payload = {}, openid) {
  await requireActive(openid)
  const id = typeof payload.id === 'string' ? payload.id : ''

  if (id) {
    const res = await db
      .collection('messages')
      .doc(id)
      .get()
      .catch(() => null)
    if (!res || !res.data) throw new BizError(40401, '消息不存在')
    if (res.data.openid !== openid) throw new BizError(40301, '无权操作')
    await db
      .collection('messages')
      .doc(id)
      .update({ data: { read: true } })
    return { read: 1 }
  }

  const res = await db.collection('messages').where({ openid, read: false }).limit(100).get()
  await Promise.all(
    res.data.map((item) =>
      db
        .collection('messages')
        .doc(item._id)
        .update({ data: { read: true } })
    )
  )
  return { read: res.data.length }
}

async function unread(payload = {}, openid) {
  await requireActive(openid)
  const res = await db.collection('messages').where({ openid, read: false }).count()
  return { count: res.total || 0 }
}

module.exports = { list, read, unread }
