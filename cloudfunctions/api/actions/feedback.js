const { db } = require('../lib/db')
const { BizError } = require('../lib/errors')
const { getMemberByOpenid } = require('../lib/member')
const { notify } = require('../lib/notify')

async function submit(payload = {}, openid) {
  const me = await getMemberByOpenid(openid)
  if (!me || me.status !== 'active') throw new BizError(40301, '账号未激活')

  const content = typeof payload.content === 'string' ? payload.content.trim().slice(0, 500) : ''
  const contact = typeof payload.contact === 'string' ? payload.contact.trim().slice(0, 50) : ''
  if (content.length < 5) throw new BizError(40001, '反馈内容至少 5 个字')

  const chairRes = await db
    .collection('members')
    .where({ role: 'chairman', status: 'active' })
    .limit(20)
    .get()

  await Promise.all(
    chairRes.data.map((chair) =>
      notify(chair._openid, {
        type: 'feedback',
        title: `意见反馈 · ${me.name}`,
        content: contact ? `${content}\n联系方式：${contact}` : content
      })
    )
  )

  return { count: chairRes.data.length }
}

module.exports = { submit }
