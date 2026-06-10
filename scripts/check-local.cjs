const DEFAULT_FRONTEND_URL = 'http://127.0.0.1:5173'
const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3001/api'

const frontendUrl = (process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL).replace(/\/$/, '')
const apiBaseUrl = (process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '')

const checks = [
  {
    name: '前端 Vite',
    url: `${frontendUrl}/collagen-projects`,
    validate: async response => {
      const text = await response.text()
      return response.ok && text.includes('<div id="app">')
    },
    hint: `请先运行 npm run dev，或设置 FRONTEND_URL 指向当前前端地址。当前检查地址：${frontendUrl}`
  },
  {
    name: 'API 健康检查',
    url: `${apiBaseUrl}/health`,
    validate: async response => {
      const body = await response.json()
      return response.ok && body.code === 200
    },
    hint: `请先运行 npm run api，或设置 VITE_API_BASE_URL/API_BASE_URL 指向真实 API。当前检查地址：${apiBaseUrl}`
  },
  {
    name: '胶原项目接口',
    url: `${apiBaseUrl}/collagen-projects`,
    validate: async response => {
      const body = await response.json()
      return response.ok && body.code === 200 && Array.isArray(body.data?.list)
    },
    hint: '请确认 API 服务已连接 SQLite，并且胶原项目路由可用。'
  }
]

const runCheck = async check => {
  try {
    const response = await fetch(check.url)
    const passed = await check.validate(response)

    if (!passed) {
      return {
        ...check,
        passed: false,
        message: `返回内容不符合预期，HTTP ${response.status}`
      }
    }

    return {
      ...check,
      passed: true,
      message: `OK (${response.status})`
    }
  } catch (error) {
    return {
      ...check,
      passed: false,
      message: error.message
    }
  }
}

const main = async () => {
  const results = []

  for (const check of checks) {
    results.push(await runCheck(check))
  }

  const failed = results.filter(result => !result.passed)

  for (const result of results) {
    const icon = result.passed ? '✓' : '✗'
    console.log(`${icon} ${result.name}: ${result.message}`)
    if (!result.passed) {
      console.log(`  ${result.hint}`)
    }
  }

  if (failed.length > 0) {
    console.error(`\n本地健康检查未通过：${failed.length}/${results.length} 项失败`)
    process.exit(1)
  }

  console.log('\n本地健康检查通过：前端、API、胶原项目接口均可访问')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
