// ============ Medical Sales Store - Composed Entry ============
// Re-exports all domain stores for convenient access
// Legacy compatibility: useMedicalSalesStore still works

export { useMedicalCoreStore } from './core'
export { useMedicalKPIStore } from './kpi'
export { useMedicalFilterStore } from './filters'
export { useMedicalAsyncStore } from './async'
export { useMedicalTargetStore } from './target'

// Composed store for backward compatibility
import { defineStore } from 'pinia'
import { useMedicalCoreStore } from './core'
import { useMedicalKPIStore } from './kpi'
import { useMedicalFilterStore } from './filters'
import { useMedicalAsyncStore } from './async'
import { useMedicalTargetStore } from './target'

export const useMedicalSalesStore = defineStore('medicalSales', () => {
  const core = useMedicalCoreStore()
  const kpi = useMedicalKPIStore()
  const filter = useMedicalFilterStore()
  const asyncStore = useMedicalAsyncStore()
  const target = useMedicalTargetStore()

  return {
    // Core state
    regions: core.regions,
    cities: core.cities,
    managers: core.managers,
    salespeople: core.salespeople,
    products: core.products,
    distributors: core.distributors,
    clients: core.clients,
    orders: core.orders,
    indicators: core.indicators,
    headcountPlans: core.headcountPlans,

    // Core getters
    getCitiesByRegion: core.getCitiesByRegion,
    getManagersByCity: core.getManagersByCity,
    getSalespeopleByManager: core.getSalespeopleByManager,
    getClientsBySalesperson: core.getClientsBySalesperson,
    getOrdersBySalesperson: core.getOrdersBySalesperson,
    getOrdersByClient: core.getOrdersByClient,
    getOrdersByDistributor: core.getOrdersByDistributor,

    // Core actions
    addOrder: core.addOrder,
    updateOrder: core.updateOrder,
    deleteOrder: core.deleteOrder,
    addClient: core.addClient,
    addDistributor: core.addDistributor,
    importOrders: core.importOrders,
    importClients: core.importClients,
    importSalespeople: core.importSalespeople,
    importProducts: core.importProducts,
    importDistributors: core.importDistributors,
    importIndicators: core.importIndicators,
    importHeadcountPlans: core.importHeadcountPlans,
    clearOrders: core.clearOrders,
    clearClients: core.clearClients,
    clearProducts: core.clearProducts,
    clearDistributors: core.clearDistributors,
    clearIndicators: core.clearIndicators,
    clearHeadcountPlans: core.clearHeadcountPlans,
    calculateDistributorTiers: core.calculateDistributorTiers,

    // KPI
    regionStats: kpi.regionStats,
    overallStats: kpi.overallStats,
    managerStats: kpi.managerStats,
    salespersonStats: kpi.salespersonStats,
    productStats: kpi.productStats,
    cityEconomicStats: kpi.cityEconomicStats,
    regionMarketStats: kpi.regionMarketStats,

    // Filter
    filters: filter.filters,
    pagination: filter.pagination,
    filteredOrders: filter.filteredOrders,
    pagedOrders: filter.pagedOrders,
    filteredStats: filter.filteredStats,
    setFilter: filter.setFilter,
    resetFilters: filter.resetFilters,
    setPagination: filter.setPagination,
    setPage: filter.setPage,
    setPageSize: filter.setPageSize,

    // Async
    isImporting: asyncStore.isImporting,
    importProgress: asyncStore.importProgress,
    lastImportResult: asyncStore.lastImportResult,
    importOrdersAsync: asyncStore.importOrders,
    importClientsAsync: asyncStore.importClients,
    importProductsAsync: asyncStore.importProducts,
    importSalespeopleAsync: asyncStore.importSalespeople,
    importDistributorsAsync: asyncStore.importDistributors,
    importIndicatorsAsync: asyncStore.importIndicators,
    importHeadcountPlansAsync: asyncStore.importHeadcountPlans,
    exportToStorage: asyncStore.exportToStorage,
    importFromStorage: asyncStore.importFromStorage,

    // Target
    globalTarget: target.globalTarget,
    regionTargets: target.regionTargets,
    scenarios: target.scenarios,
    activeScenarioKey: target.activeScenarioKey,
    currentTarget: target.currentTarget,
    getUnallocatedTarget: target.getUnallocatedTarget,
    setGlobalTarget: target.setGlobalTarget,
    setRegionTarget: target.setRegionTarget,
    importCityStats: target.importCityStats
  }
})
