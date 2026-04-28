// ============ API 通用类型定义 ============

/** API 统一响应格式 */
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  timestamp: string
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** API 错误码 */
export enum ApiErrorCode {
  SUCCESS = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_ERROR = 500,
  // 业务错误码
  PRODUCT_NOT_FOUND = 1001,
  BATCH_NOT_FOUND = 1002,
  UDI_INVALID = 1003,
  BATCH_EXPIRED = 1004,
  BATCH_RECALLED = 1005,
  INSTITUTION_NOT_FOUND = 2001,
  SCAN_LIMIT_EXCEEDED = 3001,
}

/** 分页查询参数 */
export interface PaginationParams {
  page?: number
  pageSize?: number
  sortField?: string
  sortOrder?: 'asc' | 'desc'
}

/** 时间范围查询 */
export interface DateRangeParams {
  startDate?: string
  endDate?: string
}
