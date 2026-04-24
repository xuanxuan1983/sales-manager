<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMedicalSalesStore } from '@/stores/medicalSales'

const store = useMedicalSalesStore()
const selectedRegion = ref<string>('')

const regionStats = computed(() => store.regionStats)

const filteredCities = computed(() => {
  if (!selectedRegion.value) return store.cities
  return store.getCitiesByRegion(selectedRegion.value)
})

const cityStats = computed(() => {
  return filteredCities.value.map(city => {
    const region = store.regions.find(r => r.id === city.regionId)
    const cityManagers = store.getManagersByCity(city.id)
    const citySalespeople = cityManagers.flatMap(m => store.getSalespeopleByManager(m.id))
    const salespersonIds = citySalespeople.map(s => s.id)
    const cityOrders = store.orders.filter(o => salespersonIds.includes(o.salespersonId))
    const totalAmount = cityOrders.reduce((sum, o) => sum + o.totalAmount, 0)
    const targetAmount = citySalespeople.reduce((sum, s) => sum + s.monthlyTarget, 0)
    
    return {
      cityId: city.id,
      cityName: city.name,
      regionName: region?.name || '',
      managerCount: cityManagers.length,
      salespersonCount: citySalespeople.length,
      totalAmount,
      targetAmount,
      completion: targetAmount ? Math.round(totalAmount / targetAmount * 100) : 0,
      orderCount: cityOrders.length
    }
  }).sort((a, b) => b.totalAmount - a.totalAmount)
})
</script>

<template>
  <div class="region-analysis">
    <!-- Region Summary Cards -->
    <div class="region-grid">
      <div 
        v-for="region in regionStats" 
        :key="region.regionId" 
        class="region-card"
        :class="{ active: selectedRegion === region.regionId }"
        @click="selectedRegion = selectedRegion === region.regionId ? '' : region.regionId"
      >
        <div class="region-header">
          <span class="region-name">{{ region.regionName }}</span>
          <span class="region-tag" :class="region.completion >= 100 ? 'success' : region.completion >= 80 ? 'warning' : 'danger'">
            {{ region.completion }}%
          </span>
        </div>
        <div class="region-value">¥{{ (region.totalAmount / 10000).toFixed(1) }}万</div>
        <div class="region-meta">
          <span>客户 {{ region.clientCount }}</span>
          <span>代理 {{ region.distributorCount }}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: Math.min(region.completion, 100) + '%' }"></div>
        </div>
      </div>
    </div>

    <!-- City Table -->
    <section class="section-box">
      <div class="section-header">
        <h3>城市销售明细</h3>
        <select v-model="selectedRegion" class="filter-select">
          <option value="">全部大区</option>
          <option v-for="r in store.regions" :key="r.id" :value="r.id">{{ r.name }}</option>
        </select>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>大区</th>
            <th>城市</th>
            <th>经理</th>
            <th>销售</th>
            <th>订单</th>
            <th>销售额</th>
            <th>目标</th>
            <th>达成率</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="city in cityStats" :key="city.cityId">
            <td>{{ city.regionName }}</td>
            <td>{{ city.cityName }}</td>
            <td>{{ city.managerCount }}</td>
            <td>{{ city.salespersonCount }}</td>
            <td>{{ city.orderCount }}</td>
            <td class="amount">¥{{ (city.totalAmount / 10000).toFixed(2) }}万</td>
            <td>¥{{ (city.targetAmount / 10000).toFixed(2) }}万</td>
            <td>
              <span :class="city.completion >= 100 ? 'status-success' : city.completion >= 80 ? '' : 'status-danger'">
                {{ city.completion }}%
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.region-analysis {}

.region-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 20px;
  margin-bottom: 32px;
}

.region-card {
  background: var(--card);
  padding: 24px;
  border-radius: var(--radius);
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.region-card:hover { box-shadow: 0 8px 20px rgba(0,0,0,0.06); }
.region-card.active { border-color: var(--primary); }

.region-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.region-name { font-weight: 600; }

.region-tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.region-tag.success { background: #dcf5e4; color: var(--success); }
.region-tag.warning { background: #fff3cd; color: #856404; }
.region-tag.danger { background: #fee2e2; color: var(--danger); }

.region-value {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
}

.region-meta {
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.progress-bar {
  height: 6px;
  background: #eee;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 3px;
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

.filter-select {
  padding: 8px 16px;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  cursor: pointer;
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
.amount { font-weight: 600; }
.status-success { color: var(--success); font-weight: 500; }
.status-danger { color: var(--danger); font-weight: 500; }

@media (max-width: 1024px) {
  .region-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
