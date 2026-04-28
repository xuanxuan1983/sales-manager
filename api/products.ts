// ============ 产品管理 API 接口定义 ============

import type { ApiResponse, PaginatedResponse, PaginationParams } from './types'

/** 产品信息 */
export interface Product {
  id: string
  name: string
  spec: string           // 规格
  category: string
  udiDi: string          // UDI-DI
  manufacturer: string   // 生产企业
  storageTemp: string    // 储存温度
  shelfLifeMonths: number // 保质期（月）
  isUDIRequired: boolean
  status: 'active' | 'discontinued' | 'pending'
  createdAt: string
  updatedAt: string
}

/** 产品批次 */
export interface ProductBatch {
  id: string
  productId: string
  productName: string
  batchNo: string
  productionDate: string
  expiryDate: string
  quantity: number       // 入库数量
  remaining: number      // 剩余数量
  storageTemp: string
  status: 'in_stock' | 'shipping' | 'sold_out' | 'expired' | 'recalled'
  udiCount: number       // UDI码数量
  createdAt: string
}

/** UDI 信息 */
export interface UDIInfo {
  id: string
  di: string             // UDI-DI
  pi: string             // UDI-PI
  batchNo: string
  serialNo: string
  productId: string
  productName: string
  productionDate: string
  expiryDate: string
  status: 'in_stock' | 'sold' | 'used' | 'recalled'
}

// ============ API 接口声明 ==========

/** GET /api/products - 产品列表 */
export type ProductListApi = (params: PaginationParams & { keyword?: string; category?: string }) =>
  Promise<ApiResponse<PaginatedResponse<Product>>>

/** GET /api/products/:id - 产品详情 */
export type ProductDetailApi = (id: string) => Promise<ApiResponse<Product>>

/** GET /api/products/:id/batches - 产品批次列表 */
export type ProductBatchesApi = (productId: string, params: PaginationParams) =>
  Promise<ApiResponse<PaginatedResponse<ProductBatch>>>

/** GET /api/batches/:batchNo/udis - 批次UDI列表 */
export type BatchUDIsApi = (batchNo: string, params: PaginationParams) =>
  Promise<ApiResponse<PaginatedResponse<UDIInfo>>>

/** GET /api/udi/:udiPi/trace - UDI追溯 */
export interface UDITraceItem {
  id: string
  operation: 'inbound' | 'outbound' | 'return' | 'recall'
  from: string
  to: string
  toType: string
  operator: string
  timestamp: string
  orderId?: string
}

export type UDITraceApi = (udiPi: string) => Promise<ApiResponse<UDITraceItem[]>>
