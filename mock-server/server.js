const jsonServer = require('json-server')
const { parseGS1 } = require('../src/utils/gs1Parser.ts')
const { generateWatermark } = require('../src/utils/watermark.ts')

const server = jsonServer.create()
const router = jsonServer.router('./mock-server/db.json')
const middlewares = jsonServer.defaults()

server.use(middlewares)
server.use(jsonServer.bodyParser)

// ========== 统一响应格式 ==========
const success = (data, message = 'success') => ({
  code: 200,
  message,
  data,
  timestamp: new Date().toISOString()
})

const error = (code, message) => ({
  code,
  message,
  data: null,
  timestamp: new Date().toISOString()
})

// ========== 扫码验真 API ==========
server.post('/api/scan/verify', (req, res) => {
  const { rawCode, operator = '系统' } = req.body
  const db = router.db

  if (!rawCode) {
    return res.status(400).json(error(400, '请提供扫码内容'))
  }

  // 解析 GS1
  const parsed = parseGS1(rawCode)
  if (!parsed || !parsed.isValid) {
    return res.status(200).json(success({
      isAuthentic: false,
      queryCount: 0,
      isFirstQuery: true,
      productName: '未知产品',
      batchNo: '-',
      serialNo: '-',
      productionDate: '-',
      expiryDate: '-',
      manufacturer: '-',
      status: 'not_found',
      statusMessage: '条码格式错误，无法识别',
      checks: [{ name: '条码格式', passed: false, message: '无法识别该条码', severity: 'error' }]
    }))
  }

  // 查询产品
  const product = db.get('products').find({ udiDi: parsed.di }).value()
  if (!product) {
    return res.status(200).json(success({
      isAuthentic: false,
      queryCount: 0,
      isFirstQuery: true,
      productName: '未知产品',
      batchNo: parsed.batchNo || '-',
      serialNo: parsed.serialNo || '-',
      productionDate: parsed.productionDate || '-',
      expiryDate: parsed.expiryDate || '-',
      manufacturer: '-',
      status: 'not_found',
      statusMessage: '未找到该产品注册信息',
      checks: [
        { name: '条码格式', passed: true, message: '条码格式正确', severity: 'success' },
        { name: '产品注册', passed: false, message: '未找到该产品', severity: 'error' }
      ]
    }))
  }

  // 检查召回
  const recalled = db.get('recalledBatches').find({ batchNo: parsed.batchNo }).value()
  if (recalled) {
    return res.status(200).json(success({
      isAuthentic: true,
      queryCount: 1,
      isFirstQuery: true,
      productName: product.name,
      batchNo: parsed.batchNo,
      serialNo: parsed.serialNo || '-',
      productionDate: parsed.productionDate || '-',
      expiryDate: parsed.expiryDate || '-',
      manufacturer: product.manufacturer,
      status: 'recalled',
      statusMessage: '该批次已被召回',
      checks: [
        { name: '条码格式', passed: true, message: '条码格式正确', severity: 'success' },
        { name: '产品注册', passed: true, message: '产品已注册', severity: 'success' },
        { name: '召回检查', passed: false, message: '该批次已被召回', severity: 'error' }
      ]
    }))
  }

  // 检查效期
  const today = new Date()
  const expiryDate = parsed.expiryDate ? new Date(parsed.expiryDate) : null
  let status = 'authentic'
  let statusMsg = ''
  const checks = [
    { name: '条码格式', passed: true, message: '条码格式正确', severity: 'success' },
    { name: '产品注册', passed: true, message: `产品：${product.name}`, severity: 'success' },
    { name: '召回检查', passed: true, message: '未被召回', severity: 'success' }
  ]

  if (expiryDate) {
    const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) {
      status = 'expired'
      statusMsg = `已过期 ${Math.abs(diffDays)} 天`
      checks.push({ name: '效期检查', passed: false, message: statusMsg, severity: 'error' })
    } else if (diffDays <= 90) {
      checks.push({ name: '效期检查', passed: true, message: `即将到期，剩余 ${diffDays} 天`, severity: 'warning' })
    } else {
      checks.push({ name: '效期检查', passed: true, message: `效期正常，剩余 ${diffDays} 天`, severity: 'success' })
    }
  }

  // 查询次数
  const existingRecords = db.get('scanRecords').filter({
    $or: [{ udiPi: parsed.pi }, { serialNo: parsed.serialNo }]
  }).value()
  const queryCount = existingRecords.length + 1
  const isFirstQuery = queryCount === 1

  if (!isFirstQuery) {
    status = 'authentic_repeat'
    statusMsg = `该序列号是第${queryCount}次查询`
  } else {
    statusMsg = '该序列号是第1次查询'
  }

  // 生成防伪水印
  const watermark = generateWatermark({
    productId: product.id,
    batchNo: parsed.batchNo || '',
    serialNo: parsed.serialNo || '',
    queryCount
  })

  // 保存记录
  db.get('scanRecords').push({
    id: `SR-${Date.now()}`,
    rawCode,
    status,
    productName: product.name,
    batchNo: parsed.batchNo,
    serialNo: parsed.serialNo,
    operator,
    scannedAt: new Date().toISOString(),
    queryCount
  }).write()

  res.json(success({
    isAuthentic: status === 'authentic' || status === 'authentic_repeat',
    queryCount,
    isFirstQuery,
    productName: product.name,
    batchNo: parsed.batchNo || '-',
    serialNo: parsed.serialNo || '-',
    productionDate: parsed.productionDate || '-',
    expiryDate: parsed.expiryDate || '-',
    manufacturer: product.manufacturer,
    status,
    statusMessage: statusMsg,
    checks,
    watermark
  }))
})

