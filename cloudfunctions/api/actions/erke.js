const { db, _ } = require('../lib/db')
const { BizError } = require('../lib/errors')
const { getMemberByOpenid } = require('../lib/member')

async function requireActive(openid) {
  const me = await getMemberByOpenid(openid)
  if (!me || me.status !== 'active') throw new BizError(40301, '账号未激活')
  return me
}

async function currentYear() {
  const res = await db.collection('configs').where({ key: 'currentAcademicYear' }).limit(1).get()
  if (res.data.length && typeof res.data[0].value === 'string') return res.data[0].value
  const now = new Date()
  const y = now.getFullYear()
  return now.getMonth() + 1 >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`
}

async function pageAll(build) {
  const out = []
  let skip = 0
  while (out.length < 1000) {
    const res = await build().skip(skip).limit(100).get()
    out.push(...res.data)
    if (res.data.length < 100) break
    skip += 100
  }
  return out
}

async function fetchTasks(year, dept) {
  const where = {
    academicYear: year,
    published: true,
    cancelledAt: _.exists(false),
    endAt: _.lte(new Date()),
    erkeHours: _.gt(0)
  }
  if (dept) where.publisherDept = dept

  return pageAll(() => db.collection('tasks').where(where).orderBy('startAt', 'asc'))
}

async function mine(payload = {}, openid) {
  const me = await requireActive(openid)
  const year = typeof payload.year === 'string' && payload.year ? payload.year : await currentYear()

  const signups = await pageAll(() =>
    db
      .collection('task_signups')
      .where({ openid, status: _.in(['approved', 'leave_pending']) })
      .orderBy('createdAt', 'asc')
  )
  if (!signups.length) return { year, total: 0, list: [] }

  const ids = signups.map((item) => item.taskId)
  const tasks = await pageAll(() =>
    db
      .collection('tasks')
      .where({
        _id: _.in(ids),
        academicYear: year,
        published: true,
        cancelledAt: _.exists(false),
        endAt: _.lte(new Date()),
        erkeHours: _.gt(0)
      })
      .orderBy('startAt', 'asc')
  )

  const list = tasks.map((task) => ({
    taskId: task._id,
    title: task.title,
    hours: task.erkeHours,
    startAt: task.startAt
  }))
  const total = list.reduce((sum, item) => sum + item.hours, 0)

  return { year, total, list, member: me.name }
}

async function summary(payload = {}, openid) {
  const me = await requireActive(openid)
  if (me.role === 'member') throw new BizError(40301, '仅部长或主席可查看汇总')

  const year = typeof payload.year === 'string' && payload.year ? payload.year : await currentYear()
  const dept = me.role === 'chairman' ? '' : me.dept
  const tasks = await fetchTasks(year, dept)

  if (!tasks.length) return { year, list: [], total: 0 }

  const taskMap = {}
  tasks.forEach((task) => {
    taskMap[task._id] = task
  })

  const signups = await pageAll(() =>
    db
      .collection('task_signups')
      .where({ taskId: _.in(tasks.map((t) => t._id)), status: _.in(['approved', 'leave_pending']) })
      .orderBy('createdAt', 'asc')
  )

  const hoursMap = {}
  signups.forEach((signup) => {
    const task = taskMap[signup.taskId]
    if (!task) return
    hoursMap[signup.openid] = (hoursMap[signup.openid] || 0) + task.erkeHours
  })

  const openids = Object.keys(hoursMap)
  if (!openids.length) return { year, list: [], total: 0 }

  const members = await pageAll(() => db.collection('members').where({ _openid: _.in(openids) }))
  const list = members
    .map((member) => ({
      name: member.name,
      studentNo: member.studentNo,
      college: member.college,
      hours: hoursMap[member._openid] || 0
    }))
    .sort((a, b) => b.hours - a.hours)

  const total = list.reduce((sum, item) => sum + item.hours, 0)
  return { year, list, total }
}

async function exportCsv(payload = {}, openid) {
  const res = await summary(payload, openid)
  const lines = ['姓名,学号,学院,总时长']
  res.list.forEach((item) => {
    lines.push(`${item.name},${item.studentNo},${item.college},${item.hours}`)
  })
  return { year: res.year, csv: lines.join('\n'), count: res.list.length }
}

module.exports = { mine, summary, exportCsv, currentYear }
