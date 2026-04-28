// ============ 机构查询 API 实现 ============

import { http } from '@/utils/request'
import type {
  Institution,
  InstitutionQueryRequest,
  InstitutionAuthorization,
  InstitutionVerifyRequest
} from '../../api/institutions'
import type { PaginatedResponse, PaginationParams } from '../../api/types'

/** 获取机构列表 */
export const getInstitutions = (params?: PaginationParams & InstitutionQueryRequest) =>
  http.get<PaginatedResponse<Institution>>('/institutions', { params })

/** 获取机构详情 */
export const getInstitutionDetail = (id: string) =>
  http.get<Institution>(`/institutions/${id}`)

/** 获取机构授权产品 */
export const getInstitutionAuthorizations = (institutionId: string) =>
  http.get<InstitutionAuthorization[]>(`/institutions/${institutionId}/authorizations`)

/** 验证机构授权 */
export const verifyInstitution = (data: InstitutionVerifyRequest) =>
  http.post<{ isAuthorized: boolean; institution?: Institution; message: string }>('/institutions/verify', data)
