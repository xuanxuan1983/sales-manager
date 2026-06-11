// ============ GS1 DataMatrix / Barcode Parser ============
// 支持 UDI (Unique Device Identification) 码解析
// 符合国际标准 ISO/IEC 15434 和 GS1 应用标识符规范

export interface GS1ParseResult {
  di: string              // UDI-DI (Device Identifier) - 产品标识
  pi: string              // UDI-PI (Production Identifier) - 生产标识
  batchNo: string         // 批号 (AI 10)
  serialNo: string        // 序列号 (AI 21)
  productionDate: string  // 生产日期 yyyy-MM-dd (AI 11)
  expiryDate: string      // 有效期至 yyyy-MM-dd (AI 17)
  mfgDate?: string        // 制造日期 (AI 12)
  bestBefore?: string     // 最佳使用日期 (AI 15)
  lotNumber?: string      //  lot number (AI 254)
  quantity?: number       // 数量 (AI 30)
  netWeight?: number      // 净重 (AI 310x)
  gs1Code: string         // 原始完整 GS1 码
  isValid: boolean        // 解析是否成功
  errors: string[]        // 解析错误信息
}

// GS1 应用标识符定义
const GS1_AIS: Record<string, { name: string; length?: number; variable?: boolean; maxLen?: number }> = {
  '01': { name: 'GTIN', length: 14 },           // 全球贸易项目代码 (UDI-DI)
  '10': { name: 'BATCH', variable: true, maxLen: 20 },  // 批号
  '11': { name: 'PROD_DATE', length: 6 },       // 生产日期 YYMMDD
  '12': { name: 'DUE_DATE', length: 6 },        // 付款截止日期
  '13': { name: 'PACK_DATE', length: 6 },       // 包装日期
  '15': { name: 'BEST_BEFORE', length: 6 },     // 最佳使用日期
  '17': { name: 'USE_BY', length: 6 },          // 有效期至
  '21': { name: 'SERIAL', variable: true, maxLen: 20 }, // 序列号
  '30': { name: 'COUNT', variable: true, maxLen: 8 },   // 数量
  '240': { name: 'ADDITIONAL_ID', variable: true, maxLen: 30 }, // 附加产品标识
  '254': { name: 'GLN_EXTENSION', variable: true, maxLen: 20 }, // GLN 扩展
  '3100': { name: 'NET_WEIGHT_KG', length: 6 }, // 净重 kg
  '3101': { name: 'NET_WEIGHT_KG_1', length: 6 },
  '3102': { name: 'NET_WEIGHT_KG_2', length: 6 },
  '3103': { name: 'NET_WEIGHT_KG_3', length: 6 },
  '3104': { name: 'NET_WEIGHT_KG_4', length: 6 },
  '3105': { name: 'NET_WEIGHT_KG_5', length: 6 },
  '3200': { name: 'NET_WEIGHT_LB', length: 6 }, // 净重磅
}

/**
 * 格式化 GS1 日期 (YYMMDD → yyyy-MM-dd)
 */
function formatGS1Date(yyMMdd: string): string {
  if (!yyMMdd || yyMMdd.length !== 6) return ''
  const yy = yyMMdd.substring(0, 2)
  const mm = yyMMdd.substring(2, 4)
  const dd = yyMMdd.substring(4, 6)
  const year = parseInt(yy) >= 50 ? `19${yy}` : `20${yy}`
  return `${year}-${mm}-${dd}`
}

/**
 * 解析 GS1 条码内容
 * 支持格式:
 * 1. FNC1 分隔: ]d20106973894820001102601151728011410GEN-A21001
 * 2. 括号格式: (01)6973894820001(11)260115(17)280114(10)GEN-A(21)001
 * 3. 纯数字 + GS 分隔符: 016973894820001112601151728011410GEN-A\x1d21001
 */
export function parseGS1(content: string): GS1ParseResult | null {
  const result: Partial<GS1ParseResult> = {
    gs1Code: content,
    isValid: false,
    errors: []
  }

  if (!content || content.trim().length < 10) {
    result.errors?.push('条码内容过短')
    return result as GS1ParseResult
  }

  try {
    // 检测格式类型并解析
    let parsed: Record<string, string> = {}

    if (content.includes('(01)')) {
      // 括号格式 (01)6973894820001(11)260115...
      parsed = parseParenthesesFormat(content)
    } else if (content.startsWith(']d2') || content.startsWith(']D2')) {
      // FNC1 格式 ]d2016973894820001...
      parsed = parseFNC1Format(content)
    } else {
      // 尝试纯数字 + GS 分隔符格式
      parsed = parseRawGS1Format(content)
    }

    // 提取关键字段
    result.di = parsed['01'] || ''
    result.batchNo = parsed['10'] || ''
    result.serialNo = parsed['21'] || ''
    result.productionDate = parsed['11'] ? formatGS1Date(parsed['11']) : ''
    result.expiryDate = parsed['17'] ? formatGS1Date(parsed['17']) : ''
    result.mfgDate = parsed['12'] ? formatGS1Date(parsed['12']) : undefined
    result.bestBefore = parsed['15'] ? formatGS1Date(parsed['15']) : undefined
    result.lotNumber = parsed['254'] || undefined
    result.quantity = parsed['30'] ? parseInt(parsed['30']) : undefined

    // 构建 UDI-PI
    const piParts: string[] = []
    if (result.batchNo) piParts.push(result.batchNo)
    if (result.serialNo) piParts.push(result.serialNo)
    result.pi = piParts.join('-') || result.di

    // 验证
    if (!result.di) {
      result.errors?.push('未找到 UDI-DI (AI 01)')
    }
    if (result.di && result.di.length !== 14) {
      result.errors?.push(`UDI-DI 长度应为14位，实际${result.di.length}位`)
    }

    result.isValid = !!result.di && result.di.length === 14

    return result as GS1ParseResult
  } catch (e) {
    result.errors?.push(`解析异常: ${e instanceof Error ? e.message : String(e)}`)
    return result as GS1ParseResult
  }
}

