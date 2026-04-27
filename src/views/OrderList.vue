<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMedicalSalesStore } from '@/stores/medicalSales'
import { exportToExcel } from '@/utils/export'
import { ElMessage } from 'element-plus'

const store = useMedicalSalesStore()
const searchText = ref('')
const channelFilter = ref<string>('')
const statusFilter = ref<string>('')
const regionFilter = ref<string>('')
const dateRange = ref<[string, string] | null>(null)
const showAdvanced = ref(false)
const currentPage = ref(1)
const pageSize = 20

// Status options with counts
const statusOptions = [
  { value: '', label: '全部', class: '', icon: '●' },
  { value: 'pending', label: '待确认', class: 'st-pending', icon: '⏱' },
  { value: 'confirmed', label: '已确认', class: 'st-success', icon: '✓' },
  { value: 'shipped', label: '运输中', class: 'st-shipping', icon: '🚚' },
  { value: 'completed', label: '已完成', class: 'st-success', icon: '✓' },
  { value: 'cancelled', label: '已取消', class: 'st-alert', icon: '⚠' }
]

// Region options
const regionOptions = computed(() => [
  { value: '', label: '全部大区' },
  ...store.regions.map(r => ({ value: r.id, label: r.name }))
])

// Status counts
const statusCounts = computed(() => {
  const counts: Record<string, number> = { '': store.orders.length }
  store.orders.forEach(o => {
    counts[o.status] = (counts[o.status] || 0) + 1
  })
  return counts
})

// Filtered orders
const filteredOrders = computed(() => {
  let result = [...store.orders]
  if (searchText.value) {
    const keyword = searchText.value.toLowerCase()
    result = result.filter(o => 
      o.orderNo.toLowerCase().includes(keyword) ||
      o.clientName.toLowerCase().includes(keyword) ||
      o.salespersonName.toLowerCase().includes(keyword)
    )
  }
  if (channelFilter.value) result = result.filter(o => o.channel === channelFilter.value)
  if (statusFilter.value) result = result.filter(o => o.status === statusFilter.value)
  if (regionFilter.value) {
    const regionCityIds = store.cities.filter(c => c.regionId === regionFilter.value).map(c => c.id)
    const regionManagerIds = store.managers.filter(m => regionCityIds.includes(m.cityId)).map(m => m.id)
    const regionSalespersonIds = store.salespeople.filter(s => regionManagerIds.includes(s.managerId)).map(s => s.id)
    result = result.filter(o => regionSalespersonIds.includes(o.salespersonId))
  }
  if (dateRange.value) {
    const [start, end] = dateRange.value
    result = result.filter(o => o.orderDate >= start && o.orderDate <= end)
  }
  return result
})

const paginatedOrders = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredOrders.value.slice(start, start + pageSize)
})

const totalRecords = computed(() => filteredOrders.value.length)

const handleExport = () => {
  if (filteredOrders.value.length === 0) {
    ElMessage.warning('没有可导出的数据')
    return
  }
  const data = filteredOrders.value.map(o => ({
    id: o.id, orderNo: o.orderNo, customerName: o.clientName,
    productName: o.items[0]?.productName || '', quantity: o.totalQuantity,
    totalAmount: o.totalAmount, salesperson: o.salespersonName,
    orderDate: o.orderDate, status: statusOptions.find(s => s.value === o.status)?.label || o.status
  }))
  exportToExcel(data as Record<string, unknown>[], {
    headers: ['id', 'orderNo', 'customerName', 'productName', 'quantity', 'totalAmount', 'salesperson', 'orderDate', 'status'],
    fields: ['id', 'orderNo', 'customerName', 'productName', 'quantity', 'totalAmount', 'salesperson', 'orderDate', 'status'],
    filename: '医美销售订单',
    sheetName: '销售订单'
  })
  ElMessage.success('导出成功')
}

const clearFilters = () => {
  searchText.value = ''
  channelFilter.value = ''
  statusFilter.value = ''
  regionFilter.value = ''
  dateRange.value = null
  currentPage.value = 1
}

const getStatusClass = (status: string) => statusOptions.find(s => s.value === status)?.class || 'st-pending'
const getStatusLabel = (status: string) => statusOptions.find(s => s.value === status)?.label || status
// Status icon helper (for future use in custom rendering)
const _getStatusIcon = (status: string) => statusOptions.find(s => s.value === status)?.icon || '●'
void _getStatusIcon

const activeFiltersCount = computed(() => {
  let count = 0
  if (channelFilter.value) count++
  if (statusFilter.value) count++
  if (regionFilter.value) count++
  if (dateRange.value) count++
  return count
})
</script>

