const { spawn } = require('child_process')
const fs = require('fs')
const net = require('net')
const os = require('os')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sales-manager-local-stack-'))
const dbPath = path.join(tempDir, 'data', 'sales-manager.db')

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const getFreePort = () => new Promise((resolve, reject) => {
  const server = net.createServer()
  server.on('error', reject)
  server.listen(0, () => {
    const address = server.address()
    server.close(() => resolve(address.port))
  })
})

const stopProcess = child => new Promise(resolve => {
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    resolve()
    return
  }

  child.once('exit', resolve)
  child.kill('SIGTERM')

  setTimeout(() => {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL')
    }
  }, 3000).unref()
})

const waitForUrl = async (url, label) => {
  let lastError

  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) return
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      lastError = error
    }

    await sleep(250)
  }

  throw new Error(`${label} did not become ready at ${url}: ${lastError?.message || 'timeout'}`)
}

const spawnService = (command, args, env) => {
  const child = spawn(command, args, {
    cwd: rootDir,
    env: {
      ...process.env,
      ...env
    },
    stdio: ['ignore', 'pipe', 'pipe']
  })

  let output = ''
  child.stdout.on('data', chunk => {
    output += chunk.toString()
  })
  child.stderr.on('data', chunk => {
    output += chunk.toString()
  })
  child.output = () => output.trim()

  return child
}

const main = async () => {
  const apiPort = await getFreePort()
  const frontendPort = await getFreePort()
  const apiBaseUrl = `http://127.0.0.1:${apiPort}/api`
  const frontendUrl = `http://127.0.0.1:${frontendPort}`

  const api = spawnService(process.execPath, ['server/index.cjs'], {
    PORT: String(apiPort),
    DB_PATH: dbPath
  })

  const viteBin = path.join(rootDir, 'node_modules', '.bin', 'vite')
  const frontend = spawnService(viteBin, ['--host', '127.0.0.1', '--port', String(frontendPort), '--strictPort'], {
    VITE_API_BASE_URL: apiBaseUrl
  })

  try {
    await waitForUrl(`${apiBaseUrl}/health`, 'API')
    await waitForUrl(`${frontendUrl}/collagen-projects`, 'Frontend')

    const checker = spawnService(process.execPath, ['scripts/check-local.cjs'], {
      FRONTEND_URL: frontendUrl,
      API_BASE_URL: apiBaseUrl,
      VITE_API_BASE_URL: apiBaseUrl
    })

    const exitCode = await new Promise(resolve => {
      checker.once('exit', resolve)
    })

    if (exitCode !== 0) {
      throw new Error(`local checker failed:\n${checker.output()}`)
    }

    console.log(checker.output())
    console.log(`\nlocal stack smoke passed on ${frontendUrl} and ${apiBaseUrl}`)
  } catch (error) {
    console.error('API output:')
    console.error(api.output())
    console.error('Frontend output:')
    console.error(frontend.output())
    throw error
  } finally {
    await Promise.all([stopProcess(frontend), stopProcess(api)])
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
