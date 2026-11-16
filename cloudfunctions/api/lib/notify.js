const { db } = require('./db')

/**
 * 写一条站内消息，失败不影响主流程。
 */
async function notify(openid, payload = {}) {
  if (!openid) return
  try {
    await db.collection('messages').add({
      data: {
        openid,
        type: payload.type || 'system',
        title: payload.title || '通知',
        content: payload.content || '',
        refType: payload.refType || '',
        refId: payload.refId || '',
        read: false,
        createdAt: db.serverDate()
      }
    })
  } catch (err) {
    console.warn('[notify] failed', openid, err)
  }
}

module.exports = { notify }
