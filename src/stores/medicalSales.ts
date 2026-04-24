import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type {
    Region, City, Manager, Salesperson,
    Client, Distributor, Product, Order,
    Target, Collection, Alert,
    RegionStats, Channel, MonthlyIndicator, HeadcountPlan, EnhancedDistributor
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
    { id: 'p1', name: '玻尿酸A型', category: 'hyaluronic', unit: 'unit', unitsPerBox: 10, assessmentPrice: 500 },
    { id: 'p2', name: '玻尿酸B型', category: 'hyaluronic', unit: 'unit', unitsPerBox: 10, assessmentPrice: 680 },
    { id: 'p3', name: '肉毒素标准', category: 'botox', unit: 'unit', unitsPerBox: 5, assessmentPrice: 1200 },
    { id: 'p4', name: '肉毒素精华', category: 'botox', unit: 'unit', unitsPerBox: 5, assessmentPrice: 1800 },
    { id: 'p5', name: '光电美肤仪', category: 'device', unit: 'unit', unitsPerBox: 1, assessmentPrice: 28000 },
    { id: 'p6', name: '术后修复套装', category: 'consumable', unit: 'box', unitsPerBox: 1, assessmentPrice: 380 }
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
    const statuses: Order['status'][] = ['completed', 'confirmed', 'shipped', 'pending']

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

// ============ Store ============
export const useMedicalSalesStore = defineStore('medicalSales', () => {
    const regions = ref<Region[]>(mockRegions)
    const cities = ref<City[]>(mockCities)
    const managers = ref<Manager[]>(mockManagers)
    const salespeople = ref<Salesperson[]>(mockSalespeople)
    const products = ref<Product[]>(mockProducts)
    const distributors = ref<Distributor[]>(mockDistributors)
    const clients = ref<Client[]>(mockClients)
    const orders = ref<Order[]>(generateMockOrders())
    const alerts = ref<Alert[]>([])

    // New State
    const indicators = ref<MonthlyIndicator[]>([])
    const headcountPlans = ref<HeadcountPlan[]>([])

    // ============ Target Management State ============
    // Global company target (Annual)
    const globalTarget = ref<{ year: number, salesA: number, salesB: number }>({
        year: new Date().getFullYear(),
        salesA: 0, // 进货总目标
        salesB: 0  // 纯销总目标
    })



    // Simulated "City Level" National Statistics (Source: 2024 Bureau of Statistics Mock)
    // Unit: GDP (Billion RMB), Pop (Million)
    // Dynamic "City Level" Economics (Now Reactive for Import)
    const cityEconomicStats = ref<Record<string, { gdp: number, pop: number, name: string }>>({
        'c1': { name: '上海', gdp: 47200, pop: 24.8 },
        'c2': { name: '杭州', gdp: 20059, pop: 12.5 },
        'c3': { name: '南京', gdp: 17400, pop: 9.5 },
        'c4': { name: '广州', gdp: 30400, pop: 18.8 },
        'c5': { name: '深圳', gdp: 34600, pop: 17.6 },
        'c6': { name: '成都', gdp: 22000, pop: 21.4 },
        'c7': { name: '重庆', gdp: 30100, pop: 32.1 },
        'c8': { name: '北京', gdp: 43700, pop: 21.8 },
        'c9': { name: '天津', gdp: 16700, pop: 13.6 },
        'c10': { name: '武汉', gdp: 20000, pop: 13.7 },
        'c11': { name: '长沙', gdp: 14300, pop: 10.4 }
    })

    // Dynamic Region Market Stats (Aggregated from City Data)
    const regionMarketStats = computed(() => {
        const stats: Record<string, { gdpPerCapita: number, population: number, totalGdp: number }> = {}

        regions.value.forEach(r => {
            const regionCities = cities.value.filter(c => c.regionId === r.id)
            let totalGdp = 0
            let totalPop = 0

            regionCities.forEach(c => {
                const cityStat = cityEconomicStats.value[c.id]
                if (cityStat) {
                    totalGdp += cityStat.gdp
                    totalPop += cityStat.pop
                }
            })

            // Calculate weighted stats
            // Per Capita = Total GDP * 100000000 / (Total Pop * 1000000) = (Total GDP / Total Pop) * 100
            stats[r.id] = {
                totalGdp: totalGdp, // Billions
                population: totalPop, // Millions
                gdpPerCapita: totalPop ? Math.round((totalGdp / totalPop) * 10000) : 0
            }
        })
        return stats
    })

    // Region targets (Map regionId -> Target info)

    // Region targets (Map regionId -> Target info)
    // We treat this as the "System of Record" for top-down targets
    const regionTargets = ref<Record<string, { salesA: number, salesB: number }>>({})

    // ============ Scenario Planning State ============
    // Multipliers for different scenarios (default values)
    const scenarios = ref({
        baseMultiplier: 1.0,
        worstMultiplier: 0.8, // 保底
        bestMultiplier: 1.2   // 冲刺
    })
    // Active scenario key (base | worst | best)
    const activeScenarioKey = ref<'base' | 'worst' | 'best'>('base')
    // Computed target based on active scenario and multipliers
    const currentTarget = computed(() => {
        const base = globalTarget.value
        const mult = scenarios.value
        let factor = 1
        if (activeScenarioKey.value === 'worst') factor = mult.worstMultiplier
        else if (activeScenarioKey.value === 'best') factor = mult.bestMultiplier
        else factor = mult.baseMultiplier
        return {
            salesA: Math.round(base.salesA * factor),
            salesB: Math.round(base.salesB * factor)
        }
    })
    // Persist scenario settings to localStorage
    const SCENARIO_STORAGE = 'sales-manager-scenarios'
    const loadScenarioFromStorage = () => {
        const raw = localStorage.getItem(SCENARIO_STORAGE)
        if (raw) {
            try {
                const parsed = JSON.parse(raw)
                scenarios.value = parsed.scenarios || scenarios.value
                activeScenarioKey.value = parsed.activeScenarioKey || activeScenarioKey.value
            } catch (e) { console.error('Failed to parse scenario storage', e) }
        }
    }
    const saveScenarioToStorage = () => {
        const payload = { scenarios: scenarios.value, activeScenarioKey: activeScenarioKey.value }
        localStorage.setItem(SCENARIO_STORAGE, JSON.stringify(payload))
    }
    // Load on init
    loadScenarioFromStorage()
    // Watch for changes and persist
    watch([scenarios, activeScenarioKey], saveScenarioToStorage, { deep: true })

    // ============ Getters ============
    const getCitiesByRegion = (regionId: string) => cities.value.filter(c => c.regionId === regionId)
    const getManagersByCity = (cityId: string) => managers.value.filter(m => m.cityId === cityId)
    const getSalespeopleByManager = (managerId: string) => salespeople.value.filter(s => s.managerId === managerId)
    const getClientsBySalesperson = (salespersonId: string) => clients.value.filter(c => c.salespersonId === salespersonId)
    const getOrdersBySalesperson = (salespersonId: string) => orders.value.filter(o => o.salespersonId === salespersonId)
    const getOrdersByClient = (clientId: string) => orders.value.filter(o => o.clientId === clientId)
    const getOrdersByDistributor = (distributorId: string) => orders.value.filter(o => o.distributorId === distributorId)

    // Region stats
    const regionStats = computed<RegionStats[]>(() => {
        return regions.value.map(region => {
            const regionCities = getCitiesByRegion(region.id)
            const cityIds = regionCities.map(c => c.id)
            const regionClients = clients.value.filter(c => cityIds.includes(c.cityId))
            const regionDistributors = distributors.value.filter(d => d.regionId === region.id)

            const regionSalespeople = salespeople.value.filter(s => {
                const manager = managers.value.find(m => m.id === s.managerId)
                return manager && cityIds.includes(manager.cityId)
            })
            const salespersonIds = regionSalespeople.map(s => s.id)

            const regionOrders = orders.value.filter(o => salespersonIds.includes(o.salespersonId))
            const totalAmount = regionOrders.reduce((sum, o) => sum + o.totalAmount, 0)
            const totalQuantity = regionOrders.reduce((sum, o) => sum + o.totalQuantity, 0)
            const targetAmount = regionSalespeople.reduce((sum, s) => sum + s.monthlyTarget, 0)

            return {
                regionId: region.id,
                regionName: region.name,
                totalAmount,
                totalQuantity,
                orderCount: regionOrders.length,
                targetAmount,
                completion: targetAmount ? Math.round(totalAmount / targetAmount * 100) : 0,
                clientCount: regionClients.length,
                distributorCount: regionDistributors.length
            }
        })
    })

    // Overall stats
    const overallStats = computed(() => ({
        totalRegions: regions.value.length,
        totalCities: cities.value.length,
        totalManagers: managers.value.length,
        totalSalespeople: salespeople.value.length,
        totalClients: clients.value.length,
        totalDistributors: distributors.value.length,
        totalOrders: orders.value.length,
        totalAmount: orders.value.reduce((sum, o) => sum + o.totalAmount, 0),
        totalQuantity: orders.value.reduce((sum, o) => sum + o.totalQuantity, 0),
        directAmount: orders.value.filter(o => o.channel === 'direct').reduce((sum, o) => sum + o.totalAmount, 0),
        distributorAmount: orders.value.filter(o => o.channel === 'distributor').reduce((sum, o) => sum + o.totalAmount, 0)
    }))

    // ============ Actions ============
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

    // Batch import actions
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

    // New Import Actions
    const importDistributors = (newDistributors: Distributor[]) => {
        // Here we merge or replace. For simplicity, append but typically update if id exists.
        // Assuming unique IDs generated during import.
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

    const clearOrders = () => {
        orders.value = []
    }

    const clearClients = () => {
        clients.value = []
    }

    const clearProducts = () => {
        products.value = []
    }

    const clearDistributors = () => {
        distributors.value = []
    }

    const clearIndicators = () => {
        indicators.value = []
    }

    const clearHeadcountPlans = () => {
        headcountPlans.value = []
    }

    // ============ Calculation Actions ============
    const calculateDistributorTiers = () => {
        distributors.value = distributors.value.map(d => {
            const dist = d as EnhancedDistributor
            const monthlyPurchase = dist.monthlyPurchase || 0
            // Find appropriate tier
            // Sort tiers by minMonthlyPurchase desc to find highest matching
            const sortedTiers = [...DISTRIBUTOR_TIERS].sort((a, b) => b.minMonthlyPurchase - a.minMonthlyPurchase)
            const matchedTier = sortedTiers.find(t => monthlyPurchase >= t.minMonthlyPurchase)

            if (matchedTier) {
                // Calculate rebate and commission
                // Assuming rebate is simple percentage of monthly purchase for now
                const rebateAmount = monthlyPurchase * (matchedTier.rebateRate / 100)
                const commissionAmount = monthlyPurchase * (matchedTier.commissionRate / 100)

                return {
                    ...d,
                    tier: matchedTier.tier,
                    level: matchedTier.tier === 'three_star' ? 'gold' : matchedTier.tier === 'two_star' ? 'silver' : 'normal', // Map star to legacy level if needed
                    rebateAmount,
                    commissionAmount
                } as EnhancedDistributor
            }
            return d as EnhancedDistributor
        })
    }

    // ============ Target Administration Actions ============
    const setGlobalTarget = (salesA: number, salesB: number) => {
        globalTarget.value.salesA = salesA
        globalTarget.value.salesB = salesB
    }

    const setRegionTarget = (regionId: string, salesA: number, salesB: number) => {
        if (!regionTargets.value[regionId]) {
            regionTargets.value[regionId] = { salesA: 0, salesB: 0 }
        }
        regionTargets.value[regionId].salesA = salesA
        regionTargets.value[regionId].salesB = salesB
    }

    // Helper: Calculate unallocated amount
    const getUnallocatedTarget = computed(() => {
        const allocatedA = Object.values(regionTargets.value).reduce((sum, t) => sum + t.salesA, 0)
        const allocatedB = Object.values(regionTargets.value).reduce((sum, t) => sum + t.salesB, 0)
        return {
            salesA: globalTarget.value.salesA - allocatedA,
            salesB: globalTarget.value.salesB - allocatedB
        }
    })

    // ============ Persistence (Auto-Save) ============
    const STORAGE_KEY = 'sales-manager-targets-v1'

    // Init from storage
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
        try {
            const parsed = JSON.parse(stored)
            if (parsed.global) globalTarget.value = parsed.global
            if (parsed.regions) regionTargets.value = parsed.regions
        } catch (e) {
            console.error('Failed to load targets from storage', e)
        }
    }

    // Watch and save
    watch([globalTarget, regionTargets], ([newGlobal, newRegions]) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            global: newGlobal,
            regions: newRegions
        }))
    }, { deep: true })

    const importCityStats = (newStats: Record<string, { gdp: number, pop: number, name: string }>) => {
        // Merge strategy: Overwrite matching IDs, keep others
        cityEconomicStats.value = { ...cityEconomicStats.value, ...newStats }
        return Object.keys(newStats).length
    }

    return {
        // Data
        regions,
        cities,
        managers,
        salespeople,
        products,
        distributors,
        clients,
        orders,
        alerts,
        indicators,
        headcountPlans,
        // Scenario state
        scenarios,
        activeScenarioKey,
        currentTarget,
        // Getters
        getCitiesByRegion,
        getManagersByCity,
        getSalespeopleByManager,
        getClientsBySalesperson,
        getOrdersBySalesperson,
        getOrdersByClient,
        getOrdersByDistributor,
        regionStats,
        overallStats,
        // Additional exposed state for UI
        globalTarget,
        regionTargets,
        regionMarketStats,
        cityEconomicStats,
        getUnallocatedTarget,
        // Actions
        addOrder,
        addClient,
        addDistributor,
        importOrders,
        importClients,
        importSalespeople,
        importProducts,
        importDistributors,
        importIndicators,
        importHeadcountPlans,
        importCityStats,
        clearOrders,
        clearClients,
        clearProducts,
        clearDistributors,
        clearIndicators,
        clearHeadcountPlans,
        calculateDistributorTiers,
        // Scenario helpers
        setGlobalTarget,
        setRegionTarget
    } as const
})
