import { ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  Region, City, Manager, Salesperson,
  Client, Distributor, Product, Order,
  MonthlyIndicator, HeadcountPlan,
  EnhancedDistributor
} from '@/types/sales'
import { DISTRIBUTOR_TIERS } from '@/types/sales'

// ============ Mock Data ============
const mockRegions: Region[] = [
  { id: 'r1', name: '东区', code: 'east' },
  { id: 'r2', name: '南区', code: 'south' },
  { id: 'r3', name: '西区', code: 'west' },
  { id: 'r4', name: '北区', code: 'north' },
  { id: 'r5', name: '中区', code: 'central' }
]

const mockCities: City[] = [
  { id: 'c1', name: '上海', regionId: 'r1' },
  { id: 'c2', name: '杭州', regionId: 'r1' },
  { id: 'c3', name: '南京', regionId: 'r1' },
  { id: 'c4', name: '广州', regionId: 'r2' },
  { id: 'c5', name: '深圳', regionId: 'r2' },
  { id: 'c6', name: '成都', regionId: 'r3' },
  { id: 'c7', name: '重庆', regionId: 'r3' },
  { id: 'c8', name: '北京', regionId: 'r4' },
  { id: 'c9', name: '天津', regionId: 'r4' },
  { id: 'c10', name: '武汉', regionId: 'r5' },
  { id: 'c11', name: '长沙', regionId: 'r5' }
]

const mockManagers: Manager[] = [
  { id: 'm1', name: '张经理', cityId: 'c1', monthlyTarget: 200000, quarterlyTarget: 600000 },
  { id: 'm2', name: '李经理', cityId: 'c4', monthlyTarget: 180000, quarterlyTarget: 540000 },
  { id: 'm3', name: '王经理', cityId: 'c6', monthlyTarget: 150000, quarterlyTarget: 450000 },
  { id: 'm4', name: '刘经理', cityId: 'c8', monthlyTarget: 220000, quarterlyTarget: 660000 },
  { id: 'm5', name: '陈经理', cityId: 'c10', monthlyTarget: 160000, quarterlyTarget: 480000 }
]

const mockSalespeople: Salesperson[] = [
  { id: 's1', name: '小张', managerId: 'm1', monthlyTarget: 50000 },
  { id: 's2', name: '小李', managerId: 'm1', monthlyTarget: 45000 },
  { id: 's3', name: '小王', managerId: 'm2', monthlyTarget: 48000 },
  { id: 's4', name: '小刘', managerId: 'm2', monthlyTarget: 52000 },
  { id: 's5', name: '小陈', managerId: 'm3', monthlyTarget: 40000 },
  { id: 's6', name: '小赵', managerId: 'm4', monthlyTarget: 55000 },
  { id: 's7', name: '小周', managerId: 'm4', monthlyTarget: 50000 },
  { id: 's8', name: '小吴', managerId: 'm5', monthlyTarget: 42000 }
]

const mockProducts: Product[] = [
  { 
    id: 'p1', 
    name: '天新福胶原蛋白填充剂-1ml', 
    category: 'collagen', 
    unit: 'unit', 
    unitsPerBox: 10, 
    assessmentPrice: 2800,
    udiDi: '06901234567890',
    isUDIRequired: true,
    storageTemp: '2-8°C',
    shelfLifeMonths: 24
  },
  { 
    id: 'p2', 
    name: '天新福胶原蛋白填充剂-2ml', 
    category: 'collagen', 
    unit: 'unit', 
    unitsPerBox: 10, 
    assessmentPrice: 4800,
    udiDi: '06901234567891',
    isUDIRequired: true,
    storageTemp: '2-8°C',
    shelfLifeMonths: 24
  },
  { 
    id: 'p3', 
    name: '天新福胶原蛋白水光-5ml', 
    category: 'collagen', 
    unit: 'unit', 
    unitsPerBox: 5, 
    assessmentPrice: 1800,
    udiDi: '06901234567892',
    isUDIRequired: true,
    storageTemp: '2-8°C',
    shelfLifeMonths: 18
  },
  { id: 'p4', name: '玻尿酸A型', category: 'hyaluronic', unit: 'unit', unitsPerBox: 10, assessmentPrice: 500, isUDIRequired: false, shelfLifeMonths: 36 },
  { id: 'p5', name: '肉毒素标准', category: 'botox', unit: 'unit', unitsPerBox: 5, assessmentPrice: 1200, isUDIRequired: false, shelfLifeMonths: 36 },
  { id: 'p6', name: '术后修复套装', category: 'consumable', unit: 'box', unitsPerBox: 1, assessmentPrice: 380, isUDIRequired: false, shelfLifeMonths: 12 }
]

