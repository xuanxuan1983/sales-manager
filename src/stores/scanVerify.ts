import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { parseGS1, mockScan } from '@/utils/gs1Parser'
import { generateWatermark } from '@/utils/watermark'
import { verifyScan } from '@/api/scan'
import type {
  ProductVerifyRecord,
  ScanVerifyStatus,
  VerifyCheck,
  ScanResultDisplay,
  InstitutionVerifyRecord
} from '@/types/scanVerify'
import type { GS1ParseResult } from '@/utils/gs1Parser'

// ========== 模拟产品数据库 ==========
const PRODUCT_DB: Record<string, {
  id: string
  name: string
  spec: string
  manufacturer: string
  udiDi: string
}> = {
  '06973894820001': {
    id: 'P001',
    name: '天新福胶原蛋白植入剂',
    spec: '1ml/支',
    manufacturer: '天新福（北京）医疗器材股份有限公司',
    udiDi: '06973894820001'
  },
  '06973894820002': {
    id: 'P002',
    name: '天新福胶原蛋白植入剂',
    spec: '2ml/支',
    manufacturer: '天新福（北京）医疗器材股份有限公司',
    udiDi: '06973894820002'
  },
  '06973894820003': {
    id: 'P003',
    name: '天新福胶原蛋白水光',
    spec: '5ml/支',
    manufacturer: '天新福（北京）医疗器材股份有限公司',
    udiDi: '06973894820003'
  }
}

// 已召回批次
const RECALLED_BATCHES = new Set(['TXF-20250101-R'])

