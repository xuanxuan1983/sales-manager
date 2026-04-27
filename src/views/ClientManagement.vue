<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMedicalSalesStore } from '@/stores/medicalSales'


const store = useMedicalSalesStore()
const activeTab = ref('clients')
const channelFilter = ref<string>('')
const levelFilter = ref<string>('')

const filteredClients = computed(() => {
  let result = store.clients
  if (channelFilter.value) result = result.filter(c => c.channel === channelFilter.value)
  if (levelFilter.value) result = result.filter(c => c.level === levelFilter.value)
  return result.map(client => {
    const salesperson = store.salespeople.find(s => s.id === client.salespersonId)
    const distributor = client.distributorId ? store.distributors.find(d => d.id === client.distributorId) : null
    const city = store.cities.find(c => c.id === client.cityId)
    const region = store.regions.find(r => r.id === city?.regionId)
    const orders = store.getOrdersByClient(client.id)
    const totalAmount = orders.reduce((sum, o) => sum + o.totalAmount, 0)
    const products = [...new Set(orders.flatMap(o => o.items.map(i => {
      const p = store.products.find(prod => prod.id === i.productId)
      const categoryMap: Record<string, string> = { hyaluronic: '玻尿酸', botox: '肉毒素', device: '设备', consumable: '耗材', other: '其他' }
      return categoryMap[p?.category || ''] || ''
    })).filter(Boolean))].join('/')
    return {
      ...client,
      salespersonName: salesperson?.name || '',
      distributorName: distributor?.name || '',
      cityName: city?.name || '',
      regionName: region?.name || '',
      orderCount: orders.length,
      totalAmount,
      products
    }
  }).sort((a, b) => b.totalAmount - a.totalAmount)
})

const distributorStats = computed(() => {
  return store.distributors.map(d => {
    const city = store.cities.find(c => c.id === d.cityId)
    const region = store.regions.find(r => r.id === d.regionId)
    const clients = store.clients.filter(c => c.distributorId === d.id)
    const orders = store.getOrdersByDistributor(d.id)
    const totalAmount = orders.reduce((sum, o) => sum + o.totalAmount, 0)
    return {
      ...d,
      cityName: city?.name || '',
      regionName: region?.name || '',
      clientCount: clients.length,
      orderCount: orders.length,
      totalAmount
    }
  }).sort((a, b) => b.totalAmount - a.totalAmount)
})

const channelOptions = [
  { value: 'direct', label: '直营' },
  { value: 'distributor', label: '代理商' },
  { value: 'hybrid', label: '混合' }
]

const levelOptions = [
  { value: 'vip', label: 'VIP' },
  { value: 'key', label: '重点' },
  { value: 'normal', label: '普通' }
]
</script>

<template>
  <div class="client-management">
    <!-- Tab Container -->
    <div class="tab-container">
      <div class="tab" :class="{ active: activeTab === 'clients' }" @click="activeTab = 'clients'">医美机构</div>
      <div class="tab" :class="{ active: activeTab === 'distributors' }" @click="activeTab = 'distributors'">代理商</div>
    </div>

    <!-- Clients Tab -->
    <section v-if="activeTab === 'clients'" class="section-box">
      <div class="section-header">
        <h3>机构列表</h3>
        <div class="filters">
          <select v-model="channelFilter" class="filter-select">
            <option value="">全部渠道</option>
            <option v-for="c in channelOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
          <select v-model="levelFilter" class="filter-select">
            <option value="">全部等级</option>
            <option v-for="l in levelOptions" :key="l.value" :value="l.value">{{ l.label }}</option>
          </select>
        </div>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>机构名称</th>
            <th>所属区域</th>
            <th>渠道</th>
            <th>本月回款</th>
            <th>主营品类</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="client in filteredClients" :key="client.id">
            <td class="name-cell">{{ client.name }}</td>
            <td>{{ client.regionName }}</td>
            <td>
              <span class="channel-tag" :class="client.channel">
                {{ channelOptions.find(c => c.value === client.channel)?.label }}
              </span>
            </td>
            <td class="amount">¥{{ (client.totalAmount / 10000).toFixed(1) }}万</td>
            <td>{{ client.products || '-' }}</td>
            <td>
              <span :class="client.level === 'vip' ? 'status-success' : client.level === 'key' ? '' : 'status-muted'">
                {{ levelOptions.find(l => l.value === client.level)?.label }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Distributors Tab -->
    <section v-else class="section-box">
      <div class="section-header">
        <h3>代理商列表</h3>
      </div>
      <div class="distributor-grid">
        <div v-for="d in distributorStats" :key="d.id" class="distributor-card">
          <div class="d-header">
            <span class="d-name">{{ d.name }}</span>
            <span class="level-tag" :class="d.level">{{ d.level === 'gold' ? '金牌' : d.level === 'silver' ? '银牌' : '普通' }}</span>
          </div>
          <div class="d-amount">¥{{ (d.totalAmount / 10000).toFixed(1) }}万</div>
          <div class="d-meta">{{ d.regionName }} · {{ d.cityName }}</div>
          <div class="d-stats">
            <span>客户 {{ d.clientCount }}</span>
            <span>订单 {{ d.orderCount }}</span>
            <span>应收 ¥{{ (d.balance / 10000).toFixed(1) }}万</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.client-management {}

.tab-container {
  background: #e8e8ed;
  padding: 4px;
  border-radius: 8px;
  display: inline-flex;
  margin-bottom: 24px;
}

.tab {
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.tab.active {
  background: var(--card);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  color: var(--primary);
}

.section-box {
  background: var(--card);
  padding: 24px;
  border-radius: var(--radius);
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 { font-size: 18px; font-weight: 600; }

.filters { display: flex; gap: 12px; }

.filter-select {
  padding: 8px 16px;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  font-size: 14px;
  background: white;
}

.data-table { width: 100%; border-collapse: collapse; }
.data-table th {
  text-align: left;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}
.data-table td {
  padding: 16px 0;
  border-bottom: 1px solid #f5f5f7;
  font-size: 14px;
}
.name-cell { font-weight: 500; }
.amount { font-weight: 600; }

.channel-tag {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 4px;
  font-weight: 500;
}
.channel-tag.direct { background: #dcf5e4; color: var(--success); }
.channel-tag.distributor { background: #fff3cd; color: #856404; }
.channel-tag.hybrid { background: #e8e8ed; color: var(--text-secondary); }

.status-success { color: var(--success); font-weight: 500; }
.status-muted { color: var(--text-secondary); }

.distributor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.distributor-card {
  background: #f9f9f9;
  border-radius: var(--radius);
  padding: 24px;
  border: 1px solid #e8e8ed;
}

.d-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.d-name { font-size: 16px; font-weight: 600; }

.level-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}
.level-tag.gold { background: #fef3cd; color: #856404; }
.level-tag.silver { background: #e8e8ed; color: #666; }

.d-amount { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
.d-meta { font-size: 13px; color: var(--text-secondary); margin-bottom: 16px; }
.d-stats { font-size: 12px; color: var(--text-secondary); display: flex; gap: 16px; }
</style>
