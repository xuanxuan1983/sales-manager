const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const backupDir = path.resolve(rootDir, process.env.BACKUP_DIR || 'backups')

const formatBytes = bytes => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const isBackupFile = filename => (
  /^sales-manager-\d{8}-\d{6}\.db$/.test(filename) ||
  /^before-restore-\d{8}-\d{6}\.db$/.test(filename)
)

const main = () => {
  if (!fs.existsSync(backupDir)) {
    console.log(`暂无备份目录：${path.relative(rootDir, backupDir)}`)
    return
  }

  const backups = fs.readdirSync(backupDir)
    .filter(isBackupFile)
    .map(filename => {
      const fullPath = path.join(backupDir, filename)
      const stat = fs.statSync(fullPath)
      return {
        filename,
        fullPath,
        mtimeMs: stat.mtimeMs,
        mtime: stat.mtime,
        size: stat.size
      }
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs)

  if (backups.length === 0) {
    console.log(`暂无数据库备份：${path.relative(rootDir, backupDir)}`)
    return
  }

  console.log(`数据库备份列表：${path.relative(rootDir, backupDir)}`)
  backups.forEach((backup, index) => {
    const latest = index === 0 ? ' latest' : ''
    console.log(`${index + 1}. ${backup.filename}${latest}`)
    console.log(`   路径：${path.relative(rootDir, backup.fullPath)}`)
    console.log(`   时间：${backup.mtime.toISOString()}`)
    console.log(`   大小：${formatBytes(backup.size)}`)
  })
}

main()
