import { http } from '@/utils/request'
import type {
  CollagenProjectInstitution,
  CollagenProjectRiskLevel,
  CollagenProjectStage
} from '@/types/collagenProject'
import type { PaginatedResponse, PaginationParams } from '../../api/types'

export interface CollagenProjectQuery extends PaginationParams {
  stage?: '全部' | CollagenProjectStage
  risk?: '全部' | CollagenProjectRiskLevel
  owner?: string
  archiveStatus?: 'active' | 'archived' | 'all'
}

export type CreateCollagenProjectPayload = Omit<
  CollagenProjectInstitution,
  'id' | 'archivedAt' | 'followUpLogs'
>

export type UpdateCollagenProjectPayload = Partial<CreateCollagenProjectPayload>

export interface CompleteCollagenFollowUpPayload {
  result: string
  nextAction: string
}

export type ImportCollagenProjectPayloadItem = CreateCollagenProjectPayload & {
  id?: string
  archivedAt?: string
}

export interface ImportCollagenProjectsPayload {
  projects: ImportCollagenProjectPayloadItem[]
  mode?: 'replace' | 'append'
}

export interface ImportCollagenProjectsResult {
  list: CollagenProjectInstitution[]
  total: number
  imported: number
  mode: 'replace' | 'append'
}

export const getCollagenProjects = (params?: CollagenProjectQuery) =>
  http.get<PaginatedResponse<CollagenProjectInstitution>>('/collagen-projects', { params })

export const getCollagenProjectDetail = (id: string) =>
  http.get<CollagenProjectInstitution>(`/collagen-projects/${id}`)

export const createCollagenProject = (data: CreateCollagenProjectPayload) =>
  http.post<CollagenProjectInstitution>('/collagen-projects', data)

export const importCollagenProjects = (data: ImportCollagenProjectsPayload) =>
  http.post<ImportCollagenProjectsResult>('/collagen-projects/import', data)

export const updateCollagenProject = (id: string, data: UpdateCollagenProjectPayload) =>
  http.patch<CollagenProjectInstitution>(`/collagen-projects/${id}`, data)

export const archiveCollagenProject = (id: string) =>
  http.post<CollagenProjectInstitution>(`/collagen-projects/${id}/archive`)

export const restoreCollagenProject = (id: string) =>
  http.post<CollagenProjectInstitution>(`/collagen-projects/${id}/restore`)

export const completeCollagenFollowUp = (id: string, data: CompleteCollagenFollowUpPayload) =>
  http.post<CollagenProjectInstitution>(`/collagen-projects/${id}/follow-ups`, data)

export const clearCollagenProjects = () =>
  http.delete<{ list: CollagenProjectInstitution[]; total: number }>('/collagen-projects')
