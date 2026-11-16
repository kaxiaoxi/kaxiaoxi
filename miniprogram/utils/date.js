function pad(n) {
  return n < 10 ? `0${n}` : `${n}`
}

/**
 * 格式化日期。默认输出 2026-11-21 09:00
 */
function formatDate(input, withTime = true) {
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return ''
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  if (!withTime) return date
  return `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

module.exports = {
  formatDate
}
