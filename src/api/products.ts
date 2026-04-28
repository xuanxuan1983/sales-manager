// ============ 产品管理 API 实现 ============

import { http } from '@/utils/request'
import type {
  Product,
  ProductBatch,
  UDIInfo,
  UDITraceItem
} from '../../api/products'
import type { PaginatedResponse, PaginationParams } from '../../api/types'

/** 获取产品列表 */
export const getProducts = (params?: PaginationParams & { keyword?: string; category?: string }) =>
  http.get<PaginatedResponse<Product>>('/products', { params })

/** 获取产品详情 */
export const getProductDetail = (id: string) =>
  http.get<Product>(`/products/${id}`)

/** 获取产品批次列表 */
export const getProductBatches = (productId: string, params?: PaginationParams) =>
  http.get<PaginatedResponse<ProductBatch>>(`/products/${productId}/batches`, { params })

/** 获取批次UDI列表 */
export const getBatchUDIs = (batchNo: string, params?: PaginationParams) =>
  http.get<PaginatedResponse<UDIInfo>>(`/batches/${batchNo}/udis`, { params })

/** UDI追溯 */
export const getUDITrace = (udiPi: string) =>
  http.get<UDITraceItem[]>(`/udi/${udiPi}/trace`)
