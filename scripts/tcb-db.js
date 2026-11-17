#!/usr/bin/env node
/**
 * 只读数据库查询工具（封装 tcb CLI），供人或 AI 在本地排查数据。
 * 用法：
 *   node scripts/tcb-db.js count members
 *   node scripts/tcb-db.js count members '{"status":"active"}'
 *   node scripts/tcb-db.js find members '{"status":"active"}' 5
 *   node scripts/tcb-db.js raw '[{"TableName":"tasks","CommandType":"COMMAND","Command":"{\"find\":\"tasks\",\"limit\":2}"}]'
 *
 * 仅允许 find / count / aggregate / distinct / listCollections 这类只读命令。
 */
const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ENV_ID = process.env.TCB_ENV_ID || 'gdutpa-d4g3obr8ff2930036'
const READONLY = new Set(['find', 'count', 'aggregate', 'distinct', 'listCollections'])

function resolveBin() {
  const candidates = [
    path.join(process.env.APPDATA || '', 'npm', 'node_modules', '@cloudbase', 'cli', 'bin', 'tcb'),
    path.join(process.env.HOME || '', '.npm-global', 'node_modules', '@cloudbase', 'cli', 'bin', 'tcb')
  ]
  return candidates.find((item) => item && fs.existsSync(item))
}

function plain(value) {
  if (Array.isArray(value)) return value.map(plain)
  if (value && typeof value === 'object') {
    if ('$numberInt' in value) return Number(value.$numberInt)
    if ('$numberDouble' in value) return Number(value.$numberDouble)
    if ('$numberLong' in value) return Number(value.$numberLong)
    if ('$oid' in value) return value.$oid
    if ('$date' in value) {
      const inner = value.$date
      if (inner && typeof inner === 'object' && '$numberLong' in inner) {
        return Number(inner.$numberLong)
      }
      return plain(inner)
    }
    if ('$binary' in value) return '[binary]'
    if ('$timestamp' in value) return value.$timestamp.t
    const out = {}
    Object.keys(value).forEach((key) => {
      if (key === '$clusterTime' || key === 'operationTime' || key === 'signature') return
      out[key] = plain(value[key])
    })
    return out
  }
  return value
}

function run(commands) {
  const bin = resolveBin()
  if (!bin) {
    throw new Error('未找到 tcb CLI，请先执行 npm i -g @cloudbase/cli')
  }

  const res = spawnSync(
    process.execPath,
    [bin, 'db', 'nosql', 'execute', '-e', ENV_ID, '--command', JSON.stringify(commands)],
    { encoding: 'utf8' }
  )
  if (res.status !== 0) {
    throw new Error((res.stderr || res.stdout || '').slice(-800))
  }

  const text = res.stdout || ''
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start === -1 || end === -1) {
    throw new Error(`返回无法解析：${text.slice(-300)}`)
  }
  return plain(JSON.parse(text.slice(start, end + 1)))
}

function coerce(value) {
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'null') return null
  if (value !== '' && !Number.isNaN(Number(value))) return Number(value)
  return value
}

function toQuery(raw) {
  if (!raw) return {}
  const text = raw.trim()
  if (text.startsWith('{')) {
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch (err) {
      throw new Error(`过滤器不是合法 JSON：${raw}`)
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('过滤器必须是 JSON 对象，例如 {"status":"active"}')
    }
    return parsed
  }
  const query = {}
  text.split('&').forEach((pair) => {
    const index = pair.indexOf('=')
    if (index === -1) throw new Error(`过滤器格式应为 key=value：${pair}`)
    query[pair.slice(0, index)] = coerce(pair.slice(index + 1))
  })
  return query
}

function assertReadonly(commands) {
  commands.forEach((item) => {
    if (item.CommandType !== 'COMMAND') {
      throw new Error('只允许只读命令（CommandType=COMMAND）')
    }
    const body = JSON.parse(item.Command || '{}')
    const op = Object.keys(body)[0]
    if (!READONLY.has(op)) {
      throw new Error(`命令 ${op} 不在只读白名单：${[...READONLY].join(', ')}`)
    }
  })
}

function main() {
  const [cmd, collection, arg1, arg2] = process.argv.slice(2)
  if (!cmd || cmd === '--help' || cmd === '-h') {
    console.log(
      [
        '用法：',
        '  node scripts/tcb-db.js count <collection> [filterJson]',
        '  node scripts/tcb-db.js find <collection> [filterJson] [limit]',
        '  node scripts/tcb-db.js raw <commandsJson>',
        '',
        `环境：${ENV_ID}（可用 TCB_ENV_ID 覆盖）`
      ].join('\n')
    )
    return
  }

  let commands

  if (cmd === 'count') {
    if (!collection) throw new Error('缺少 collection')
    commands = [
      {
        TableName: collection,
        CommandType: 'COMMAND',
        Command: JSON.stringify({ count: collection, query: toQuery(arg1) })
      }
    ]
  } else if (cmd === 'find') {
    if (!collection) throw new Error('缺少 collection')
    commands = [
      {
        TableName: collection,
        CommandType: 'COMMAND',
        Command: JSON.stringify({
          find: collection,
          filter: toQuery(arg1),
          limit: Number(arg2) || 20
        })
      }
    ]
  } else if (cmd === 'raw') {
    const parsed = JSON.parse(collection || '[]')
    assertReadonly(parsed)
    commands = parsed
  } else {
    throw new Error(`未知命令：${cmd}`)
  }

  const result = run(commands)
  console.log(JSON.stringify(result, null, 2))
}

if (require.main === module) {
  try {
    main()
  } catch (err) {
    console.error(`[tcb-db] ${err.message}`)
    process.exitCode = 1
  }
}

module.exports = { plain, run, toQuery }
