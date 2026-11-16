const { BizError } = require('./lib/errors')
const auth = require('./actions/auth')
const member = require('./actions/member')
const home = require('./actions/home')

const routes = {
  'auth.login': auth.login,
  'auth.register': auth.register,
  'member.list': member.list,
  'member.review': member.review,
  'home.summary': home.summary
}

async function route(action, payload, openid) {
  const handler = routes[action]
  if (!handler) throw new BizError(40400, '未知操作')
  return handler(payload, openid)
}

module.exports = { route, routes }
