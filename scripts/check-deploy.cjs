const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')

const failures = []

const pass = message => {
  console.log(`✓ ${message}`)
}

const fail = message => {
  failures.push(message)
  console.error(`✗ ${message}`)
}

const readText = relativePath => fs.readFileSync(path.join(rootDir, relativePath), 'utf8')

const checkPackageScripts = () => {
  const pkg = JSON.parse(readText('package.json'))
  const requiredScripts = [
    'build',
    'api',
    'backup:db',
    'restore:db',
    'check:deploy',
    'check:local',
    'test:collagen-api',
    'test:db-backup-restore',
    'test:local-stack'
  ]
  const missing = requiredScripts.filter(script => !pkg.scripts?.[script])

  if (missing.length > 0) {
    fail(`package.json 缺少脚本：${missing.join(', ')}`)
    return
  }

  pass('package.json 部署与验证脚本齐全')
}

const checkVercelConfig = () => {
  const config = JSON.parse(readText('vercel.json'))
  const rewrites = Array.isArray(config.rewrites) ? config.rewrites : []
  const spaRewrite = rewrites.find(rewrite => rewrite.destination === '/index.html')

  if (config.buildCommand !== 'npm run build') {
    fail('vercel.json buildCommand 应为 npm run build')
  } else {
    pass('Vercel buildCommand 正确')
  }

  if (config.outputDirectory !== 'dist') {
    fail('vercel.json outputDirectory 应为 dist')
  } else {
    pass('Vercel outputDirectory 正确')
  }

  if (!spaRewrite) {
    fail('vercel.json 缺少 SPA fallback rewrite')
    return
  }

  if (!spaRewrite.source.includes('api/')) {
    fail('Vercel SPA fallback 未显式排除 /api/*')
    return
  }

  pass('Vercel SPA fallback 已排除 /api/*')
}

const checkProductionEnv = () => {
  const envPath = path.join(rootDir, '.env.production')

  if (!fs.existsSync(envPath)) {
    fail('.env.production 不存在')
    return
  }

  const activeLines = fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))

  const activeApiBase = activeLines.find(line => line.startsWith('VITE_API_BASE_URL='))

  if (activeApiBase) {
    fail('.env.production 不应提交激活的 VITE_API_BASE_URL，请在部署平台配置真实地址')
    return
  }

  pass('.env.production 未提交激活的生产 API 地址')
}

const walkFiles = dir => {
  if (!fs.existsSync(dir)) return []

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath))
    } else if (entry.isFile()) {
      files.push(fullPath)
    }
  }

  return files
}

const checkDistOutput = () => {
  const distDir = path.join(rootDir, 'dist')

  if (!fs.existsSync(distDir)) {
    fail('dist 不存在，请先运行 npm run build')
    return
  }

  const blockedTerms = [
    'your-api.example.com',
    '你的后端地址',
    'sales-manager-api.railway.app'
  ]

  const textFiles = walkFiles(distDir).filter(file => /\.(html|js|css|json|txt|map)$/i.test(file))
  const offenders = []

  for (const file of textFiles) {
    const content = fs.readFileSync(file, 'utf8')
    const term = blockedTerms.find(blockedTerm => content.includes(blockedTerm))

    if (term) {
      offenders.push(`${path.relative(rootDir, file)} 包含 ${term}`)
    }
  }

  if (offenders.length > 0) {
    fail(`构建产物包含不可部署的 API 占位符：${offenders.join('; ')}`)
    return
  }

  pass('dist 构建产物未包含 API 占位符')
}

checkPackageScripts()
checkVercelConfig()
checkProductionEnv()
checkDistOutput()

if (failures.length > 0) {
  console.error(`\n部署前检查未通过：${failures.length} 项失败`)
  process.exit(1)
}

console.log('\n部署前检查通过')
