// ============ 区域层级 ============
export interface Region {
    id: string
    name: '东区' | '南区' | '西区' | '北区' | '中区'
    code: 'east' | 'south' | 'west' | 'north' | 'central'
}

export interface City {
    id: string
    name: string
    regionId: string
}

// ============ 人员层级 ============
export interface Manager {
    id: string
    name: string
    cityId: string
    phone?: string
    monthlyTarget: number
    quarterlyTarget: number
}

export interface Salesperson {
    id: string
    name: string
    managerId: string
    phone?: string
    monthlyTarget: number
}

// ============ 客户管理 ============
export type Channel = 'direct' | 'distributor' | 'hybrid'
export type ClientLevel = 'vip' | 'key' | 'normal'
export type ClientType = 'clinic' | 'hospital' | 'chain'

export interface Client {
    id: string
    name: string
    type: ClientType
    channel: Channel
    distributorId?: string
    salespersonId: string
    cityId: string
    level: ClientLevel
    contact?: string
    phone?: string
    address?: string
}

export interface Distributor {
    id: string
    name: string
    regionId: string
    cityId: string
    level: 'gold' | 'silver' | 'normal'
    contact: string
    phone: string
    creditLimit: number
    balance: number  // 应收余额
}

// ============ 产品管理 ============
export type ProductUnit = 'unit' | 'box'  // 支/盒
export type ProductCategory = 'hyaluronic' | 'botox' | 'device' | 'consumable' | 'other'

export interface Product {
    id: string
    name: string
    category: ProductCategory
    unit: ProductUnit
    unitsPerBox: number  // 每盒多少支
    assessmentPrice: number  // 考核价
    retailPrice?: number  // 零售价
}

// ============ 订单管理 ============
export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'completed' | 'cancelled'

export interface OrderItem {
    productId: string
    productName: string
    quantity: number  // 数量（支或盒）
    unitPrice: number
    totalAmount: number
}

export interface Order {
    id: string
    orderNo: string
    clientId: string
    clientName: string
    salespersonId: string
    salespersonName: string
    distributorId?: string
    distributorName?: string
    channel: Channel
    items: OrderItem[]
    totalQuantity: number
    totalAmount: number
    orderDate: string
    status: OrderStatus
    remark?: string
}

// ============ 目标管理 ============
export type TargetType = 'annual' | 'quarterly' | 'monthly'
export type TargetLevel = 'national' | 'region' | 'city' | 'manager' | 'salesperson'

export interface Target {
    id: string
    type: TargetType
    level: TargetLevel
    entityId: string  // 对应实体ID
    targetAmount: number
    targetQuantity: number
    period: string  // 2024 / 2024-Q1 / 2024-01
    actualAmount: number
    actualQuantity: number
}

// ============ 回款管理 ============
export type CollectionStatus = 'pending' | 'partial' | 'completed'

export interface Collection {
    id: string
    orderId: string
    orderNo: string
    clientId: string
    clientName: string
    orderAmount: number
    collectedAmount: number
    remainingAmount: number
    dueDate: string
    status: CollectionStatus
    lastCollectionDate?: string
}

// ============ 预警 ============
export type AlertType = 'target' | 'churn' | 'overdue'
export type AlertSeverity = 'high' | 'medium' | 'low'

export interface Alert {
    id: string
    type: AlertType
    severity: AlertSeverity
    title: string
    description: string
    entityId: string
    entityType: 'salesperson' | 'manager' | 'client' | 'region'
    createdAt: string
    isRead: boolean
}

// ============ 统计 ============
export interface RegionStats {
    regionId: string
    regionName: string
    totalAmount: number
    totalQuantity: number
    orderCount: number
    targetAmount: number
    completion: number
    clientCount: number
    distributorCount: number
}

export interface SalespersonStats {
    id: string
    name: string
    managerId: string
    managerName: string
    cityId: string
    cityName: string
    regionId: string
    regionName: string
    totalAmount: number
    totalQuantity: number
    orderCount: number
    targetAmount: number
    completion: number
}