const mockDistributors: Distributor[] = [
  { id: 'd1', name: '华东医美供应链', regionId: 'r1', cityId: 'c1', level: 'gold', contact: '王总', phone: '13800001111', creditLimit: 500000, balance: 120000 },
  { id: 'd2', name: '华南美业集团', regionId: 'r2', cityId: 'c4', level: 'gold', contact: '李总', phone: '13800002222', creditLimit: 400000, balance: 85000 },
  { id: 'd3', name: '西部美容代理', regionId: 'r3', cityId: 'c6', level: 'silver', contact: '张总', phone: '13800003333', creditLimit: 200000, balance: 45000 }
]

const mockClients: Client[] = [
  { id: 'cl1', name: '美丽人生医美诊所', type: 'clinic', channel: 'direct', salespersonId: 's1', cityId: 'c1', level: 'vip' },
  { id: 'cl2', name: '上海颜值医院', type: 'hospital', channel: 'direct', salespersonId: 's1', cityId: 'c1', level: 'key' },
  { id: 'cl3', name: '杭州美颜连锁', type: 'chain', channel: 'distributor', distributorId: 'd1', salespersonId: 's2', cityId: 'c2', level: 'vip' },
  { id: 'cl4', name: '广州丽人诊所', type: 'clinic', channel: 'direct', salespersonId: 's3', cityId: 'c4', level: 'normal' },
  { id: 'cl5', name: '深圳美肤医院', type: 'hospital', channel: 'distributor', distributorId: 'd2', salespersonId: 's4', cityId: 'c5', level: 'key' },
  { id: 'cl6', name: '成都美丽坊', type: 'clinic', channel: 'direct', salespersonId: 's5', cityId: 'c6', level: 'normal' },
  { id: 'cl7', name: '北京颜研所', type: 'chain', channel: 'hybrid', distributorId: 'd3', salespersonId: 's6', cityId: 'c8', level: 'vip' },
  { id: 'cl8', name: '武汉美肤堂', type: 'clinic', channel: 'direct', salespersonId: 's8', cityId: 'c10', level: 'normal' }
]

// Generate mock orders
const generateMockOrders = (): Order[] => {
  const orders: Order[] = []
  const statuses: Order['status'][] = ['completed', 'confirmed', 'shipped', 'pending', 'cancelled']

  for (let i = 0; i < 100; i++) {
    const client = mockClients[Math.floor(Math.random() * mockClients.length)]
    const salesperson = mockSalespeople.find(s => s.id === client.salespersonId)!
    const distributor = client.distributorId ? mockDistributors.find(d => d.id === client.distributorId) : null
    const product = mockProducts[Math.floor(Math.random() * mockProducts.length)]
    const quantity = Math.floor(Math.random() * 20) + 1
    const totalAmount = quantity * product.assessmentPrice

    orders.push({
      id: `o${i + 1}`,
      orderNo: `MAS${String(2024001 + i).padStart(7, '0')}`,
      clientId: client.id,
      clientName: client.name,
      salespersonId: client.salespersonId,
      salespersonName: salesperson.name,
      distributorId: distributor?.id,
      distributorName: distributor?.name,
      channel: client.channel,
      items: [{
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice: product.assessmentPrice,
        totalAmount
      }],
      totalQuantity: quantity,
      totalAmount,
      orderDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      remark: ''
    })
  }
  return orders
}

