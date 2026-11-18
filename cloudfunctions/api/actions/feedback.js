const { db } = require('../lib/db')
const { BizError } = require('../lib/errors')
const { getMemberByOpenid } = require('../lib/member')
const { notify } = require('../lib/notify')

async function readConfig(key) {
  const res = await db.collection('configs').where({ key }).limit(1).get()
  return res.data.length ? res.data[0].value : ''
}

/**
 * 意见反馈走站内消息：写入接收人的消息中心，不依赖订阅消息额度。
 * 接收人：configs.ownerOpenid；未配置时退回第一位在任主席。
 */
async function submit(payload = {}, openid) {
  const me = await getMemberByOpenid(openid)
  if (!me || me.status !== 'active') throw new BizError(40301, '账号未激活')

  const content = typeof payload.content === 'string' ? payload.content.trim().slice(0, 500) : ''
  if (!content) throw new BizError(40001, '请填写反馈内容')

  let recipient = await readConfig('ownerOpenid')
  if (!recipient) {
    const chairRes = await db
      .collection('members')
      .where({ role: 'chairman', status: 'active' })
      .orderBy('createdAt', 'asc')
      .limit(1)
      .get()
    recipient = chairRes.data.length ? chairRes.data[0]._openid : ''
  }

  if (!recipient) throw new BizError(50001, '暂未配置反馈接收人')

  await notify(recipient, {
    type: 'feedback',
    title: `意见反馈 · ${me.name}`,
    content
  })

  return { delivered: true }
}

module.exports = { submit }
