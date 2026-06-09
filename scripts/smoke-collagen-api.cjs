const { spawn } = require('child_process')
const fs = require('fs')
const net = require('net')
const os = require('os')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sales-manager-collagen-api-'))
const dbPath = path.join(tempDir, 'nested', 'sales-manager.db')

const getFreePort = () => new Promise((resolve, reject) => {
  const server = net.createServer()
  server.on('error', reject)
  server.listen(0, () => {
    const address = server.address()
    server.close(() => resolve(address.port))
  })
})

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const request = async (baseUrl, url, options = {}) => {
  const response = await fetch(`${baseUrl}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  })
  const body = await response.json()
  return { status: response.status, body }
}

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const waitForHealth = async baseUrl => {
  let lastError

  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const { status, body } = await request(baseUrl, '/api/health')
      if (status === 200 && body.code === 200) return
    } catch (error) {
      lastError = error
    }

    await sleep(250)
  }

  throw new Error(`API did not become healthy: ${lastError?.message || 'timeout'}`)
}

const stopServer = server => new Promise(resolve => {
  if (server.exitCode !== null || server.signalCode !== null) {
    resolve()
    return
  }

  server.once('exit', resolve)
  server.kill('SIGTERM')
})

const main = async () => {
  const port = await getFreePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const server = spawn(process.execPath, ['server/index.cjs'], {
    cwd: rootDir,
    env: {
      ...process.env,
      PORT: String(port),
      DB_PATH: dbPath
    },
    stdio: ['ignore', 'pipe', 'pipe']
  })

  let serverOutput = ''
  server.stdout.on('data', chunk => {
    serverOutput += chunk.toString()
  })
  server.stderr.on('data', chunk => {
    serverOutput += chunk.toString()
  })

  try {
    await waitForHealth(baseUrl)

    const seeded = await request(baseUrl, '/api/collagen-projects?archiveStatus=all')
    assert(seeded.body.code === 200, 'seeded list request failed')
    assert(seeded.body.data.total === 6, `expected 6 seeded projects, got ${seeded.body.data.total}`)

    const created = await request(baseUrl, '/api/collagen-projects', {
      method: 'POST',
      body: JSON.stringify({
        name: '测试胶原机构',
        city: '苏州',
        owner: '测试负责人',
        source: '直营',
        stage: '线索',
        decision: '普通维护',
        risk: '中',
        score: 68,
        day30Status: '未开始',
        doctorTraining: '未排期',
        cases: 0,
        authorizedCases: 0,
        contentCount: 0,
        geoChange: 0,
        nextAction: '确认启动资料'
      })
    })
    assert(created.body.code === 200 && created.body.data.id, 'create project failed')
    const projectId = created.body.data.id

    const updated = await request(baseUrl, `/api/collagen-projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        stage: '待启动会',
        score: 76,
        nextAction: '安排医生培训'
      })
    })
    assert(updated.body.data.stage === '待启动会', 'update stage failed')
    assert(updated.body.data.score === 76, 'update score failed')

    const followed = await request(baseUrl, `/api/collagen-projects/${projectId}/follow-ups`, {
      method: 'POST',
      body: JSON.stringify({
        result: '已确认培训时间',
        nextAction: '培训后收集病例授权'
      })
    })
    assert(followed.body.data.followUpLogs.length === 1, 'follow-up log was not created')
    assert(followed.body.data.nextAction === '培训后收集病例授权', 'follow-up next action failed')

    const archived = await request(baseUrl, `/api/collagen-projects/${projectId}/archive`, { method: 'POST' })
    assert(Boolean(archived.body.data.archivedAt), 'archive timestamp missing')
    assert(archived.body.data.stage === '暂停', 'archive stage failed')

    const restored = await request(baseUrl, `/api/collagen-projects/${projectId}/restore`, { method: 'POST' })
    assert(!restored.body.data.archivedAt, 'restore did not clear archive timestamp')

    const imported = await request(baseUrl, '/api/collagen-projects/import', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'replace',
        projects: [
          {
            id: 'cp-test-001',
            name: '苏州胶原样板院',
            city: '苏州',
            owner: '测试A',
            source: '导入',
            stage: '已发货',
            decision: '二次启动',
            risk: '中',
            score: 71,
            day30Status: '进行中',
            doctorTraining: '已排期',
            cases: 2,
            authorizedCases: 1,
            contentCount: 3,
            geoChange: 5,
            nextAction: '收集病例授权'
          },
          {
            id: 'cp-test-002',
            name: '南京胶原复购院',
            city: '南京',
            owner: '测试B',
            source: '导入',
            stage: '复购判断',
            decision: '复购',
            risk: '低',
            score: 88,
            day30Status: '已复盘',
            doctorTraining: '已完成',
            cases: 5,
            authorizedCases: 4,
            contentCount: 8,
            geoChange: 12,
            nextAction: '确认复购批次'
          }
        ]
      })
    })
    assert(imported.body.data.imported === 2, 'bulk import count failed')
    assert(imported.body.data.total === 2, 'bulk import replace failed')
    assert(imported.body.data.list.some(project => project.id === 'cp-test-001'), 'bulk import did not preserve id')

    const duplicated = await request(baseUrl, '/api/collagen-projects/import', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'replace',
        projects: [
          { id: 'dup', name: '重复A', owner: '测试' },
          { id: 'dup', name: '重复B', owner: '测试' }
        ]
      })
    })
    assert(duplicated.body.code === 400, 'duplicate id should fail')
    assert(duplicated.body.message.includes('项目ID重复'), 'duplicate id error message missing')

    const cleared = await request(baseUrl, '/api/collagen-projects', { method: 'DELETE' })
    assert(cleared.body.code === 200, 'clear endpoint failed')
    assert(cleared.body.data.total === 0, 'clear did not return zero total')

    console.log('collagen api smoke passed')
  } catch (error) {
    console.error(serverOutput.trim())
    throw error
  } finally {
    await stopServer(server)
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
