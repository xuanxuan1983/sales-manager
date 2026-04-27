<script setup lang="ts">
import { computed } from 'vue'
import { VxeColumn, VxeTable } from 'vxe-table'

interface ColumnConfig {
  field: string
  title: string
  width?: number | string
  minWidth?: number | string
  sortable?: boolean
  formatter?: (value: unknown) => string
  slots?: {
    default?: string
    header?: string
  }
}

interface Props {
  data: unknown[]
  columns: ColumnConfig[]
  loading?: boolean
  height?: number | string
  virtualScroll?: boolean
  pageSize?: number
  rowKey?: string
  emptyText?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  height: 'auto',
  virtualScroll: true,
  pageSize: 20,
  rowKey: 'id',
  emptyText: '暂无数据'
})

const emit = defineEmits<{
  sortChange: [field: string, order: 'asc' | 'desc' | null]
  rowClick: [row: unknown]
  selectionChange: [rows: unknown[]]
}>()

// Virtual scroll config
const scrollConfig = computed(() => {
  if (!props.virtualScroll) return undefined
  return {
    enabled: true,
    gt: 50 // Enable virtual scroll when rows > 50
  }
})

// Table height handling
const tableHeight = computed(() => {
  if (props.height === 'auto') return undefined
  if (typeof props.height === 'number') return `${props.height}px`
  return props.height
})

// Handle sort change
const handleSortChange = (params: any) => {
  emit('sortChange', params.field, params.order as 'asc' | 'desc' | null)
}

// Handle row click
const handleRowClick = (params: { row: unknown }) => {
  emit('rowClick', params.row)
}

// Default formatter for common types
const defaultFormatter = (value: unknown): string => {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'number') {
    // Format currency
    if (value > 1000) {
      return new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY',
        minimumFractionDigits: 0
      }).format(value)
    }
    return value.toLocaleString('zh-CN')
  }
  if (value instanceof Date) {
    return value.toLocaleDateString('zh-CN')
  }
  return String(value)
}
</script>

<template>
  <div class="base-data-table">
    <vxe-table
      :data="data"
      :height="tableHeight"
      :scroll-y="scrollConfig"
      :loading="loading"
      :empty-text="emptyText"
      :row-config="{ keyField: rowKey, isHover: true }"
      :sort-config="{ trigger: 'cell', orders: ['asc', 'desc', null] }"
      @sort-change="handleSortChange"
      @cell-click="handleRowClick"
      border="none"
      stripe
      round
      class="medical-table"
    >
      <vxe-column
        v-for="col in columns"
        :key="col.field"
        :field="col.field"
        :title="col.title"
        :width="col.width"
        :min-width="col.minWidth || 120"
        :sortable="col.sortable ?? true"
      >
        <template #default="{ row }">
          <slot :name="`cell-${col.field}`" :row="row" :value="row[col.field]">
            {{ col.formatter ? col.formatter(row[col.field]) : defaultFormatter(row[col.field]) }}
          </slot>
        </template>
      </vxe-column>

      <!-- Action slot -->
      <vxe-column
        v-if="$slots.actions"
        title="操作"
        width="120"
        fixed="right"
      >
        <template #default="{ row }">
          <slot name="actions" :row="row" />
        </template>
      </vxe-column>
    </vxe-table>
  </div>
</template>

<style scoped>
.base-data-table {
  background: var(--card, #FFFFFF);
  border-radius: 12px;
  overflow: hidden;
}

.medical-table :deep(.vxe-table--header-wrapper) {
  background: var(--bg, #F5F5F7);
}

.medical-table :deep(.vxe-header--row) {
  font-weight: 600;
  font-size: 13px;
  color: var(--text, #1D1D1F);
}

.medical-table :deep(.vxe-body--row) {
  font-size: 14px;
  transition: background 0.2s;
}

.medical-table :deep(.vxe-body--row:hover) {
  background: rgba(0, 113, 227, 0.04);
}

.medical-table :deep(.vxe-sort--asc-btn),
.medical-table :deep(.vxe-sort--desc-btn) {
  color: var(--secondary, #86868B);
}

.medical-table :deep(.vxe-sort--asc-btn.sort--active),
.medical-table :deep(.vxe-sort--desc-btn.sort--active) {
  color: var(--accent, #0071E3);
}
</style>