<template>
  <div class="order-console">
    <!-- Status Quick Filter -->
    <div class="status-bar">
      <button
        v-for="status in statusOptions"
        :key="status.value"
        class="status-tab"
        :class="{ active: statusFilter === status.value }"
        @click="statusFilter = status.value; currentPage = 1"
      >
        <span class="tab-icon">{{ status.icon }}</span>
        <span class="tab-label">{{ status.label }}</span>
        <span class="tab-count" :class="status.class">{{ statusCounts[status.value] || 0 }}</span>
      </button>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <div class="filter-group">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input v-model="searchText" type="text" placeholder="搜索订单号、机构名称或代理商...">
        </div>
        <button class="btn btn-ghost" :class="{ active: showAdvanced }" @click="showAdvanced = !showAdvanced">
          ⚙️ 高级筛选
          <span v-if="activeFiltersCount > 0" class="filter-badge">{{ activeFiltersCount }}</span>
        </button>
      </div>
      <div class="filter-group">
        <button class="btn" @click="handleExport">📥 导出报表</button>
        <button class="btn btn-primary">+ 新建订单</button>
      </div>
    </div>

    <!-- Advanced Filters -->
    <transition name="slide">
      <div v-show="showAdvanced" class="advanced-filters">
        <div class="filter-row">
          <div class="filter-field">
            <label>渠道</label>
            <select v-model="channelFilter" @change="currentPage = 1">
              <option value="">全部渠道</option>
              <option value="direct">直营</option>
              <option value="distributor">代理</option>
              <option value="hybrid">混合</option>
            </select>
          </div>
          <div class="filter-field">
            <label>大区</label>
            <select v-model="regionFilter" @change="currentPage = 1">
              <option v-for="r in regionOptions" :key="r.value" :value="r.value">{{ r.label }}</option>
            </select>
          </div>
          <div class="filter-field">
            <label>日期范围</label>
            <input 
              type="date" 
              v-model="dateRange" 
              @change="currentPage = 1"
              placeholder="选择日期"
            >
          </div>
          <button class="btn btn-text" @click="clearFilters">重置筛选</button>
        </div>
      </div>
    </transition>

    <!-- Table -->
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th style="width: 50px"><input type="checkbox"></th>
            <th>订单编号 / 时间</th>
            <th>客户信息</th>
            <th>采购内容 (SKU)</th>
            <th style="text-align: right">订单金额</th>
            <th>支付状态</th>
            <th>物流进度</th>
            <th style="width: 60px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in paginatedOrders" :key="order.id" class="table-row">
            <td><input type="checkbox"></td>
            <td>
              <div class="font-mono">{{ order.orderNo }}</div>
              <div class="text-sub">{{ order.orderDate }}</div>
            </td>
            <td>
              <div class="client-name">{{ order.clientName }}</div>
              <div class="text-sub">{{ order.channel === 'direct' ? '直营' : '代理' }} · {{ order.salespersonName }}</div>
            </td>
            <td>
              <div>{{ order.items[0]?.productName || '-' }} x {{ order.items[0]?.quantity || 0 }}</div>
              <div v-if="order.items.length > 1" class="text-sub">+{{ order.items.length - 1 }} 其他商品</div>
            </td>
            <td style="text-align: right">
              <div class="amount">¥{{ order.totalAmount.toLocaleString() }}</div>
              <div v-if="order.totalAmount > 100000" class="text-sub highlight">大额订单</div>
            </td>
            <td>
              <span class="status-badge" :class="getStatusClass(order.status)">
                <span class="badge-dot"></span>
                {{ getStatusLabel(order.status) }}
              </span>
            </td>
            <td>
              <span v-if="order.status === 'shipped'" class="status-badge st-shipping">
                <span class="badge-dot"></span>运输中
              </span>
              <span v-else-if="order.status === 'completed'" class="status-badge st-success">
                <span class="badge-dot"></span>已送达
              </span>
              <span v-else class="text-sub">--</span>
            </td>
            <td><span class="more-icon">⋯</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div>显示 {{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, totalRecords) }} 共 {{ totalRecords }} 条记录</div>
      <div class="pagination">
        <button class="btn" :disabled="currentPage === 1" @click="currentPage--">上一页</button>
        <button class="btn" :disabled="currentPage * pageSize >= totalRecords" @click="currentPage++">下一页</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap');

.order-console {
  background: var(--card);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.06);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 200px);
  transition: box-shadow 0.3s ease;
}

.order-console:hover {
  box-shadow: 0 12px 40px rgba(0,0,0,0.08);
}

/* Status Quick Filter */
.status-bar {
  display: flex;
  gap: 4px;
  padding: 16px 24px 0;
  background: linear-gradient(to bottom, #fafafa, white);
  border-bottom: 1px solid #f0f0f0;
}

.status-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px 8px 0 0;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  background: transparent;
  color: #86868B;
  transition: all 0.2s;
  position: relative;
}