export const useScanVerifyStore = defineStore('scanVerify', () => {
  // ========== State ==========
  const verifyRecords = ref<ProductVerifyRecord[]>([])
  const institutionRecords = ref<InstitutionVerifyRecord[]>([
    {
      id: 'I001',
      institutionName: '北京协和医院',
      institutionType: 'hospital',
      province: '北京市',
      city: '北京市',
      address: '东城区帅府园1号',
      contact: '张主任',
      phone: '010-69156114',
      isAuthorized: true,
      authorizedProducts: ['P001', 'P002', 'P003'],
      verifyStatus: 'verified',
      queryCount: 156
    },
    {
      id: 'I002',
      institutionName: '上海华美医疗美容门诊部',
      institutionType: 'clinic',
      province: '上海市',
      city: '上海市',
      address: '浦东新区源深路155号',
      contact: '李经理',
      phone: '021-58858888',
      isAuthorized: true,
      authorizedProducts: ['P001', 'P002'],
      verifyStatus: 'verified',
      queryCount: 89
    },
    {
      id: 'I003',
      institutionName: '广州某美容工作室',
      institutionType: 'beauty_salon',
      province: '广东省',
      city: '广州市',
      isAuthorized: false,
      authorizedProducts: [],
      verifyStatus: 'unverified',
      queryCount: 3
    }
  ])

  const isScanning = ref(false)
  const lastResult = ref<ScanResultDisplay | null>(null)

  // ========== Computed ==========

  /** 统计信息 */
  const stats = computed(() => {
    const records = verifyRecords.value
    return {
      total: records.length,
      authentic: records.filter(r => r.status === 'authentic' || r.status === 'authentic_repeat').length,
      fake: records.filter(r => r.status === 'not_found').length,
      expired: records.filter(r => r.status === 'expired').length,
      recalled: records.filter(r => r.status === 'recalled').length
    }
  })

  /** 查询历史 */
  const queryHistory = computed(() => {
    return [...verifyRecords.value].sort((a, b) =>
      new Date(b.verifiedAt).getTime() - new Date(a.verifiedAt).getTime()
    ).slice(0, 50)
  })

  // ========== Actions ==========

  /**
   * 产品扫码验真（核心功能 - 参考艾佰瑞）
   * 优先调用后端API，失败时降级到本地处理
   */
  const verifyProduct = async (rawCode: string, operator: string = '系统'): Promise<ScanResultDisplay> => {
    isScanning.value = true

    try {
      // 尝试调用后端API
      try {
        const result = await verifyScan({ rawCode, operator })
        lastResult.value = {
          isAuthentic: result.isAuthentic,
          queryCount: result.queryCount,
          productName: result.productName,
          batchNo: result.batchNo,
          serialNo: result.serialNo,
          productionDate: result.productionDate,
          expiryDate: result.expiryDate,
          manufacturer: result.manufacturer,
          statusBadge: {
            text: result.status === 'authentic' ? '真' :
                  result.status === 'authentic_repeat' ? `第${result.queryCount}次查询` :
                  result.statusMessage,
            type: result.isAuthentic ? 'success' : 'danger',
            icon: result.isAuthentic ? '✓' : '⚠️'
          },
          checks: result.checks.map(c => ({
            name: c.name,
            passed: c.passed,
            message: c.message,
            severity: c.severity as 'info' | 'warning' | 'error' | 'success',
            icon: c.passed ? '✅' : '❌'
          })),
          watermark: result.watermark
        }
        return lastResult.value
      } catch (apiError) {
        console.warn('API调用失败，降级到本地处理:', apiError)
      }

      // 本地降级处理（原有逻辑）
      return await verifyProductLocal(rawCode, operator)
    } finally {
      isScanning.value = false
    }
  }

  /**
   * 本地扫码验真（API降级时使用）
   */
  const verifyProductLocal = async (rawCode: string, operator: string = '系统'): Promise<ScanResultDisplay> => {
    const parsed = parseGS1(rawCode)
    const checks: VerifyCheck[] = []

    if (!parsed || !parsed.isValid) {
      checks.push({ name: '条码格式', passed: false, message: '无法识别该条码', severity: 'error', icon: '❌' })
      lastResult.value = {
        isAuthentic: false, queryCount: 0, productName: '未知产品',
        batchNo: '-', serialNo: '-', productionDate: '-', expiryDate: '-', manufacturer: '-',
        statusBadge: { text: '序列号不存在', type: 'danger', icon: '⚠️' }, checks
      }
      return lastResult.value
    }

    checks.push({ name: '条码格式', passed: true, message: '条码格式正确', severity: 'success', icon: '✅' })

    const product = PRODUCT_DB[parsed.di]
    if (!product) {
      checks.push({ name: '产品注册', passed: false, message: '未找到该产品', severity: 'error', icon: '❌' })
      lastResult.value = {
        isAuthentic: false, queryCount: 0, productName: '未知产品',
        batchNo: parsed.batchNo || '-', serialNo: parsed.serialNo || '-',
        productionDate: parsed.productionDate || '-', expiryDate: parsed.expiryDate || '-', manufacturer: '-',
        statusBadge: { text: '序列号不存在', type: 'danger', icon: '⚠️' }, checks
      }
      return lastResult.value
    }

    checks.push({ name: '产品注册', passed: true, message: `产品：${product.name}`, severity: 'success', icon: '✅' })

    if (parsed.batchNo && RECALLED_BATCHES.has(parsed.batchNo)) {
      checks.push({ name: '召回检查', passed: false, message: '该批次已被召回', severity: 'error', icon: '🚨' })
      lastResult.value = {
        isAuthentic: true, queryCount: 1, productName: product.name,
        batchNo: parsed.batchNo, serialNo: parsed.serialNo || '-',
        productionDate: parsed.productionDate || '-', expiryDate: parsed.expiryDate || '-', manufacturer: product.manufacturer,
        statusBadge: { text: '该批次已召回', type: 'danger', icon: '🚨' }, checks
      }
      return lastResult.value
    }

    checks.push({ name: '召回检查', passed: true, message: '未被召回', severity: 'success', icon: '✅' })

    const today = new Date()
    const expiryDate = parsed.expiryDate ? new Date(parsed.expiryDate) : null
    let status: ScanVerifyStatus = 'authentic'

    if (expiryDate) {
      const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays < 0) {
        status = 'expired'
        checks.push({ name: '效期检查', passed: false, message: `已过期 ${Math.abs(diffDays)} 天`, severity: 'error', icon: '⛔' })
      } else if (diffDays <= 90) {
        checks.push({ name: '效期检查', passed: true, message: `即将到期，剩余 ${diffDays} 天`, severity: 'warning', icon: '⚠️' })
      } else {
        checks.push({ name: '效期检查', passed: true, message: `效期正常，剩余 ${diffDays} 天`, severity: 'success', icon: '✅' })
      }
    }

    const existingQueries = verifyRecords.value.filter(r => r.udiPi === parsed.pi || r.serialNo === parsed.serialNo)
    const queryCount = existingQueries.length + 1
    const isFirstQuery = queryCount === 1
    let statusMsg = isFirstQuery ? '该序列号是第1次查询' : `该序列号是第${queryCount}次查询`
    if (!isFirstQuery) status = 'authentic_repeat'

    const isAuthentic = status === 'authentic' || status === 'authentic_repeat'
    const watermark = isAuthentic ? generateWatermark({
      productId: product.id, batchNo: parsed.batchNo || '', serialNo: parsed.serialNo || '', queryCount
    }) : undefined

    lastResult.value = {
      isAuthentic, queryCount,
      productName: product.name,
      batchNo: parsed.batchNo || '-', serialNo: parsed.serialNo || '-',
      productionDate: parsed.productionDate || '-', expiryDate: parsed.expiryDate || '-', manufacturer: product.manufacturer,
      statusBadge: {
        text: isAuthentic ? (isFirstQuery ? '真' : `第${queryCount}次查询`) : statusMsg,
        type: isAuthentic ? 'success' : 'danger', icon: isAuthentic ? '✓' : '⚠️'
      },
      checks, watermark
    }

    saveRecord(rawCode, parsed, status, statusMsg, checks, operator, isFirstQuery, queryCount)
    return lastResult.value
  }

  /**
   * 机构查询（优先API，降级本地）
   */
  const verifyInstitution = (name: string, province?: string, city?: string): InstitutionVerifyRecord[] => {
    return institutionRecords.value.filter(inst => {
      const matchName = inst.institutionName.includes(name)
      const matchProvince = !province || inst.province === province
      const matchCity = !city || inst.city === city
      return matchName && matchProvince && matchCity
    })
  }

  /**
   * 获取授权机构列表
   */
  const getAuthorizedInstitutions = (productId?: string) => {
    return institutionRecords.value.filter(inst =>
      inst.isAuthorized && (!productId || inst.authorizedProducts.includes(productId))
    )
  }

  /**
   * 模拟扫码（开发测试）
   */
  const mockProductScan = (productId: string = 'P001'): string => {
    return mockScan(productId)
  }

  // ========== Helpers ==========

  function saveRecord(
    rawCode: string,
    parsed: GS1ParseResult | null,
    status: ScanVerifyStatus,
    statusMsg: string,
    checks: VerifyCheck[],
    operator: string,
    isFirstQuery: boolean,
    queryCount: number
  ) {
    const now = new Date().toISOString()
    const record: ProductVerifyRecord = {
      id: `SV-${Date.now()}`,
      scenario: 'product_verify',
      rawCode,
      parsedResult: parsed,
      status,
      statusMessage: statusMsg,
      isFirstQuery,
      queryCount,
      productId: parsed ? PRODUCT_DB[parsed.di]?.id : undefined,
      productName: parsed ? PRODUCT_DB[parsed.di]?.name : undefined,
      productSpec: parsed ? PRODUCT_DB[parsed.di]?.spec : undefined,
      udiDi: parsed?.di,
      udiPi: parsed?.pi,
      batchNo: parsed?.batchNo,
      serialNo: parsed?.serialNo,
      productionDate: parsed?.productionDate,
      expiryDate: parsed?.expiryDate,
      manufacturer: parsed ? PRODUCT_DB[parsed.di]?.manufacturer : undefined,
      verifyChecks: checks,
      operator,
      location: '扫码验真页面',
      scannedAt: now,
      verifiedAt: now
    }

    verifyRecords.value.push(record)
  }

  return {
    verifyRecords,
    institutionRecords,
    isScanning,
    lastResult,
    stats,
    queryHistory,
    verifyProduct,
    verifyInstitution: verifyInstitution,
    getAuthorizedInstitutions,
    mockProductScan
  }
})
