const { call } = require('../services/api')

/**
 * 订阅消息模板统一由云函数从 configs 表读取（subscribe.templates），
 * 这里缓存一份，避免每个页面都问一次。
 * 键名与后端一致：activity（活动开始）/ todo（待办截止）/ feedback（意见反馈）。
 */
let cache = null

async function loadTemplates() {
  if (cache) return cache
  try {
    const res = await call('subscribe.templates', {})
    cache = res || {}
  } catch (err) {
    console.warn('[remind] 模板读取失败', err)
    cache = {}
  }
  return cache
}

function templateOf(kind) {
  return (cache && cache[kind]) || ''
}

/**
 * 发起订阅授权。
 * 必须由 tap 事件同步调用：requestSubscribeMessage 只认用户点击上下文。
 * 模板没配置时直接回调 false，不打断原有流程。
 */
function requestSubscribe(kind, done) {
  const tmplId = templateOf(kind)
  if (!tmplId) {
    done(false)
    return
  }
  wx.requestSubscribeMessage({
    tmplIds: [tmplId],
    success: (res) => done(res[tmplId] === 'accept'),
    fail: () => done(false)
  })
}

module.exports = { loadTemplates, templateOf, requestSubscribe }