.status-tab:hover {
  color: var(--text);
  background: rgba(0,0,0,0.02);
}

.status-tab.active {
  color: var(--text);
  background: white;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.04);
}

.status-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 8px;
  right: 8px;
  height: 2px;
  background: var(--accent);
  border-radius: 2px;
}

.tab-icon { font-size: 12px; }
.tab-label { white-space: nowrap; }
.tab-count {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  background: #F2F2F7;
  color: #86868B;
  font-weight: 600;
  min-width: 20px;
  text-align: center;
}

/* Toolbar */
.toolbar {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255,255,255,0.9);
  backdrop-filter: blur(10px);
}

.filter-group { display: flex; gap: 12px; align-items: center; }

.btn {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all 0.2s;
  border: 1px solid var(--border); background: white; color: var(--text);
}
.btn:hover { background: #F5F5F7; transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.btn:active { transform: translateY(0); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.btn-primary { background: #1D1D1F; color: white; border: none; }
.btn-primary:hover { background: #333; }
.btn-ghost { border: 1px dashed #d0d0d0; background: transparent; }
.btn-ghost.active { background: #EEF2FF; border-color: var(--accent); color: var(--accent); }
.btn-text { border: none; background: transparent; color: var(--accent); }
.btn-text:hover { background: rgba(0,113,227,0.06); }

.filter-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 8px;
  background: var(--accent);
  color: white;
  font-weight: 700;
}

.search-box {
  position: relative;
  width: 320px;
}
.search-box input {
  width: 100%;
  padding: 9px 12px 9px 36px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #F2F2F7;
  font-size: 13px;
  outline: none;
  transition: all 0.2s;
}
.search-box input:focus {
  background: white;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(0,113,227,0.1);
}
.search-icon { position: absolute; left: 10px; top: 8px; font-size: 14px; }

/* Advanced Filters */
.advanced-filters {
  padding: 16px 24px;
  background: #FAFAFC;
  border-bottom: 1px solid var(--border);
}

.filter-row {
  display: flex;
  gap: 16px;
  align-items: flex-end;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.filter-field label {
  font-size: 11px;
  font-weight: 600;
  color: #86868B;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.filter-field select,
.filter-field input {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: white;
  font-size: 13px;
  min-width: 140px;
  outline: none;
}
.filter-field select:focus,
.filter-field input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(0,113,227,0.1);
}

/* Slide transition */
.slide-enter-active, .slide-leave-active {
  transition: all 0.3s ease;
}
.slide-enter-from, .slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
}
.slide-enter-to, .slide-leave-from {
  opacity: 1;
  transform: translateY(0);
  max-height: 200px;
}

/* Table */
.table-wrapper { flex: 1; overflow: auto; }

table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 1000px; }

th {
  position: sticky; top: 0;
  background: #FAFAFC;
  font-size: 11px; color: #86868B; font-weight: 600; text-transform: uppercase;
  padding: 12px 24px; text-align: left;
  border-bottom: 1px solid var(--border);
  z-index: 10;
  letter-spacing: 0.5px;
}

td {
  padding: 16px 24px;
  border-bottom: 1px solid #F2F2F7;
  font-size: 14px;
  vertical-align: middle;
  transition: all 0.2s;
}

.table-row {
  transition: all 0.2s;
}

.table-row:hover {
  background: #F9F9FB;
  transform: scale(1.002);
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  z-index: 1;
  position: relative;
}

.font-mono { font-family: 'JetBrains Mono', monospace; font-size: 13px; letter-spacing: -0.5px; }
.text-sub { color: #86868B; font-size: 12px; margin-top: 4px; }
.text-sub.highlight { color: #FF9500; font-weight: 500; }
.client-name { font-weight: 600; }
.amount { font-weight: 700; font-family: 'Inter', sans-serif; font-size: 15px; }
.more-icon { color: #86868B; cursor: pointer; font-size: 18px; padding: 4px; border-radius: 4px; transition: all 0.2s; }
.more-icon:hover { background: #F2F2F7; color: var(--text); }

/* Status Badges */
.status-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 12px; border-radius: 20px;
  font-size: 12px; font-weight: 600;
}

.badge-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.5;
}

.st-pending { background: #FFF4E5; color: #B25000; }
.st-success { background: #E3FBE9; color: #0F7B28; }
.st-shipping { background: #E5F0FF; color: #0040DD; }
.st-alert { background: #FFEBEB; color: #D70015; }

/* Footer */
.footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border);
  display: flex; justify-content: space-between; align-items: center;
  font-size: 13px; color: #86868B; background: white;
}

.pagination { display: flex; gap: 8px; }
</style>