// ============ 代理商分级体系 ============
export type DistributorTier = 'three_star' | 'two_star' | 'one_star'

export interface DistributorTierConfig {
    tier: DistributorTier
    label: string
    minMonthlyPurchase: number  // 最低月进货量
    rebateRate: number          // 返货比例 (%)
    commissionRate: number      // 提成比例 (%)
    icon: string                // 星级图标
}

export const DISTRIBUTOR_TIERS: DistributorTierConfig[] = [
    { tier: 'three_star', label: '三星级', minMonthlyPurchase: 1200, rebateRate: 30, commissionRate: 20, icon: '⭐⭐⭐' },
    { tier: 'two_star', label: '二星级', minMonthlyPurchase: 800, rebateRate: 20, commissionRate: 15, icon: '⭐⭐' },
    { tier: 'one_star', label: '一星级', minMonthlyPurchase: 500, rebateRate: 10, commissionRate: 10, icon: '⭐' }
]

export interface EnhancedDistributor extends Distributor {
    tier: DistributorTier
    monthlyPurchase: number     // 当月进货量
    rebateAmount: number        // 返货金额
    commissionAmount: number    // 提成金额
    salesATarget: number        // Sales-A 目标
    salesAActual: number        // Sales-A 实际
    salesBTarget: number        // Sales-B 目标
    salesBActual: number        // Sales-B 实际
}

// ============ 双渠道指标 ============
export type IndicatorType = 'sales_a' | 'sales_b'
export type IndicatorPeriod = 'annual' | 'quarterly' | 'monthly'

export interface DualChannelIndicator {
    id: string
    period: string              // 2024 / 2024-Q1 / 2024-01
    periodType: IndicatorPeriod
    entityType: 'national' | 'region' | 'city' | 'distributor' | 'salesperson'
    entityId: string
    entityName: string
    salesATarget: number        // 集团进货目标
    salesAActual: number        // 集团进货实际
    salesACompletion: number    // 完成率 (%)
    salesBTarget: number        // 机构进货目标
    salesBActual: number        // 机构进货实际
    salesBCompletion: number    // 完成率 (%)
}

export interface MonthlyIndicator {
    month: number               // 1-12
    year: number                // 2024
    salesATarget: number
    salesAActual: number
    salesBTarget: number
    salesBActual: number
    headcountPlan: number       // 计划人数
    headcountActual: number     // 实际到岗

    // Granularity fields
    regionName?: string         // 大区
    regionManagerName?: string  // 大区经理
    areaManagerName?: string    // 地区经理/城市经理
    salespersonName?: string    // 销售人员
}

// ============ 人员配置规划 ============
export type HeadcountStatus = 'planned' | 'recruiting' | 'onboarded' | 'resigned'

export interface HeadcountPlan {
    id: string
    regionId: string
    regionName: string
    cityId?: string
    cityName?: string
    year: number
    month: number
    plannedCount: number        // 计划人数
    actualCount: number         // 实际到岗
    recruitingCount: number     // 招聘中
    resignedCount: number       // 离职
    bonusPool: number           // 奖金池 (万)
}

export interface SalespersonEnhanced extends Salesperson {
    regionId: string
    regionName: string
    cityId: string
    cityName: string
    hireDate: string
    status: HeadcountStatus
    salesATarget: number
    salesAActual: number
    salesBTarget: number
    salesBActual: number
}

// ============ 返货/提成计算 ============
export interface RebateRecord {
    id: string
    distributorId: string
    distributorName: string
    tier: DistributorTier
    month: string               // 2024-01
    purchaseAmount: number      // 进货金额
    rebateRate: number          // 返货比例
    rebateAmount: number        // 返货金额
    rebateStatus: 'pending' | 'approved' | 'settled'
}

export interface CommissionRecord {
    id: string
    salespersonId: string
    salespersonName: string
    month: string
    salesAmount: number         // 销售金额
    commissionRate: number      // 提成比例
    commissionAmount: number    // 提成金额
    status: 'pending' | 'approved' | 'paid'
}