// ========== 扫码统计 API ==========
server.get('/api/scan/stats', (req, res) => {
  const db = router.db
  const records = db.get('scanRecords').value()
  const today = new Date().toISOString().slice(0, 10)

  res.json(success({
    totalScans: records.length,
    authenticScans: records.filter(r => r.status === 'authentic' || r.status === 'authentic_repeat').length,
    fakeScans: records.filter(r => r.status === 'not_found').length,
    expiredScans: records.filter(r => r.status === 'expired').length,
    recalledScans: records.filter(r => r.status === 'recalled').length,
    todayScans: records.filter(r => r.scannedAt.startsWith(today)).length
  }))
})

// ========== 机构验证 API ==========
server.post('/api/institutions/verify', (req, res) => {
  const { institutionName, productId } = req.body
  const db = router.db

  const institution = db.get('institutions')
    .find(inst => inst.name.includes(institutionName))
    .value()

  if (!institution) {
    return res.json(success({
      isAuthorized: false,
      message: '未找到该机构信息'
    }))
  }

  const isAuthorized = institution.isAuthorized &&
    (!productId || institution.authorizedProducts.includes(productId))

  res.json(success({
    isAuthorized,
    institution,
    message: isAuthorized ? '该机构为官方授权机构' : '该机构未获得授权'
  }))
})

// ========== UDI 追溯 API ==========
server.get('/api/udi/:udiPi/trace', (req, res) => {
  const { udiPi } = req.params
  const db = router.db

  const records = db.get('traceRecords')
    .filter({ udiPi })
    .sortBy('timestamp')
    .value()

  res.json(success(records))
})

// 使用默认路由处理其他请求
server.use('/api', router)

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`🚀 Mock Server running at http://localhost:${PORT}`)
  console.log(`📊 API Endpoints:`)
  console.log(`   POST /api/scan/verify      - 扫码验真`)
  console.log(`   GET  /api/scan/stats       - 扫码统计`)
  console.log(`   GET  /api/products         - 产品列表`)
  console.log(`   GET  /api/batches          - 批次列表`)
  console.log(`   GET  /api/institutions     - 机构列表`)
  console.log(`   POST /api/institutions/verify - 机构验证`)
  console.log(`   GET  /api/udi/:udiPi/trace - UDI追溯`)
})