export const useMedicalCoreStore = defineStore('medicalCore', () => {
  // ============ State ============
  const regions = ref<Region[]>(mockRegions)
  const cities = ref<City[]>(mockCities)
  const managers = ref<Manager[]>(mockManagers)
  const salespeople = ref<Salesperson[]>(mockSalespeople)
  const products = ref<Product[]>(mockProducts)
  const distributors = ref<Distributor[]>(mockDistributors)
  const clients = ref<Client[]>(mockClients)
  const orders = ref<Order[]>(generateMockOrders())
  const indicators = ref<MonthlyIndicator[]>([])
  const headcountPlans = ref<HeadcountPlan[]>([])

  // ============ Getters ============
  const getCitiesByRegion = (regionId: string) => cities.value.filter(c => c.regionId === regionId)
  const getManagersByCity = (cityId: string) => managers.value.filter(m => m.cityId === cityId)
  const getSalespeopleByManager = (managerId: string) => salespeople.value.filter(s => s.managerId === managerId)
  const getClientsBySalesperson = (salespersonId: string) => clients.value.filter(c => c.salespersonId === salespersonId)
  const getOrdersBySalesperson = (salespersonId: string) => orders.value.filter(o => o.salespersonId === salespersonId)
  const getOrdersByClient = (clientId: string) => orders.value.filter(o => o.clientId === clientId)
  const getOrdersByDistributor = (distributorId: string) => orders.value.filter(o => o.distributorId === distributorId)

  // ============ Actions: CRUD ============
  const addOrder = (order: Omit<Order, 'id' | 'orderNo'>) => {
    const maxId = orders.value.reduce((max, o) => Math.max(max, parseInt(o.id.slice(1))), 0)
    const newOrder: Order = {
      ...order,
      id: `o${maxId + 1}`,
      orderNo: `MAS${String(2024001 + maxId).padStart(7, '0')}`
    }
    orders.value.unshift(newOrder)
    return newOrder
  }

  const updateOrder = (id: string, updates: Partial<Order>) => {
    const idx = orders.value.findIndex(o => o.id === id)
    if (idx >= 0) {
      orders.value[idx] = { ...orders.value[idx], ...updates }
      return orders.value[idx]
    }
    return null
  }

  const deleteOrder = (id: string) => {
    const idx = orders.value.findIndex(o => o.id === id)
    if (idx >= 0) {
      orders.value.splice(idx, 1)
      return true
    }
    return false
  }

  const addClient = (client: Omit<Client, 'id'>) => {
    const maxId = clients.value.reduce((max, c) => Math.max(max, parseInt(c.id.slice(2))), 0)
    const newClient: Client = { ...client, id: `cl${maxId + 1}` }
    clients.value.push(newClient)
    return newClient
  }

  const addDistributor = (distributor: Omit<Distributor, 'id'>) => {
    const maxId = distributors.value.reduce((max, d) => Math.max(max, parseInt(d.id.slice(1))), 0)
    const newDistributor: Distributor = { ...distributor, id: `d${maxId + 1}` }
    distributors.value.push(newDistributor)
    return newDistributor
  }

  // ============ Actions: Batch Import ============
  const importOrders = (newOrders: Order[]) => {
    orders.value = [...newOrders, ...orders.value]
    return newOrders.length
  }

  const importClients = (newClients: Client[]) => {
    clients.value = [...clients.value, ...newClients]
    return newClients.length
  }

  const importSalespeople = (newSalespeople: Salesperson[]) => {
    salespeople.value = [...salespeople.value, ...newSalespeople]
    return newSalespeople.length
  }

  const importProducts = (newProducts: Product[]) => {
    products.value = [...products.value, ...newProducts]
    return newProducts.length
  }

  const importDistributors = (newDistributors: Distributor[]) => {
    distributors.value = [...distributors.value, ...newDistributors]
    return newDistributors.length
  }

  const importIndicators = (newIndicators: MonthlyIndicator[]) => {
    indicators.value = [...indicators.value, ...newIndicators]
    return newIndicators.length
  }

  const importHeadcountPlans = (newPlans: HeadcountPlan[]) => {
    headcountPlans.value = [...headcountPlans.value, ...newPlans]
    return newPlans.length
  }

  // ============ Actions: Clear ============
  const clearOrders = () => { orders.value = [] }
  const clearClients = () => { clients.value = [] }
  const clearProducts = () => { products.value = [] }
  const clearDistributors = () => { distributors.value = [] }
  const clearIndicators = () => { indicators.value = [] }
  const clearHeadcountPlans = () => { headcountPlans.value = [] }

  // ============ Actions: Distributor Tiers ============
  const calculateDistributorTiers = () => {
    distributors.value = distributors.value.map(d => {
      const dist = d as EnhancedDistributor
      const monthlyPurchase = dist.monthlyPurchase || 0
      const sortedTiers = [...DISTRIBUTOR_TIERS].sort((a, b) => b.minMonthlyPurchase - a.minMonthlyPurchase)
      const matchedTier = sortedTiers.find(t => monthlyPurchase >= t.minMonthlyPurchase)

      if (matchedTier) {
        const rebateAmount = monthlyPurchase * (matchedTier.rebateRate / 100)
        const commissionAmount = monthlyPurchase * (matchedTier.commissionRate / 100)

        return {
          ...d,
          tier: matchedTier.tier,
          level: matchedTier.tier === 'three_star' ? 'gold' : matchedTier.tier === 'two_star' ? 'silver' : 'normal',
          rebateAmount,
          commissionAmount
        } as EnhancedDistributor
      }
      return d as EnhancedDistributor
    })
  }

  return {
    // State
    regions, cities, managers, salespeople,
    products, distributors, clients, orders,
    indicators, headcountPlans,
    // Getters
    getCitiesByRegion, getManagersByCity, getSalespeopleByManager,
    getClientsBySalesperson, getOrdersBySalesperson, getOrdersByClient, getOrdersByDistributor,
    // CRUD
    addOrder, updateOrder, deleteOrder,
    addClient, addDistributor,
    // Batch Import
    importOrders, importClients, importSalespeople,
    importProducts, importDistributors, importIndicators, importHeadcountPlans,
    // Clear
    clearOrders, clearClients, clearProducts, clearDistributors, clearIndicators, clearHeadcountPlans,
    // Tiers
    calculateDistributorTiers
  }
})
