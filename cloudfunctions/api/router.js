const { BizError } = require('./lib/errors')
const auth = require('./actions/auth')
const member = require('./actions/member')
const task = require('./actions/task')
const profile = require('./actions/profile')
const home = require('./actions/home')

const routes = {
  'auth.login': auth.login,
  'auth.register': auth.register,
  'member.list': member.list,
  'member.review': member.review,
  'task.create': task.create,
  'task.list': task.list,
  'task.detail': task.detail,
  'task.apply': task.apply,
  'task.cancelApply': task.cancelApply,
  'task.mine': task.mine,
  'profile.submit': profile.submit,
  'profile.mine': profile.mine,
  'profile.listPending': profile.listPending,
  'profile.review': profile.review,
  'home.summary': home.summary
}

async function route(action, payload, openid) {
  const handler = routes[action]
  if (!handler) throw new BizError(40400, '未知操作')
  return handler(payload, openid)
}

module.exports = { route, routes }
