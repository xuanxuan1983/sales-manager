const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const targetPath = path.resolve(rootDir, process.env.DB_PATH || 'data/sales-manager.db')
const safetyBackupDir = path.resolve(rootDir, process.env.BACKUP_DIR || 'backups')
const sourceArg = process.argv[2] || process.env.RESTORE_FROM

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

const relative = filePath => path.relative(rootDir, filePath) || '.'

const assertSqliteDatabase = dbPath => {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`数据库文件不存在：${dbPath}`)
  }

  const stat = fs.statSync(dbPath)
  if (!stat.isFile()) {
    throw new Error(`数据库路径不是文件：${dbPath}`)
  }

  const db = new Database(dbPath, { readonly: true, fileMustExist: true })
  try {
    db.pragma('quick_check')
  } finally {
    db.close()
  }
}

const copyDatabase = async (fromPath, toPath) => {
  const db = new Database(fromPath, { readonly: true, fileMustExist: true })
  try {
    await db.backup(toPath)
  } finally {
    db.close()
  }
}

const removeWalSidecars = dbPath => {
  for (const suffix of ['-wal', '-shm']) {
    const sidecarPath = `${dbPath}${suffix}`
    if (fs.existsSync(sidecarPath)) {
      fs.rmSync(sidecarPath, { force: true })
    }
  }
}

const main = async () => {
  if (!sourceArg) {
    throw new Error('请指定要恢复的备份文件：npm run restore:db -- backups/sales-manager-YYYYMMDD-HHMMSS.db')
  }

  const sourcePath = path.resolve(rootDir, sourceArg)
  assertSqliteDatabase(sourcePath)

  fs.mkdirSync(path.dirname(targetPath), { recursive: true })
  fs.mkdirSync(safetyBackupDir, { recursive: true })

  let safetyBackupPath = null
  if (fs.existsSync(targetPath)) {
    assertSqliteDatabase(targetPath)
    safetyBackupPath = path.join(safetyBackupDir, `before-restore-${timestamp()}.db`)
    await copyDatabase(targetPath, safetyBackupPath)
  }

  const tempRestorePath = `${targetPath}.restore-${process.pid}.tmp`
  await copyDatabase(sourcePath, tempRestorePath)
  assertSqliteDatabase(tempRestorePath)

  removeWalSidecars(targetPath)
  fs.renameSync(tempRestorePath, targetPath)

  console.log(`数据库恢复完成：${relative(targetPath)}`)
  console.log(`恢复来源：${relative(sourcePath)}`)
  if (safetyBackupPath) {
    console.log(`恢复前自动备份：${relative(safetyBackupPath)}`)
  }
}

main().catch(error => {
  console.error(error.message || error)
  process.exit(1)
})
