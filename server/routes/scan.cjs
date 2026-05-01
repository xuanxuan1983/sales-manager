const express = require('express')
const router = express.Router()
const db = require('../database.cjs')
const { parseGS1 } = require('../../src/utils/gs1Parser.ts')
const { generateWatermark } = require('../../src/utils/watermark.ts')

// POST /api/scan/verify - 扫码验证
router.post('/verify', (req, res) => {
  try {
    const { rawCode, operator = '系统', institution, location } = req.body

    if (!rawCode) {
      return res.json({ code: 400, message: '请提供扫码内容', data: null })
    }

    // 解析 GS1
    const parsed = parseGS1(rawCode)
    const checks = []

    if (!parsed || !parsed.isValid) {
      checks.push({ name: '条码格式', passed: false, message: '无法识别该条码', severity: 'error' })
      return res.json({
        code: 200,
        message: 'success',
        data: {
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
          statusMessage: '条码格式错误',
          checks
        }
      })
    }

    checks.push({ name: '条码格式', passed: true, message: '条码格式正确', severity: 'success' })

    // 查询产品
    const product = db.prepare('SELECT * FROM products WHERE udi_di = ?').get(parsed.di)
    if (!product) {
      checks.push({ name: '产品注册', passed: false, message: '未找到该产品', severity: 'error' })
      return res.json({
        code: 200,
        message: 'success',
        data: {
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
          checks
        }
      })
    }

    checks.push({ name: '产品注册', passed: true, message: `产品：${product.name}`, severity: 'success' })

    // 检查召回
    const recalled = db.prepare('SELECT * FROM recalled_batches WHERE batch_no = ? AND status = ?').get(parsed.batchNo, 'active')
    if (recalled) {
      checks.push({ name: '召回检查', passed: false, message: '该批次已被召回', severity: 'error' })
      return res.json({
        code: 200,
        message: 'success',
        data: {
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
          checks
        }
      })
    }

    checks.push({ name: '召回检查', passed: true, message: '未被召回', severity: 'success' })

    // 检查效期
    const today = new Date()
    const expiryDate = parsed.expiryDate ? new Date(parsed.expiryDate) : null
    let status = 'authentic'
    let statusMsg = ''

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
    const existingRecords = db.prepare('SELECT COUNT(*) as count FROM scan_records WHERE udi_pi = ? OR serial_no = ?').get(parsed.pi, parsed.serialNo)
    const queryCount = existingRecords.count + 1
    const isFirstQuery = queryCount === 1

    if (!isFirstQuery) {
      status = 'authentic_repeat'
      statusMsg = `该序列号是第${queryCount}次查询`
    } else {
      statusMsg = '该序列号是第1次查询'
    }

    const isAuthentic = status === 'authentic' || status === 'authentic_repeat'

    // 生成防伪水印
    const watermark = isAuthentic ? generateWatermark({
      productId: product.id,
      batchNo: parsed.batchNo || '',
      serialNo: parsed.serialNo || '',
      queryCount
    }) : undefined

    // 保存记录
    const recordId = `SR-${Date.now()}`
    db.prepare(`
      INSERT INTO scan_records (id, raw_code, status, product_id, product_name, batch_no, serial_no, udi_di, udi_pi, operator, institution, location, query_count, is_first_query, watermark_token)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(recordId, rawCode, status, product.id, product.name, parsed.batchNo, parsed.serialNo, parsed.di, parsed.pi, operator, institution, location, queryCount, isFirstQuery ? 1 : 0, watermark?.token)

    res.json({
      code: 200,
      message: 'success',
      data: {
        isAuthentic,
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
      }
    })
  } catch (error) {
    console.error('Scan verify error:', error)
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

// GET /api/scan/stats - 扫码统计
router.get('/stats', (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10)
    
    const total = db.prepare('SELECT COUNT(*) as count FROM scan_records').get().count
    const authentic = db.prepare("SELECT COUNT(*) as count FROM scan_records WHERE status IN ('authentic', 'authentic_repeat')").get().count
    const fake = db.prepare("SELECT COUNT(*) as count FROM scan_records WHERE status = 'not_found'").get().count
    const expired = db.prepare("SELECT COUNT(*) as count FROM scan_records WHERE status = 'expired'").get().count
    const recalled = db.prepare("SELECT COUNT(*) as count FROM scan_records WHERE status = 'recalled'").get().count
    const todayScans = db.prepare("SELECT COUNT(*) as count FROM scan_records WHERE date(scanned_at) = ?").get(today).count

    res.json({
      code: 200,
      message: 'success',
      data: { totalScans: total, authenticScans: authentic, fakeScans: fake, expiredScans: expired, recalledScans: recalled, todayScans }
    })
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

// GET /api/scan/records - 扫码记录列表
router.get('/records', (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query
    const offset = (page - 1) * pageSize

    const records = db.prepare('SELECT * FROM scan_records ORDER BY scanned_at DESC LIMIT ? OFFSET ?').all(pageSize, offset)
    const total = db.prepare('SELECT COUNT(*) as count FROM scan_records').get().count

    res.json({
      code: 200,
      message: 'success',
      data: {
        list: records,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / pageSize)
      }
    })
  } catch (error) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

module.exports = router
