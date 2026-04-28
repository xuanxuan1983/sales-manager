// ============ 扫码验真 API 接口定义 ============

import type { ApiResponse, PaginatedResponse, PaginationParams } from './types'

/** 扫码验证请求 */
export interface ScanVerifyRequest {
  rawCode: string        // 原始扫码内容
  operator?: string      // 操作人
  operatorId?: string    // 操作人ID
  institution?: string   // 使用机构
  location?: string      // 地理位置
  deviceId?: string      // 设备ID
}

/** 扫码验证响应 */
export interface ScanVerifyResponse {
  isAuthentic: boolean
  queryCount: number
  isFirstQuery: boolean
  productName: string
  batchNo: string
  serialNo: string
  productionDate: string
  expiryDate: string
  manufacturer: string
  status: 'authentic' | 'authentic_repeat' | 'expired' | 'recalled' | 'not_found'
  statusMessage: string
  checks: Array<{
    name: string
    passed: boolean
    message: string
    severity: 'success' | 'warning' | 'error'
  }>
  watermark?: {
    token: string
    timestamp: string
    hash: string
    gradient: string
  }
}

/** 查询记录 */
export interface ScanRecord {
  id: string
  rawCode: string
  status: string
  productName?: string
  batchNo?: string
  serialNo?: string
  operator: string
  institution?: string
  scannedAt: string
  queryCount: number
}

/** 扫码统计 */
export interface ScanStats {
  totalScans: number
  authenticScans: number
  fakeScans: number
  expiredScans: number
  recalledScans: number
  todayScans: number
}

// ============ API 接口声明 ==========

/** POST /api/scan/verify - 扫码验证 */
export type ScanVerifyApi = (req: ScanVerifyRequest) => Promise<ApiResponse<ScanVerifyResponse>>

/** GET /api/scan/records - 查询记录列表 */
export type ScanRecordsApi = (params: PaginationParams) => Promise<ApiResponse<PaginatedResponse<ScanRecord>>>

/** GET /api/scan/stats - 扫码统计 */
export type ScanStatsApi = () => Promise<ApiResponse<ScanStats>>

/** GET /api/scan/records/:id - 查询记录详情 */
export type ScanRecordDetailApi = (id: string) => Promise<ApiResponse<ScanRecord>>
