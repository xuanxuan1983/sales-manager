const { spawnSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const Database = require('better-sqlite3')

const rootDir = path.resolve(__dirname, '..')
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sales-manager-db-roundtrip-'))
const dbPath = path.join(tempDir, 'data', 'sales-manager.db')
const backupDir = path.join(tempDir, 'backups')

const run = (command, args, env = {}) => {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    env: {
      ...process.env,
      DB_PATH: dbPath,
      BACKUP_DIR: backupDir,
      ...env
    },
    encoding: 'utf8'
  })

  if (result.status !== 0) {
    throw new Error([
      `${command} ${args.join(' ')} failed with ${result.status}`,
      result.stdout,
      result.stderr
    ].filter(Boolean).join('\n'))
  }

  return result.stdout.trim()
}

const getProjectCount = () => {
  const db = new Database(dbPath)
  try {
    return db.prepare('SELECT COUNT(*) AS count FROM collagen_projects').get().count
  } finally {
    db.close()
  }
}

const deleteProjects = () => {
  const db = new Database(dbPath)
  try {
    db.prepare('DELETE FROM collagen_projects').run()
  } finally {
    db.close()
  }
}

const main = () => {
  try {
    run(process.execPath, ['-e', "require('./server/database.cjs')"])

    const seededCount = getProjectCount()
    if (seededCount !== 6) {
      throw new Error(`expected 6 seeded collagen projects, got ${seededCount}`)
    }

    run(process.execPath, ['scripts/backup-db.cjs'])
    const backupFiles = fs.readdirSync(backupDir)
      .filter(file => /^sales-manager-\d{8}-\d{6}\.db$/.test(file))
      .sort()

    if (backupFiles.length !== 1) {
      throw new Error(`expected one timestamped backup, got ${backupFiles.length}`)
    }

    deleteProjects()
    const deletedCount = getProjectCount()
    if (deletedCount !== 0) {
      throw new Error(`expected delete to remove collagen projects, got ${deletedCount}`)
    }

    const backupPath = path.join(backupDir, backupFiles[0])
    run(process.execPath, ['scripts/restore-db.cjs', backupPath])

    const restoredCount = getProjectCount()
    if (restoredCount !== 6) {
      throw new Error(`expected restore to recover 6 collagen projects, got ${restoredCount}`)
    }

    const safetyBackups = fs.readdirSync(backupDir)
      .filter(file => /^before-restore-\d{8}-\d{6}\.db$/.test(file))

    if (safetyBackups.length !== 1) {
      throw new Error(`expected one before-restore safety backup, got ${safetyBackups.length}`)
    }

    console.log('db backup/restore smoke passed')
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

try {
  main()
} catch (error) {
  console.error(error.message || error)
  fs.rmSync(tempDir, { recursive: true, force: true })
  process.exit(1)
}
