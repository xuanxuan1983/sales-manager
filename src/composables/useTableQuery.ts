import { ref, computed, watch } from 'vue'
import type { PaginatedResult } from '@/types/sales'

export interface TableQueryOptions<T extends Record<string, unknown>> {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  data: T[]
  pageSize?: number
  debounceMs?: number
}

export interface TableQueryState {
  keyword: string
  filters: Record<string, unknown>
  sortField: string
  sortOrder: 'asc' | 'desc'
  page: number
  pageSize: number
  loading: boolean
}

export function useTableQuery<T extends Record<string, unknown>>(options: TableQueryOptions<T>) {
  const { data, pageSize = 20, debounceMs = 300 } = options

  // ============ State ============
  const keyword = ref('')
  const filters = ref<Record<string, unknown>>({})
  const sortField = ref('')
  const sortOrder = ref<'asc' | 'desc'>('desc')
  const page = ref(1)
  const pageSizeState = ref(pageSize)
  const loading = ref(false)

  // ============ Debounced Keyword ============
  const debouncedKeyword = ref('')
  let keywordTimeout: ReturnType<typeof setTimeout>

  watch(keyword, (val) => {
    clearTimeout(keywordTimeout)
    loading.value = true
    keywordTimeout = setTimeout(() => {
      debouncedKeyword.value = val
      page.value = 1
      loading.value = false
    }, debounceMs)
  })

  // ============ Filtered Data ============
  const filteredData = computed(() => {
    let result = [...data]

    // Keyword search (across all string fields)
    if (debouncedKeyword.value) {
      const kw = debouncedKeyword.value.toLowerCase()
      result = result.filter(item =>
        Object.values(item).some(val =>
          typeof val === 'string' && val.toLowerCase().includes(kw)
        )
      )
    }

    // Column filters
    Object.entries(filters.value).forEach(([key, val]) => {
      if (val !== undefined && val !== '' && val !== null) {
        result = result.filter(item => item[key] === val)
      }
    })

    // Sort
    if (sortField.value) {
      result.sort((a, b) => {
        const aVal = a[sortField.value]
        const bVal = b[sortField.value]
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder.value === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal)
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder.value === 'asc' ? aVal - bVal : bVal - aVal
        }
        return 0
      })
    }

    return result
  })

  // ============ Paged Data ============
  const pagedData = computed<PaginatedResult<T>>(() => {
    const list = filteredData.value
    const start = (page.value - 1) * pageSizeState.value
    const end = start + pageSizeState.value

    return {
      list: list.slice(start, end),
      total: list.length,
      page: page.value,
      pageSize: pageSizeState.value
    }
  })

  // ============ Stats ============
  const stats = computed(() => ({
    total: data.length,
    filtered: filteredData.value.length,
    pages: Math.ceil(filteredData.value.length / pageSizeState.value)
  }))

  // ============ Actions ============
  const setFilter = (key: string, value: unknown) => {
    filters.value[key] = value
    page.value = 1
  }

  const removeFilter = (key: string) => {
    delete filters.value[key]
    page.value = 1
  }

  const clearFilters = () => {
    filters.value = {}
    keyword.value = ''
    page.value = 1
  }

  const setSort = (field: string, order?: 'asc' | 'desc') => {
    if (sortField.value === field) {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortField.value = field
      sortOrder.value = order || 'desc'
    }
  }

  const setPage = (p: number) => {
    page.value = p
  }

  const setPageSize = (size: number) => {
    pageSizeState.value = size
    page.value = 1
  }

  const goFirst = () => { page.value = 1 }
  const goLast = () => { page.value = stats.value.pages || 1 }
  const goPrev = () => { if (page.value > 1) page.value-- }
  const goNext = () => { if (page.value < stats.value.pages) page.value++ }

  return {
    // State
    keyword,
    filters,
    sortField,
    sortOrder,
    page,
    pageSize: pageSizeState,
    loading,
    // Computed
    filteredData,
    pagedData,
    stats,
    // Actions
    setFilter,
    removeFilter,
    clearFilters,
    setSort,
    setPage,
    setPageSize,
    goFirst,
    goLast,
    goPrev,
    goNext
  }
}
