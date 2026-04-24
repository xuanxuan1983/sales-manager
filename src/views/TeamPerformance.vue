<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMedicalSalesStore } from '@/stores/medicalSales'

const store = useMedicalSalesStore()
const selectedManager = ref<string>('')

// Manager stats
const managerStats = computed(() => {
  return store.managers.map(m => {
    const city = store.cities.find(c => c.id === m.cityId)
    const region = store.regions.find(r => r.id === city?.regionId)
    const salespeople = store.getSalespeopleByManager(m.id)
    const salespersonIds = salespeople.map(s => s.id)
    const orders = store.orders.filter(o => salespersonIds.includes(o.salespersonId))
    const totalAmount = orders.reduce((sum, o) => sum + o.totalAmount, 0)
    
    return {
      ...m,
      cityName: city?.name || '',
      regionName: region?.name || '',
      salespersonCount: salespeople.length,
      orderCount: orders.length,
      totalAmount,
      completion: m.monthlyTarget ? Math.round(totalAmount / m.monthlyTarget * 100) : 0
    }
  }).sort((a, b) => b.totalAmount - a.totalAmount)
})

// Salesperson stats
const salespersonStats = computed(() => {
  let result = store.salespeople.map(s => {
    const manager = store.managers.find(m => m.id === s.managerId)
    const city = store.cities.find(c => c.id === manager?.cityId)
    const region = store.regions.find(r => r.id === city?.regionId)
    const orders = store.getOrdersBySalesperson(s.id)
    const totalAmount = orders.reduce((sum, o) => sum + o.totalAmount, 0)
    const clients = store.getClientsBySalesperson(s.id)
    
    return {
      ...s,
      managerName: manager?.name || '',
      cityName: city?.name || '',
      regionName: region?.name || '',
      orderCount: orders.length,
      clientCount: clients.length,
      totalAmount,
      completion: s.monthlyTarget ? Math.round(totalAmount / s.monthlyTarget * 100) : 0
    }
  })
  
  if (selectedManager.value) {
    result = result.filter(s => s.managerId === selectedManager.value)
  }
  return result.sort((a, b) => b.totalAmount - a.totalAmount)
})
</script>

<template>
  <div class="team-management">
    <!-- Manager Cards -->
    <div class="section-label">区域经理排名</div>
    <div class="manager-grid">
      <div 
        v-for="(m, index) in managerStats" 
        :key="m.id" 
        class="manager-card"
        :class="{ active: selectedManager === m.id }"
        @click="selectedManager = selectedManager === m.id ? '' : m.id"
      >
        <div class="rank" :class="{ gold: index === 0, silver: index === 1, bronze: index === 2 }">
          {{ index + 1 }}
        </div>
        <div class="manager-info">
          <div class="manager-name">{{ m.name }}</div>
          <div class="manager-location">{{ m.regionName }} · {{ m.cityName }}</div>
        </div>
        <div class="manager-stats">
          <div class="manager-amount">¥{{ (m.totalAmount / 10000).toFixed(1) }}万</div>
          <div class="manager-completion" :class="m.completion >= 100 ? 'success' : m.completion >= 80 ? '' : 'danger'">
            {{ m.completion }}%
          </div>
        </div>
      </div>
    </div>

    <!-- Salesperson Table -->
    <section class="section-box">
      <div class="section-header">
        <h3>销售人员明细</h3>
        <select v-model="selectedManager" class="filter-select">
          <option value="">全部经理</option>
          <option v-for="m in store.managers" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>姓名</th>
            <th>上级</th>
            <th>区域</th>
            <th>客户</th>
            <th>订单</th>
            <th>销售额</th>
            <th>月目标</th>
            <th>达成率</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(s, index) in salespersonStats" :key="s.id">
            <td>{{ index + 1 }}</td>
            <td class="name-cell">{{ s.name }}</td>
            <td>{{ s.managerName }}</td>
            <td>{{ s.regionName }}</td>
            <td>{{ s.clientCount }}</td>
            <td>{{ s.orderCount }}</td>
            <td class="amount">¥{{ (s.totalAmount / 10000).toFixed(2) }}万</td>
            <td>¥{{ (s.monthlyTarget / 10000).toFixed(1) }}万</td>
            <td>
              <span :class="s.completion >= 100 ? 'status-success' : s.completion >= 80 ? '' : 'status-danger'">
                {{ s.completion }}%
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.team-management {}

.section-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.manager-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.manager-card {
  background: var(--card);
  padding: 20px;
  border-radius: var(--radius);
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.manager-card:hover { box-shadow: 0 8px 20px rgba(0,0,0,0.06); }
.manager-card.active { border-color: var(--primary); }

.rank {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e8e8ed;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
}

.rank.gold { background: #fef3cd; color: #856404; }
.rank.silver { background: #e8e8ed; color: #666; }
.rank.bronze { background: #fde8e8; color: #9a3412; }

.manager-info { flex: 1; }
.manager-name { font-weight: 600; }
.manager-location { font-size: 12px; color: var(--text-secondary); }

.manager-stats { text-align: right; }
.manager-amount { font-size: 18px; font-weight: 700; }
.manager-completion { font-size: 12px; color: var(--text-secondary); }
.manager-completion.success { color: var(--success); }
.manager-completion.danger { color: var(--danger); }

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
  padding: 14px 0;
  border-bottom: 1px solid #f5f5f7;
  font-size: 14px;
}
.name-cell { font-weight: 500; }
.amount { font-weight: 600; }
.status-success { color: var(--success); font-weight: 500; }
.status-danger { color: var(--danger); font-weight: 500; }
</style>
