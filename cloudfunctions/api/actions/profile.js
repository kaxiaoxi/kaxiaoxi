const { db, cloud } = require('../lib/db')
const { BizError } = require('../lib/errors')
const { getMemberByOpenid, requireChairman } = require('../lib/member')
const { notify } = require('../lib/notify')

const PHONE_RE = /^1[3-9]\d{9}$/
const DORM_RE = /^[东西][一二三四五六七八九十]+[0-9]{3,4}$/
const BIRTHDAY_RE = /^\d{4}-\d{2}-\d{2}$/

function text(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

/**
 * 提交资料修改申请：只记录变更项，等主席审批后才写入 members。
 */
async function submit(payload = {}, openid) {
  const me = await getMemberByOpenid(openid)
  if (!me || me.status !== 'active') throw new BizError(40301, '账号未激活')

  const phone = text(payload.phone, 11)
  const dorm = text(payload.dorm, 15)
  const birthday = text(payload.birthday, 10)
  const reason = text(payload.reason, 200)

  const changes = {}
  if (phone && phone !== me.phone) {
    if (!PHONE_RE.test(phone)) throw new BizError(40001, '手机号格式不正确')
    changes.phone = { from: me.phone || '', to: phone }
  }
  if (dorm && dorm !== me.dorm) {
    if (!DORM_RE.test(dorm)) throw new BizError(40001, '宿舍号格式如 东一636')
    changes.dorm = { from: me.dorm || '', to: dorm }
  }
  if (birthday && birthday !== me.birthday) {
    if (!BIRTHDAY_RE.test(birthday)) throw new BizError(40001, '生日格式不正确')
    changes.birthday = { from: me.birthday || '', to: birthday }
  }

  if (!Object.keys(changes).length) throw new BizError(40020, '没有需要修改的内容')
  if (!reason) throw new BizError(40021, '请填写修改理由')

  const pending = await db
    .collection('profile_requests')
    .where({ openid, status: 'pending' })
    .limit(1)
    .get()
  if (pending.data.length) throw new BizError(40906, '你已有一条待审核的修改申请')

  await db.collection('profile_requests').add({
    data: {
      openid,
      memberId: me._id,
      name: me.name,
      changes,
      reason,
      status: 'pending',
      reviewedBy: '',
      reviewedAt: null,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    }
  })

  return { status: 'pending' }
}

async function mine(payload = {}, openid) {
  const res = await db
    .collection('profile_requests')
    .where({ openid })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()
  return { request: res.data[0] || null }
}

async function listPending(payload = {}, openid) {
  await requireChairman(openid)
  const res = await db
    .collection('profile_requests')
    .where({ status: 'pending' })
    .orderBy('createdAt', 'asc')
    .limit(100)
    .get()
  return { list: res.data }
}

async function review(payload = {}, openid) {
  await requireChairman(openid)

  const requestId = typeof payload.requestId === 'string' ? payload.requestId : ''
  const action = payload.action
  if (!requestId) throw new BizError(40001, '缺少申请 ID')
  if (action !== 'approve' && action !== 'reject') throw new BizError(40001, '审批动作不合法')

  const res = await db
    .collection('profile_requests')
    .doc(requestId)
    .get()
    .catch(() => null)
  if (!res || !res.data) throw new BizError(40401, '申请不存在')
  const request = res.data
  if (request.status !== 'pending') throw new BizError(40907, '该申请已处理')

  if (action === 'approve') {
    const changes = request.changes || {}
    const data = {}
    Object.keys(changes).forEach((key) => {
      data[key] = changes[key].to
    })
    data.updatedAt = db.serverDate()
    await db.collection('members').doc(request.memberId).update({ data })
  }

  await db
    .collection('profile_requests')
    .doc(requestId)
    .update({
      data: {
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewedBy: openid,
        reviewedAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    })

  await notify(request.openid, {
    type: 'system',
    title: action === 'approve' ? '资料修改已通过' : '资料修改被拒绝',
    content:
      action === 'approve'
        ? '你提交的资料修改已通过，已更新到个人资料。'
        : '你提交的资料修改未通过，如有疑问请联系主席。'
  })

  return { status: action }
}

/**
 * 更新微信头像：客户端先上传到云存储，再把 fileID 写回成员记录。
 */
async function updateAvatar(payload = {}, openid) {
  const me = await getMemberByOpenid(openid)
  if (!me || me.status !== 'active') throw new BizError(40301, '账号未激活')

  const fileID = text(payload.fileID, 300)
  if (!fileID.startsWith('cloud://')) throw new BizError(40001, '头像文件不合法')

  if (me.avatarFileID && me.avatarFileID !== fileID) {
    try {
      await cloud.deleteFile({ fileList: [me.avatarFileID] })
    } catch (err) {
      console.warn('[profile] 删除旧头像失败', err)
    }
  }

  await db
    .collection('members')
    .doc(me._id)
    .update({ data: { avatarFileID: fileID, updatedAt: db.serverDate() } })

  return { avatarFileID: fileID }
}

module.exports = { submit, mine, listPending, review, updateAvatar }