/**
 * 解析括号格式: (01)6973894820001(11)260115(17)280114(10)GEN-A(21)001
 */
function parseParenthesesFormat(content: string): Record<string, string> {
  const result: Record<string, string> = {}
  const regex = /\((\d{2,4})\)([^()]*)/g
  let match

  while ((match = regex.exec(content)) !== null) {
    const ai = match[1]
    const value = match[2].trim()
    result[ai] = value
  }

  return result
}

/**
 * 解析 FNC1 格式: ]d2016973894820001112601151728011410GEN-A1d21001
 */
function parseFNC1Format(content: string): Record<string, string> {
  const result: Record<string, string> = {}
  // 移除前缀
  let data = content.replace(/^]d2/i, '')

  let pos = 0
  while (pos < data.length) {
    // 读取 AI (2-4位)
    let ai = data.substring(pos, pos + 2)
    pos += 2

    // 检查是否是 3 位或 4 位 AI
    if (['31', '32'].includes(ai.substring(0, 2))) {
      ai = data.substring(pos - 2, pos + 2)
      pos += 2
    }

    const aiConfig = GS1_AIS[ai]
    if (!aiConfig) break

    // 读取值
    let value: string
    if (aiConfig.length) {
      value = data.substring(pos, pos + aiConfig.length)
      pos += aiConfig.length
    } else if (aiConfig.variable) {
      // 变长字段，读到 GS 分隔符或结束
      const gsIndex = data.indexOf('\x1d', pos)
      const endPos = gsIndex >= 0 ? gsIndex : data.length
      value = data.substring(pos, endPos)
      pos = endPos + 1 // 跳过 GS 分隔符
    } else {
      break
    }

    result[ai] = value
  }

  return result
}

/**
 * 解析原始 GS1 格式 (纯数字开头)
 */
function parseRawGS1Format(content: string): Record<string, string> {
  const result: Record<string, string> = {}
  let pos = 0

  while (pos < content.length) {
    // 尝试匹配 4 位 AI
    let ai = content.substring(pos, pos + 4)
    if (!GS1_AIS[ai]) {
      // 尝试 3 位
      ai = content.substring(pos, pos + 3)
      if (!GS1_AIS[ai]) {
        // 尝试 2 位
        ai = content.substring(pos, pos + 2)
      }
    }

    const aiConfig = GS1_AIS[ai]
    if (!aiConfig) break

    pos += ai.length

    // 读取值
    let value: string
    if (aiConfig.length) {
      value = content.substring(pos, pos + aiConfig.length)
      pos += aiConfig.length
    } else if (aiConfig.variable) {
      const gsIndex = content.indexOf('\x1d', pos)
      const endPos = gsIndex >= 0 ? gsIndex : content.length
      value = content.substring(pos, endPos)
      pos = endPos + 1
    } else {
      break
    }

    result[ai] = value
  }

  return result
}

/**
 * 验证 UDI-DI 是否合法
 * UDI-DI 应为 14 位数字 (GTIN-14)
 */
export function validateUDIDI(di: string): { valid: boolean; message?: string } {
  if (!di) return { valid: false, message: 'UDI-DI 不能为空' }
  if (!/^\d{14}$/.test(di)) return { valid: false, message: 'UDI-DI 应为14位数字' }

  // GTIN-14 校验位验证
  const digits = di.split('').map(Number)
  const checkDigit = digits.pop()!
  const sum = digits.reverse().reduce((acc, d, i) => {
    return acc + d * (i % 2 === 0 ? 3 : 1)
  }, 0)
  const expectedCheck = (10 - (sum % 10)) % 10

  if (checkDigit !== expectedCheck) {
    return { valid: false, message: 'UDI-DI 校验位错误' }
  }

  return { valid: true }
}

/**
 * 生成 UDI-PI 字符串
 */
export function generateUDIPI(batchNo: string, serialNo?: string, expiryDate?: string): string {
  const parts = [batchNo]
  if (serialNo) parts.push(serialNo)
  if (expiryDate) parts.push(expiryDate.replace(/-/g, ''))
  return parts.join('-')
}

/**
 * 模拟扫码（开发测试用）
 */
export function mockScan(productId: string = 'P001'): string {
  const diMap: Record<string, string> = {
    P001: '06973894820001',
    P002: '06973894820002',
    P003: '06973894820003'
  }
  const di = diMap[productId] || '06973894820001'
  const batchNo = `GEN-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-A`
  const serialNo = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')
  const prodDate = new Date().toISOString().slice(2, 10).replace(/-/g, '')
  const expDate = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(2, 10).replace(/-/g, '')

  return `(01)${di}(11)${prodDate}(17)${expDate}(10)${batchNo}(21)${serialNo}`
}
