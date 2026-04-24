<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMedicalSalesStore } from '@/stores/medicalSales'
import { exportToExcel } from '@/utils/export'
import { ElMessage } from 'element-plus'

const store = useMedicalSalesStore()
const searchText = ref('')
const channelFilter = ref<string>('')
const statusFilter = ref<string>('')
const currentPage = ref(1)
const pageSize = 20

const statusOptions = [
  { value: 'pending', label: '待财务审', class: 'st-pending', icon: '⏱' },
  { value: 'confirmed', label: '已确认', class: 'st-success', icon: '✓' },
  { value: 'shipped', label: '运输中', class: 'st-shipping', icon: '🚚' },
  { value: 'completed', label: '已付款', class: 'st-success', icon: '✓' },
  { value: 'cancelled', label: '支付失败', class: 'st-alert', icon: '⚠' }
]

const channelOptions = [
  { value: 'direct', label: '直营' },
  { value: 'distributor', label: '代理' }
]

const filteredOrders = computed(() => {
  let result = store.orders
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
  exportToExcel(data as any, '医美销售订单')
  ElMessage.success('导出成功')
}

const getStatusClass = (status: string) => statusOptions.find(s => s.value === status)?.class || 'st-pending'
const getStatusLabel = (status: string) => statusOptions.find(s => s.value === status)?.label || status
</script>

<template>
  <div class="order-console">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="filter-group">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input v-model="searchText" type="text" placeholder="搜索订单号、机构名称或代理商...">
        </div>
        <button class="btn">📅 本月</button>
      </div>
      <div class="filter-group">
        <button class="btn" @click="handleExport">📥 导出报表</button>
        <button class="btn btn-primary">+ 新建订单</button>
      </div>
    </div>

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
          <tr v-for="order in paginatedOrders" :key="order.id">
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
              <div v-if="order.totalAmount > 100000" class="text-sub">大额订单</div>
            </td>
            <td>
              <span class="status-badge" :class="getStatusClass(order.status)">
                {{ getStatusLabel(order.status) }}
              </span>
            </td>
            <td>
              <span v-if="order.status === 'shipped'" class="status-badge st-shipping">运输中</span>
              <span v-else-if="order.status === 'completed'" class="status-badge st-success">已送达</span>
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
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');

.order-console {
  background: var(--card);
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.04);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 200px);
}

/* Toolbar */
.toolbar {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255,255,255,0.8);
  backdrop-filter: blur(10px);
}

.filter-group { display: flex; gap: 12px; }

.btn {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all 0.2s;
  border: 1px solid var(--border); background: white; color: var(--text);
}
.btn:hover { background: #F5F5F7; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: #1D1D1F; color: white; border: none; }
.btn-primary:hover { background: #333; }

.search-box {
  position: relative;
  width: 320px;
}
.search-box input {
  width: 100%;
  padding: 9px 12px 9px 36px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #F2F2F7;
  font-size: 13px;
  outline: none;
}
.search-icon { position: absolute; left: 10px; top: 8px; font-size: 14px; }

/* Table */
.table-wrapper { flex: 1; overflow: auto; }

table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 1000px; }

th {
  position: sticky; top: 0;
  background: #FAFAFC;
  font-size: 12px; color: #86868B; font-weight: 600; text-transform: uppercase;
  padding: 12px 24px; text-align: left;
  border-bottom: 1px solid var(--border);
  z-index: 10;
}

td {
  padding: 16px 24px;
  border-bottom: 1px solid #F2F2F7;
  font-size: 14px;
  vertical-align: middle;
  transition: background 0.2s;
}

tr:hover td { background: #F9F9FB; }

.font-mono { font-family: 'JetBrains Mono', monospace; font-size: 13px; letter-spacing: -0.5px; }
.text-sub { color: #86868B; font-size: 12px; margin-top: 4px; }
.client-name { font-weight: 500; }
.amount { font-weight: 600; }
.more-icon { color: #86868B; cursor: pointer; font-size: 18px; }

/* Status Badges */
.status-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-radius: 20px;
  font-size: 12px; font-weight: 500;
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
