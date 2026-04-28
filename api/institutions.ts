// ============ 机构查询 API 接口定义 ============

import type { ApiResponse, PaginatedResponse, PaginationParams } from './types'

/** 医疗机构 */
export interface Institution {
  id: string
  name: string
  type: 'hospital' | 'clinic' | 'beauty_salon'
  province: string
  city: string
  district?: string
  address?: string
  contact?: string
  phone?: string
  email?: string
  licenseNo?: string      // 医疗机构执业许可证
  isAuthorized: boolean   // 是否官方授权
  authorizedProducts: string[] // 授权产品ID列表
  verifyStatus: 'verified' | 'unverified' | 'suspended'
  createdAt: string
  updatedAt: string
}

/** 机构查询请求 */
export interface InstitutionQueryRequest {
  keyword?: string
  province?: string
  city?: string
  type?: string
  isAuthorized?: boolean
}

/** 机构授权信息 */
export interface InstitutionAuthorization {
  institutionId: string
  institutionName: string
  productId: string
  productName: string
  authorizedAt: string
  expiresAt?: string
  status: 'active' | 'expired' | 'revoked'
}

// ============ API 接口声明 ==========

/** GET /api/institutions - 机构列表 */
export type InstitutionListApi = (params: PaginationParams & InstitutionQueryRequest) =>
  Promise<ApiResponse<PaginatedResponse<Institution>>>

/** GET /api/institutions/:id - 机构详情 */
export type InstitutionDetailApi = (id: string) => Promise<ApiResponse<Institution>>

/** GET /api/institutions/:id/authorizations - 机构授权产品 */
export type InstitutionAuthorizationsApi = (institutionId: string) =>
  Promise<ApiResponse<InstitutionAuthorization[]>>

/** POST /api/institutions/verify - 验证机构授权 */
export interface InstitutionVerifyRequest {
  institutionName: string
  productId?: string
}

export type InstitutionVerifyApi = (req: InstitutionVerifyRequest) =>
  Promise<ApiResponse<{ isAuthorized: boolean; institution?: Institution; message: string }>>
