// ============ 扫码验证相关类型 ============
// 参考艾佰瑞扫码验真流程设计

import type { GS1ParseResult } from '@/utils/gs1Parser'

/** 扫码验证场景 */
export type ScanScenario = 'product_verify' | 'inbound' | 'outbound' | 'trace' | 'recall' | 'institution_check'

/** 扫码验证结果状态 */
export type ScanVerifyStatus =
  | 'pending'      // 待验证
  | 'authentic'    // 正品（第1次查询）
  | 'authentic_repeat' // 正品（重复查询）
  | 'invalid'      // 验证失败（格式错误）
  | 'expired'      // 产品已过期
  | 'not_found'    // 系统中未找到（疑似假货）
  | 'recalled'     // 已召回
  | 'unauthorized' // 无权限操作

/** 产品扫码验证记录 */
export interface ProductVerifyRecord {
  id: string
  scenario: ScanScenario
  rawCode: string           // 原始扫码内容（UDI码或序列号）
  parsedResult: GS1ParseResult | null

  // 验证状态
  status: ScanVerifyStatus
  statusMessage: string
  isFirstQuery: boolean     // 是否是第1次查询（艾佰瑞特色）
  queryCount: number        // 累计查询次数

  // 产品信息
  productId?: string
  productName?: string
  productSpec?: string      // 规格
  udiDi?: string
  udiPi?: string
  batchNo?: string
  serialNo?: string
  productionDate?: string
  expiryDate?: string
  manufacturer?: string     // 生产企业

  // 验证详情
  verifyChecks: VerifyCheck[]

  // 操作信息
  operator: string
  operatorId?: string
  institution?: string      // 使用机构
  institutionType?: 'hospital' | 'clinic' | 'beauty_salon'
  location: string
  deviceId?: string

  // 时间戳
  scannedAt: string
  verifiedAt: string

  remark?: string
}

/** 机构查询记录 */
export interface InstitutionVerifyRecord {
  id: string
  institutionName: string
  institutionType: 'hospital' | 'clinic' | 'beauty_salon'
  province: string
  city: string
  address?: string
  contact?: string
  phone?: string
  isAuthorized: boolean     // 是否官方授权
  authorizedProducts: string[] // 授权产品列表
  verifyStatus: 'verified' | 'unverified' | 'suspended'
  queryCount: number
  lastQueryAt?: string
}

/** 单项验证检查 */
export interface VerifyCheck {
  name: string
  passed: boolean
  message: string
  severity: 'info' | 'warning' | 'error' | 'success'
  icon?: string
}

/** 扫码验证统计 */
export interface ScanVerifyStats {
  totalScans: number
  authenticScans: number    // 正品
  fakeScans: number         // 疑似假货
  expiredScans: number
  recalledScans: number
  byScenario: Record<ScanScenario, number>
  byDate: Record<string, number>
}

/** 扫码验证筛选 */
export interface ScanVerifyFilter {
  scenario?: ScanScenario
  status?: ScanVerifyStatus
  dateRange?: [string, string]
  operator?: string
  productId?: string
  batchNo?: string
  institution?: string
}

/** 扫码验证配置 */
export interface ScanVerifyConfig {
  checkExpiry: boolean
  checkDuplicate: boolean
  checkRecall: boolean
  checkAuthorization: boolean
  expiryWarningDays: number
  expiryCriticalDays: number
  duplicateCheckHours: number
  notifyOnInvalid: boolean
  notifyOnExpired: boolean
  notifyOnRecalled: boolean
}

/** 扫码结果展示数据（UI用） */
export interface ScanResultDisplay {
  isAuthentic: boolean
  queryCount: number
  productName: string
  batchNo: string
  serialNo: string
  productionDate: string
  expiryDate: string
  manufacturer: string
  statusBadge: {
    text: string
    type: 'success' | 'warning' | 'danger' | 'info'
    icon: string
  }
  checks: VerifyCheck[]
}
