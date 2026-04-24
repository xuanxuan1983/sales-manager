<script setup lang="ts">
import { computed } from 'vue'
import { useMedicalSalesStore } from '@/stores/medicalSales'

const store = useMedicalSalesStore()
const stats = computed(() => store.overallStats)
const regionStats = computed(() => store.regionStats)

// Manager stats for ranking
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
      regionName: region?.name || '',
      totalAmount,
      completion: m.monthlyTarget ? Math.round(totalAmount / m.monthlyTarget * 100) : 0
    }
  }).sort((a, b) => b.completion - a.completion).slice(0, 5)
})

// Top region card data
const topRegion = computed(() => {
  const sorted = [...regionStats.value].sort((a, b) => b.totalAmount - a.totalAmount)
  return sorted[0]
})
</script>

<template>
  <div class="dashboard">
    <!-- Grid Layout -->
    <div class="grid-layout">
      <!-- Left: Region Analysis Card -->
      <div class="region-card">
        <div class="card-header">
          <h3>核心区域渗透率分析</h3>
          <router-link to="/regions" class="view-link">查看全国地图 →</router-link>
        </div>
        
        <div class="map-placeholder">
          <div class="map-overlay">
            <div class="overlay-label">当前选定</div>
            <div class="overlay-value">{{ topRegion?.regionName }} 大区</div>
          </div>
        </div>

        <div class="region-stats">
          <div class="stat-item">
            <span class="stat-label">机构覆盖率</span>
            <div class="stat-value">{{ Math.min(100, Math.round((topRegion?.clientCount || 0) / 50 * 100)) }}%</div>
          </div>
          <div class="stat-item">
            <span class="stat-label">月回款额</span>
            <div class="stat-value">¥{{ ((topRegion?.totalAmount || 0) / 1000000).toFixed(2) }}M</div>
          </div>
          <div class="stat-item">
            <span class="stat-label">代理商库存</span>
            <div class="stat-value accent">充足</div>
          </div>
        </div>
      </div>

      <!-- Right: Manager Ranking -->
      <div class="region-card">
        <h3 class="card-title">战区经理排名 (MoM)</h3>
        
        <div class="ranking-list">
          <div v-for="(m, index) in managerStats" :key="m.id" class="ranking-item">
            <div class="rank-left">
              <div class="avatar">{{ m.name.charAt(0) }}</div>
              <div class="rank-info">
                <div class="rank-name">{{ m.name }}</div>
                <div class="rank-region">{{ m.regionName }}</div>
              </div>
            </div>
            <div class="rank-right">
              <div class="rank-percent">{{ m.completion }}%</div>
              <span 
                class="badge" 
                :class="m.completion >= 100 ? 'badge-success' : m.completion >= 80 ? 'badge-warning' : 'badge-danger'"
              >
                {{ m.completion >= 100 ? '达成目标' : m.completion >= 80 ? '接近目标' : '需跟进' }}
              </span>
            </div>
          </div>
        </div>

        <router-link to="/team" class="btn-view-all">穿透查看全员数据</router-link>
      </div>
    </div>

    <!-- KPI Row -->
    <div class="kpi-row">
      <div class="kpi-card">
        <span class="kpi-label">本月总销售额</span>
        <div class="kpi-value">¥{{ (stats.totalAmount / 10000).toFixed(0) }}万</div>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">活跃机构</span>
        <div class="kpi-value">{{ stats.totalClients }}</div>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">代理商</span>
        <div class="kpi-value">{{ stats.totalDistributors }}</div>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">销售人员</span>
        <div class="kpi-value">{{ stats.totalSalespeople }}</div>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">订单总数</span>
        <div class="kpi-value">{{ stats.totalOrders }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {}

.grid-layout {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 32px;
  margin-bottom: 32px;
}

.region-card {
  background: var(--card);
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.05);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.card-header h3, .card-title {
  font-size: 18px;
  font-weight: 600;
}

.view-link {
  font-size: 14px;
  color: var(--accent);
  text-decoration: none;
  cursor: pointer;
}

.view-link:hover {
  text-decoration: underline;
}

.map-placeholder {
  position: relative;
  height: 200px;
  background: linear-gradient(135deg, #e8e8ed 0%, #f5f5f7 100%);
  border-radius: 12px;
  margin-bottom: 24px;
}

.map-overlay {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(255,255,255,0.9);
  padding: 16px;
  border-radius: 12px;
  backdrop-filter: blur(4px);
}

.overlay-label {
  font-size: 12px;
  color: var(--secondary);
}

.overlay-value {
  font-weight: 600;
}

.region-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.stat-item {}

.stat-label {
  font-size: 12px;
  color: var(--secondary);
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  margin-top: 4px;
}

.stat-value.accent {
  color: var(--accent);
}

/* Ranking List */
.card-title {
  margin-bottom: 24px;
}

.ranking-list {
  display: flex;
  flex-direction: column;
}

.ranking-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #F2F2F2;
}

.ranking-item:last-child {
  border-bottom: none;
}

.rank-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
}

.rank-name {
  font-size: 14px;
  font-weight: 600;
}

.rank-region {
  font-size: 11px;
  color: var(--secondary);
}

.rank-right {
  text-align: right;
}

.rank-percent {
  font-size: 14px;
  font-weight: 600;
}

.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  margin-top: 4px;
}

.badge-success {
  background: #E3FBE9;
  color: #1DB440;
}

.badge-warning {
  background: #FFF4E5;
  color: #FF9500;
}

.badge-danger {
  background: #FEE2E2;
  color: #EF4444;
}

.btn-view-all {
  display: block;
  width: 100%;
  margin-top: 32px;
  padding: 12px;
  border: none;
  border-radius: 12px;
  background: #F5F5F7;
  color: var(--text);
  font-weight: 600;
  font-size: 14px;
  text-decoration: none;
  text-align: center;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-view-all:hover {
  background: #e8e8ed;
}

/* KPI Row */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 20px;
}

.kpi-card {
  background: var(--card);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}

.kpi-label {
  font-size: 12px;
  color: var(--secondary);
}

.kpi-value {
  font-size: 24px;
  font-weight: 700;
  margin-top: 8px;
}

@media (max-width: 1200px) {
  .grid-layout { grid-template-columns: 1fr; }
  .kpi-row { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 768px) {
  .kpi-row { grid-template-columns: repeat(2, 1fr); }
}
</style>
