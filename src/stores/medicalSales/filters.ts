import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useMedicalCoreStore } from './core'
import type { Order, MedicalFilterState, PaginatedResult, PaginationParams } from '@/types/sales'

export const useMedicalFilterStore = defineStore('medicalFilter', () => {
  const core = useMedicalCoreStore()

  // ============ Filter State ============
  const filters = ref<MedicalFilterState>({
    keyword: '',
    status: '',
    regionId: '',
    cityId: '',
    dateRange: null,
    channel: '',
    minAmount: null,
    maxAmount: null
  })

  const pagination = ref<PaginationParams>({
    page: 1,
    pageSize: 20,
    sortField: 'orderDate',
    sortOrder: 'desc'
  })

  // ============ Filtered Orders ============
  const filteredOrders = computed(() => {
    let result = [...core.orders]

    // Keyword search
    if (filters.value.keyword) {
      const kw = filters.value.keyword.toLowerCase()
      result = result.filter(o =>
        o.orderNo.toLowerCase().includes(kw) ||
        o.clientName.toLowerCase().includes(kw) ||
        o.salespersonName.toLowerCase().includes(kw)
      )
    }

    // Status filter
    if (filters.value.status) {
      result = result.filter(o => o.status === filters.value.status)
    }

    // Region filter (via salesperson -> manager -> city)
    if (filters.value.regionId) {
      const regionCityIds = core.cities
        .filter(c => c.regionId === filters.value.regionId)
        .map(c => c.id)
      const regionManagerIds = core.managers
        .filter(m => regionCityIds.includes(m.cityId))
        .map(m => m.id)
      const regionSalespersonIds = core.salespeople
        .filter(s => regionManagerIds.includes(s.managerId))
        .map(s => s.id)
      result = result.filter(o => regionSalespersonIds.includes(o.salespersonId))
    }

    // Channel filter
    if (filters.value.channel) {
      result = result.filter(o => o.channel === filters.value.channel)
    }

    // Date range filter
    if (filters.value.dateRange) {
      const [start, end] = filters.value.dateRange
      result = result.filter(o => o.orderDate >= start && o.orderDate <= end)
    }

    // Amount range filter
    if (filters.value.minAmount !== null) {
      result = result.filter(o => o.totalAmount >= filters.value.minAmount!)
    }
    if (filters.value.maxAmount !== null) {
      result = result.filter(o => o.totalAmount <= filters.value.maxAmount!)
    }

    // Sort
    const { sortField, sortOrder } = pagination.value
    if (sortField) {
      result.sort((a, b) => {
        const aVal = a[sortField as keyof Order] ?? 0
        const bVal = b[sortField as keyof Order] ?? 0
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
        }
        return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
      })
    }

    return result
  })

  // ============ Paged Orders ============
  const pagedOrders = computed<PaginatedResult<Order>>(() => {
    const list = filteredOrders.value
    const { page, pageSize } = pagination.value
    const start = (page - 1) * pageSize
    const end = start + pageSize

    return {
      list: list.slice(start, end),
      total: list.length,
      page,
      pageSize
    }
  })

  // ============ Stats for Filtered ============
  const filteredStats = computed(() => {
    const orders = filteredOrders.value
    return {
      count: orders.length,
      totalAmount: orders.reduce((sum, o) => sum + o.totalAmount, 0),
      totalQuantity: orders.reduce((sum, o) => sum + o.totalQuantity, 0)
    }
  })

  // ============ Actions ============
  const setFilter = <K extends keyof MedicalFilterState>(key: K, value: MedicalFilterState[K]) => {
    filters.value[key] = value
    pagination.value.page = 1 // Reset to first page on filter change
  }

  const resetFilters = () => {
    filters.value = {
      keyword: '',
      status: '',
      regionId: '',
      cityId: '',
      dateRange: null,
      channel: '',
      minAmount: null,
      maxAmount: null
    }
    pagination.value.page = 1
  }

  const setPagination = (params: Partial<PaginationParams>) => {
    pagination.value = { ...pagination.value, ...params }
  }

  const setPage = (page: number) => {
    pagination.value.page = page
  }

  const setPageSize = (size: number) => {
    pagination.value.pageSize = size
    pagination.value.page = 1
  }

  return {
    filters,
    pagination,
    filteredOrders,
    pagedOrders,
    filteredStats,
    setFilter,
    resetFilters,
    setPagination,
    setPage,
    setPageSize
  }
})
