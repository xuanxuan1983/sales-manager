import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useMedicalCoreStore } from './core'
import type { ImportResult, Order, Client, Product, Salesperson, Distributor, MonthlyIndicator, HeadcountPlan } from '@/types/sales'

export const useMedicalAsyncStore = defineStore('medicalAsync', () => {
  const core = useMedicalCoreStore()

  // ============ Loading States ============
  const isImporting = ref(false)
  const importProgress = ref(0)
  const lastImportResult = ref<ImportResult<unknown> | null>(null)

  // ============ Import with Chunking ============
  const importWithChunks = async <T>(
    items: T[],
    chunkSize: number = 100,
    importFn: (chunk: T[]) => number
  ): Promise<ImportResult<T>> => {
    const result: ImportResult<T> = {
      data: [],
      summary: { total: items.length, success: 0, failed: 0 },
      errors: []
    }

    isImporting.value = true
    importProgress.value = 0

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize)
      try {
        const count = importFn(chunk)
        result.summary.success += count
        result.data.push(...chunk)
      } catch (error) {
        result.summary.failed += chunk.length
        result.errors.push({
          row: i,
          field: 'batch',
          value: chunk.length,
          message: error instanceof Error ? error.message : 'Import failed'
        })
      }
      importProgress.value = Math.round(((i + chunk.length) / items.length) * 100)

      // Yield to main thread
      await new Promise(resolve => setTimeout(resolve, 0))
    }

    isImporting.value = false
    importProgress.value = 100
    lastImportResult.value = result as ImportResult<unknown>
    return result
  }

  // ============ Typed Import Wrappers ============
  const importOrders = async (orders: Order[], chunkSize = 50) => {
    return importWithChunks(orders, chunkSize, core.importOrders)
  }

  const importClients = async (clients: Client[], chunkSize = 50) => {
    return importWithChunks(clients, chunkSize, core.importClients)
  }

  const importProducts = async (products: Product[], chunkSize = 50) => {
    return importWithChunks(products, chunkSize, core.importProducts)
  }

  const importSalespeople = async (salespeople: Salesperson[], chunkSize = 50) => {
    return importWithChunks(salespeople, chunkSize, core.importSalespeople)
  }

  const importDistributors = async (distributors: Distributor[], chunkSize = 50) => {
    return importWithChunks(distributors, chunkSize, core.importDistributors)
  }

  const importIndicators = async (indicators: MonthlyIndicator[], chunkSize = 100) => {
    return importWithChunks(indicators, chunkSize, core.importIndicators)
  }

  const importHeadcountPlans = async (plans: HeadcountPlan[], chunkSize = 100) => {
    return importWithChunks(plans, chunkSize, core.importHeadcountPlans)
  }

  // ============ Persistence ============
  const STORAGE_KEY = 'sales-manager-data-v1'

  const exportToStorage = () => {
    const data = {
      orders: core.orders,
      clients: core.clients,
      products: core.products,
      salespeople: core.salespeople,
      distributors: core.distributors,
      indicators: core.indicators,
      headcountPlans: core.headcountPlans
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  const importFromStorage = () => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    try {
      const data = JSON.parse(raw)
      if (data.orders) core.orders = data.orders
      if (data.clients) core.clients = data.clients
      if (data.products) core.products = data.products
      if (data.salespeople) core.salespeople = data.salespeople
      if (data.distributors) core.distributors = data.distributors
      if (data.indicators) core.indicators = data.indicators
      if (data.headcountPlans) core.headcountPlans = data.headcountPlans
      return true
    } catch (e) {
      console.error('Failed to load from storage', e)
      return false
    }
  }

  return {
    isImporting,
    importProgress,
    lastImportResult,
    importOrders,
    importClients,
    importProducts,
    importSalespeople,
    importDistributors,
    importIndicators,
    importHeadcountPlans,
    exportToStorage,
    importFromStorage
  }
})
