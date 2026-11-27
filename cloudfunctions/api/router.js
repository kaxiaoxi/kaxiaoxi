const { BizError } = require('./lib/errors')
const auth = require('./actions/auth')
const member = require('./actions/member')
const task = require('./actions/task')
const signup = require('./actions/signup')
const profile = require('./actions/profile')
const calendar = require('./actions/calendar')
const todo = require('./actions/todo')
const message = require('./actions/message')
const erke = require('./actions/erke')
const admin = require('./actions/admin')
const subscribe = require('./actions/subscribe')
const home = require('./actions/home')

const routes = {
  'auth.login': auth.login,
  'auth.register': auth.register,
  'member.list': member.list,
  'member.review': member.review,
  'member.options': member.options,
  'task.create': task.create,
  'task.list': task.list,
  'task.detail': task.detail,
  'task.apply': task.apply,
  'task.mine': task.mine,
  'signup.list': signup.list,
  'signup.review': signup.review,
  'signup.requestLeave': signup.requestLeave,
  'signup.reviewLeave': signup.reviewLeave,
  'signup.remove': signup.remove,
  'calendar.month': calendar.month,
  'calendar.list': calendar.list,
  'calendar.detail': calendar.detail,
  'calendar.save': calendar.save,
  'calendar.remove': calendar.remove,
  'todo.list': todo.list,
  'todo.detail': todo.detail,
  'todo.save': todo.save,
  'todo.complete': todo.complete,
  'todo.remove': todo.remove,
  'todo.join': todo.join,
  'todo.quit': todo.quit,
  'message.list': message.list,
  'message.read': message.read,
  'message.unread': message.unread,
  'erke.mine': erke.mine,
  'erke.summary': erke.summary,
  'erke.export': erke.exportCsv,
  'admin.getSettings': admin.getSettings,
  'admin.archiveYear': admin.archiveYear,
  'admin.appointChairman': admin.appointChairman,
  'admin.appointMinister': admin.appointMinister,
  'profile.mine': profile.mine,
  'profile.listPending': profile.listPending,
  'profile.review': profile.review,
  'subscribe.templates': subscribe.templates,
  'reminder.create': subscribe.createReminder,
  'reminder.createTodo': subscribe.createTodoReminder,
  'reminder.status': subscribe.reminderStatus,
  'home.summary': home.summary
}

async function route(action, payload, openid) {
  const handler = routes[action]
  if (!handler) throw new BizError(40400, '未知操作')
  return handler(payload, openid)
}

module.exports = { route, routes }
