import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { parseGS1, mockScan } from '@/utils/gs1Parser'
import { generateWatermark } from '@/utils/watermark'
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
   */
  const verifyProduct = async (rawCode: string, operator: string = '系统'): Promise<ScanResultDisplay> => {
    isScanning.value = true

    try {
      // 1. 解析条码
      const parsed = parseGS1(rawCode)
      const checks: VerifyCheck[] = []

      // 2. 格式验证
      if (!parsed || !parsed.isValid) {
        checks.push({
          name: '条码格式',
          passed: false,
          message: '无法识别该条码格式，请检查是否为正规产品',
          severity: 'error',
          icon: '❌'
        })

        lastResult.value = {
          isAuthentic: false,
          queryCount: 0,
          productName: '未知产品',
          batchNo: '-',
          serialNo: '-',
          productionDate: '-',
          expiryDate: '-',
          manufacturer: '-',
          statusBadge: {
            text: '序列号不存在',
            type: 'danger',
            icon: '⚠️'
          },
          checks
        }

        // 保存记录
        saveRecord(rawCode, parsed, 'not_found', '该序列号不存在，请核实是否输入有误', checks, operator, false, 0)

        return lastResult.value
      }

      checks.push({
        name: '条码格式',
        passed: true,
        message: '条码格式正确',
        severity: 'success',
        icon: '✅'
      })

      // 3. 查询产品信息
      const product = PRODUCT_DB[parsed.di]
      if (!product) {
        checks.push({
          name: '产品注册',
          passed: false,
          message: '未找到该产品注册信息，疑似非正规产品',
          severity: 'error',
          icon: '❌'
        })

        lastResult.value = {
          isAuthentic: false,
          queryCount: 0,
          productName: '未知产品',
          batchNo: parsed.batchNo || '-',
          serialNo: parsed.serialNo || '-',
          productionDate: parsed.productionDate || '-',
          expiryDate: parsed.expiryDate || '-',
          manufacturer: '-',
          statusBadge: {
            text: '序列号不存在',
            type: 'danger',
            icon: '⚠️'
          },
          checks
        }

        saveRecord(rawCode, parsed, 'not_found', '该产品未在系统中注册', checks, operator, false, 0)
        return lastResult.value
      }

      checks.push({
        name: '产品注册',
        passed: true,
        message: `产品已注册：${product.name}`,
        severity: 'success',
        icon: '✅'
      })

      // 4. 检查召回
      if (parsed.batchNo && RECALLED_BATCHES.has(parsed.batchNo)) {
        checks.push({
          name: '召回检查',
          passed: false,
          message: '⚠️ 该批次已被召回，请立即停止使用',
          severity: 'error',
          icon: '🚨'
        })

        lastResult.value = {
          isAuthentic: true,
          queryCount: 1,
          productName: product.name,
          batchNo: parsed.batchNo,
          serialNo: parsed.serialNo || '-',
          productionDate: parsed.productionDate || '-',
          expiryDate: parsed.expiryDate || '-',
          manufacturer: product.manufacturer,
          statusBadge: {
            text: '该批次已召回',
            type: 'danger',
            icon: '🚨'
          },
          checks
        }

        saveRecord(rawCode, parsed, 'recalled', '该批次产品已被召回', checks, operator, false, 1)
        return lastResult.value
      }

      checks.push({
        name: '召回检查',
        passed: true,
        message: '该批次未被召回',
        severity: 'success',
        icon: '✅'
      })

      // 5. 检查效期
      const today = new Date()
      const expiryDate = parsed.expiryDate ? new Date(parsed.expiryDate) : null
      let status: ScanVerifyStatus = 'authentic'
      let statusMsg = ''

      if (expiryDate) {
        const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        if (diffDays < 0) {
          status = 'expired'
          statusMsg = '该产品已过期'
          checks.push({
            name: '效期检查',
            passed: false,
            message: `已过期 ${Math.abs(diffDays)} 天，请勿使用`,
            severity: 'error',
            icon: '⛔'
          })
        } else if (diffDays <= 90) {
          checks.push({
            name: '效期检查',
            passed: true,
            message: `即将到期，剩余 ${diffDays} 天`,
            severity: 'warning',
            icon: '⚠️'
          })
        } else {
          checks.push({
            name: '效期检查',
            passed: true,
            message: `效期正常，剩余 ${diffDays} 天`,
            severity: 'success',
            icon: '✅'
          })
        }
      }

      // 6. 查询次数统计（艾佰瑞特色）
      const existingQueries = verifyRecords.value.filter(r =>
        r.udiPi === parsed.pi || r.serialNo === parsed.serialNo
      )
      const queryCount = existingQueries.length + 1
      const isFirstQuery = queryCount === 1

      if (!isFirstQuery) {
        status = 'authentic_repeat'
        statusMsg = `该序列号是第${queryCount}次查询`
      } else {
        statusMsg = '该序列号是第1次查询'
      }

      // 7. 构建结果
      const isAuthentic = status === 'authentic' || status === 'authentic_repeat'

      // 生成动态防伪水印
      const watermark = isAuthentic ? generateWatermark({
        productId: product.id,
        batchNo: parsed.batchNo || '',
        serialNo: parsed.serialNo || '',
        queryCount
      }) : undefined

      lastResult.value = {
        isAuthentic,
        queryCount,
        productName: product.name,
        batchNo: parsed.batchNo || '-',
        serialNo: parsed.serialNo || '-',
        productionDate: parsed.productionDate || '-',
        expiryDate: parsed.expiryDate || '-',
        manufacturer: product.manufacturer,
        statusBadge: {
          text: isAuthentic ? (isFirstQuery ? '真' : `第${queryCount}次查询`) : statusMsg,
          type: isAuthentic ? 'success' : 'danger',
          icon: isAuthentic ? '✓' : '⚠️'
        },
        checks,
        watermark
      }

      saveRecord(rawCode, parsed, status, statusMsg, checks, operator, isFirstQuery, queryCount)

      return lastResult.value
    } finally {
      isScanning.value = false
    }
  }

  /**
   * 机构查询
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
    verifyInstitution,
    getAuthorizedInstitutions,
    mockProductScan
  }
})
