const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const sourcePath = path.resolve(rootDir, process.env.DB_PATH || 'data/sales-manager.db')
const outputDir = path.resolve(rootDir, process.env.BACKUP_DIR || 'backups')

const pad = value => String(value).padStart(2, '0')

const timestamp = () => {
  const now = new Date()
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate())
  ].join('') + '-' + [
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join('')
}

const assertReadableDatabase = dbPath => {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`数据库文件不存在：${dbPath}`)
  }

  const stat = fs.statSync(dbPath)
  if (!stat.isFile()) {
    throw new Error(`数据库路径不是文件：${dbPath}`)
  }
}

const main = async () => {
  assertReadableDatabase(sourcePath)
  fs.mkdirSync(outputDir, { recursive: true })

  const backupPath = path.join(outputDir, `sales-manager-${timestamp()}.db`)
  const db = new Database(sourcePath, { readonly: true, fileMustExist: true })

  try {
    await db.backup(backupPath)
  } finally {
    db.close()
  }

  const sourceSize = fs.statSync(sourcePath).size
  const backupSize = fs.statSync(backupPath).size

  if (backupSize === 0) {
    throw new Error(`备份文件为空：${backupPath}`)
  }

  console.log(`数据库备份完成：${path.relative(rootDir, backupPath)}`)
  console.log(`源文件：${path.relative(rootDir, sourcePath)} (${sourceSize} bytes)`)
  console.log(`备份文件：${path.relative(rootDir, backupPath)} (${backupSize} bytes)`)
}

main().catch(error => {
  console.error(error.message || error)
  process.exit(1)
})
