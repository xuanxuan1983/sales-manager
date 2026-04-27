import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useMedicalCoreStore } from './core'
import type { RegionStats, MedicalSalesKPI } from '@/types/sales'

export const useMedicalKPIStore = defineStore('medicalKPI', () => {
  const core = useMedicalCoreStore()

  // ============ Region Stats ============
  const regionStats = computed<RegionStats[]>(() => {
    return core.regions.map(region => {
      const regionCities = core.getCitiesByRegion(region.id)
      const cityIds = regionCities.map(c => c.id)
      const regionClients = core.clients.filter(c => cityIds.includes(c.cityId))
      const regionDistributors = core.distributors.filter(d => d.regionId === region.id)

      const regionSalespeople = core.salespeople.filter(s => {
        const manager = core.managers.find(m => m.id === s.managerId)
        return manager && cityIds.includes(manager.cityId)
      })
      const salespersonIds = regionSalespeople.map(s => s.id)

      const regionOrders = core.orders.filter(o => salespersonIds.includes(o.salespersonId))
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

  // ============ Overall Stats ============
  const overallStats = computed(() => ({
    totalRegions: core.regions.length,
    totalCities: core.cities.length,
    totalManagers: core.managers.length,
    totalSalespeople: core.salespeople.length,
    totalClients: core.clients.length,
    totalDistributors: core.distributors.length,
    totalOrders: core.orders.length,
    totalAmount: core.orders.reduce((sum, o) => sum + o.totalAmount, 0),
    totalQuantity: core.orders.reduce((sum, o) => sum + o.totalQuantity, 0),
    directAmount: core.orders.filter(o => o.channel === 'direct').reduce((sum, o) => sum + o.totalAmount, 0),
    distributorAmount: core.orders.filter(o => o.channel === 'distributor').reduce((sum, o) => sum + o.totalAmount, 0)
  }))

  // ============ KPI Aggregation ============
  const kpi = computed<MedicalSalesKPI>(() => {
    const total = overallStats.value
    const topRegion = regionStats.value.reduce((max, r) => r.totalAmount > max.totalAmount ? r : max, regionStats.value[0] || { regionName: '-', totalAmount: 0 })

    return {
      totalOrders: total.totalOrders,
      totalAmount: total.totalAmount,
      totalQuantity: total.totalQuantity,
      averageOrderValue: total.totalOrders ? Math.round(total.totalAmount / total.totalOrders) : 0,
      completionRate: total.totalOrders ? Math.round((total.totalOrders / 100) * 100) : 0, // Placeholder logic
      directAmount: total.directAmount,
      distributorAmount: total.distributorAmount,
      directRatio: total.totalAmount ? Math.round((total.directAmount / total.totalAmount) * 100) : 0,
      topRegion: topRegion?.regionName || '-',
      topRegionAmount: topRegion?.totalAmount || 0
    }
  })

  // ============ Manager Stats (Top Performers) ============
  const managerStats = computed(() => {
    return core.managers.map(manager => {
      const managerSalespeople = core.getSalespeopleByManager(manager.id)
      const salespersonIds = managerSalespeople.map(s => s.id)
      const managerOrders = core.orders.filter(o => salespersonIds.includes(o.salespersonId))
      const totalAmount = managerOrders.reduce((sum, o) => sum + o.totalAmount, 0)
      const targetAmount = manager.monthlyTarget

      return {
        id: manager.id,
        name: manager.name,
        cityId: manager.cityId,
        totalAmount,
        orderCount: managerOrders.length,
        targetAmount,
        completion: targetAmount ? Math.round(totalAmount / targetAmount * 100) : 0
      }
    }).sort((a, b) => b.completion - a.completion)
  })

  // ============ Salesperson Stats ============
  const salespersonStats = computed(() => {
    return core.salespeople.map(sp => {
      const manager = core.managers.find(m => m.id === sp.managerId)
      const city = core.cities.find(c => c.id === manager?.cityId)
      const region = core.regions.find(r => r.id === city?.regionId)
      const spOrders = core.getOrdersBySalesperson(sp.id)
      const totalAmount = spOrders.reduce((sum, o) => sum + o.totalAmount, 0)

      return {
        id: sp.id,
        name: sp.name,
        managerId: sp.managerId,
        managerName: manager?.name || '',
        cityId: city?.id || '',
        cityName: city?.name || '',
        regionId: region?.id || '',
        regionName: region?.name || '',
        totalAmount,
        totalQuantity: spOrders.reduce((sum, o) => sum + o.totalQuantity, 0),
        orderCount: spOrders.length,
        targetAmount: sp.monthlyTarget,
        completion: sp.monthlyTarget ? Math.round(totalAmount / sp.monthlyTarget * 100) : 0
      }
    })
  })

  // ============ Product Stats ============
  const productStats = computed(() => {
    return core.products.map(product => {
      const productOrders = core.orders.filter(o => o.items.some(i => i.productId === product.id))
      const totalQuantity = productOrders.reduce((sum, o) => {
        const item = o.items.find(i => i.productId === product.id)
        return sum + (item?.quantity || 0)
      }, 0)
      const totalAmount = productOrders.reduce((sum, o) => {
        const item = o.items.find(i => i.productId === product.id)
        return sum + (item?.totalAmount || 0)
      }, 0)

      return {
        id: product.id,
        name: product.name,
        category: product.category,
        totalQuantity,
        totalAmount,
        orderCount: productOrders.length
      }
    })
  })

  // ============ City Economic Stats ============
  const cityEconomicStats = computed(() => {
    const stats: Record<string, { gdp: number, pop: number, name: string }> = {
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
    }
    return stats
  })

  const regionMarketStats = computed(() => {
    const stats: Record<string, { gdpPerCapita: number, population: number, totalGdp: number }> = {}

    core.regions.forEach(r => {
      const regionCities = core.cities.filter(c => c.regionId === r.id)
      let totalGdp = 0
      let totalPop = 0

      regionCities.forEach(c => {
        const cityStat = cityEconomicStats.value[c.id]
        if (cityStat) {
          totalGdp += cityStat.gdp
          totalPop += cityStat.pop
        }
      })

      stats[r.id] = {
        totalGdp,
        population: totalPop,
        gdpPerCapita: totalPop ? Math.round((totalGdp / totalPop) * 10000) : 0
      }
    })
    return stats
  })

  return {
    regionStats,
    overallStats,
    kpi,
    managerStats,
    salespersonStats,
    productStats,
    cityEconomicStats,
    regionMarketStats
  }
})
