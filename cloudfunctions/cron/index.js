const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

/**
 * 定时任务入口。triggers 在 config.json 中配置，默认留空，需在云开发控制台确认后启用。
 */
exports.main = async () => {
  console.info('[cron] tick', new Date().toISOString())
  return { code: 0 }
}
