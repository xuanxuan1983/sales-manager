// ============ 扫码验真 API 实现 ============

import { http } from '@/utils/request'
import type {
  ScanVerifyRequest,
  ScanVerifyResponse,
  ScanRecord,
  ScanStats
} from '../../api/scan'
import type { PaginatedResponse, PaginationParams } from '../../api/types'

/** 扫码验证 */
export const verifyScan = (data: ScanVerifyRequest) =>
  http.post<ScanVerifyResponse>('/scan/verify', data)

/** 获取扫码记录 */
export const getScanRecords = (params?: PaginationParams) =>
  http.get<PaginatedResponse<ScanRecord>>('/scan/records', { params })

/** 获取扫码统计 */
export const getScanStats = () =>
  http.get<ScanStats>('/scan/stats')

/** 获取扫码记录详情 */
export const getScanRecordDetail = (id: string) =>
  http.get<ScanRecord>(`/scan/records/${id}`)
