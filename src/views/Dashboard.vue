<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMedicalSalesStore } from '@/stores/medicalSales'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart, BarChart, LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
} from 'echarts/components'
import VChart from 'vue-echarts'

use([
  CanvasRenderer,
  PieChart,
  BarChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
])

const store = useMedicalSalesStore()
const stats = computed(() => store.overallStats)
const regionStats = computed(() => store.regionStats)

// Selected region for drill-down
const selectedRegion = ref<string | null>(null)

// Region cities mapping
const regionCities = computed(() => {
  if (!selectedRegion.value) return []
  return store.cities.filter(c => c.regionId === selectedRegion.value)
})

const regionCityStats = computed(() => {
  if (!selectedRegion.value) return []
  const cities = regionCities.value
  return cities.map(city => {
    const cityManagers = store.managers.filter(m => m.cityId === city.id)
    const managerIds = cityManagers.map(m => m.id)
    const citySalespeople = store.salespeople.filter(s => managerIds.includes(s.managerId))
    const salespersonIds = citySalespeople.map(s => s.id)
    const cityOrders = store.orders.filter(o => salespersonIds.includes(o.salespersonId))
    const totalAmount = cityOrders.reduce((sum, o) => sum + o.totalAmount, 0)
    
    return {
      name: city.name,
      orderCount: cityOrders.length,
      totalAmount,
      salespersonCount: citySalespeople.length
    }
  })
})

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
      cityName: city?.name || '',
      totalAmount,
      completion: m.monthlyTarget ? Math.round(totalAmount / m.monthlyTarget * 100) : 0
    }
  }).sort((a, b) => b.completion - a.completion).slice(0, 5)
})

// Top region
const topRegion = computed(() => {
  const sorted = [...regionStats.value].sort((a, b) => b.totalAmount - a.totalAmount)
  return sorted[0]
})

// Use topRegion to avoid unused variable warning
console.log(topRegion.value)

// Region pie chart
const regionPieOption = computed(() => ({
  tooltip: {
    trigger: 'item',
    formatter: '{b}: ¥{c}万 ({d}%)'
  },
  series: [{
    type: 'pie',
    radius: ['45%', '75%'],
    center: ['50%', '50%'],
    avoidLabelOverlap: false,
    itemStyle: {
      borderRadius: 8,
      borderColor: '#fff',
      borderWidth: 2
    },
    label: { show: false },
    emphasis: {
      label: {
        show: true,
        fontSize: 14,
        fontWeight: 'bold'
      },
      itemStyle: {
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowColor: 'rgba(0, 0, 0, 0.2)'
      }
    },
    data: regionStats.value.map(r => ({
      name: r.regionName,
      value: Math.round(r.totalAmount / 10000),
      itemStyle: {
        color: r.regionId === selectedRegion.value ? '#0071E3' : undefined
      }
    }))
  }],
  color: ['#0071E3', '#34C759', '#FF9500', '#AF52DE', '#FF3B30']
}))

// Trend chart (mock monthly data)
const trendOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
  xAxis: {
    type: 'category',
    data: ['1月', '2月', '3月', '4月', '5月', '6月'],
    axisLine: { show: false },
    axisTick: { show: false }
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { type: 'dashed', color: '#f0f0f0' } }
  },
  series: [{
    type: 'line',
    data: [120, 132, 101, 134, 290, 230],
    smooth: true,
    lineStyle: { color: '#0071E3', width: 3 },
    areaStyle: {
      color: {
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(0,113,227,0.2)' },
          { offset: 1, color: 'rgba(0,113,227,0)' }
        ]
      }
    },
    showSymbol: false
  }]
}))

// City bar chart for selected region
const cityBarOption = computed(() => {
  const data = regionCityStats.value
  return {
    tooltip: { trigger: 'axis', formatter: '{b}: ¥{c}万' },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: data.map(d => d.name),
      axisLine: { show: false },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { type: 'dashed', color: '#f0f0f0' } }
    },
    series: [{
      type: 'bar',
      data: data.map(d => Math.round(d.totalAmount / 10000)),
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: '#0071E3'
      },
      barWidth: '50%'
    }]
  }
})

const selectRegion = (regionId: string) => {
  selectedRegion.value = selectedRegion.value === regionId ? null : regionId
}
</script>

<template>
  <div class="dashboard">
    <!-- Grid Layout -->
    <div class="grid-layout">
      <!-- Left: Region Analysis with Chart -->
      <div class="region-card">
        <div class="card-header">
          <h3>核心区域渗透率分析</h3>
          <router-link to="/regions" class="view-link">查看全国地图 →</router-link>
        </div>
        
        <div class="chart-grid">
          <!-- Region Pie Chart -->
          <div class="chart-box">
            <v-chart class="mini-chart" :option="regionPieOption" autoresize @click="selectRegion($event.name)" />
            <div class="chart-hint">点击扇区查看城市明细</div>
          </div>
          
          <!-- Region Detail or Trend -->
          <div class="chart-box">
            <div v-if="selectedRegion" class="region-detail">
              <div class="detail-header">
                <h4>{{ store.regions.find(r => r.id === selectedRegion)?.name }} - 城市明细</h4>
                <button class="close-btn" @click="selectedRegion = null">✕</button>
              </div>
              <v-chart class="mini-chart" :option="cityBarOption" autoresize />
              <div class="city-list">
                <div v-for="city in regionCityStats" :key="city.name" class="city-item">
                  <span class="city-name">{{ city.name }}</span>
                  <span class="city-value">¥{{ (city.totalAmount / 10000).toFixed(1) }}万</span>
                  <span class="city-count">{{ city.orderCount }}单</span>
                </div>
              </div>
            </div>
            <div v-else>
              <div class="detail-header">
                <h4>销售趋势</h4>
              </div>
              <v-chart class="mini-chart" :option="trendOption" autoresize />
            </div>
          </div>
        </div>

        <div class="region-stats">
          <div class="stat-item" v-for="r in regionStats.slice(0, 3)" :key="r.regionId"
               :class="{ active: selectedRegion === r.regionId }"
               @click="selectRegion(r.regionId)">
            <span class="stat-label">{{ r.regionName }}</span>
            <div class="stat-value">¥{{ (r.totalAmount / 10000).toFixed(0) }}万</div>
            <div class="stat-sub">{{ r.orderCount }}单 · {{ r.completion }}%</div>
          </div>
        </div>
      </div>

      <!-- Right: Manager Ranking -->
      <div class="region-card">
        <h3 class="card-title">战区经理排名 (MoM)</h3>
        
        <div class="ranking-list">
          <div v-for="(m, index) in managerStats" :key="m.id" class="ranking-item"
               :class="{ 'rank-top': index < 3 }">
            <div class="rank-number" :class="{ 'rank-gold': index === 0, 'rank-silver': index === 1, 'rank-bronze': index === 2 }">
              {{ index + 1 }}
            </div>
            <div class="rank-left">
              <div class="avatar">{{ m.name.charAt(0) }}</div>
              <div class="rank-info">
                <div class="rank-name">{{ m.name }}</div>
                <div class="rank-region">{{ m.regionName }} · {{ m.cityName }}</div>
              </div>
            </div>
            <div class="rank-right">
              <div class="rank-percent" :class="{ 'text-success': m.completion >= 100 }">{{ m.completion }}%</div>
              <span 
                class="badge" 
                :class="m.completion >= 100 ? 'badge-success' : m.completion >= 80 ? 'badge-warning' : 'badge-danger'"
              >
                {{ m.completion >= 100 ? '达成' : m.completion >= 80 ? '接近' : '需跟进' }}
              </span>
            </div>
          </div>
        </div>

        <router-link to="/team" class="btn-view-all">穿透查看全员数据 →</router-link>
      </div>
    </div>

    <!-- KPI Row -->
    <div class="kpi-row">
      <div class="kpi-card" v-for="(kpi, idx) in [
        { label: '本月总销售额', value: '¥' + (stats.totalAmount / 10000).toFixed(0) + '万', icon: '💰', trend: '+12.5%' },
        { label: '活跃机构', value: stats.totalClients, icon: '🏥', trend: '+3' },
        { label: '代理商', value: stats.totalDistributors, icon: '🤝', trend: '+1' },
        { label: '销售人员', value: stats.totalSalespeople, icon: '👥', trend: '持平' },
        { label: '订单总数', value: stats.totalOrders, icon: '📋', trend: '+8' }
      ]" :key="idx">
        <div class="kpi-header">
          <span class="kpi-icon">{{ kpi.icon }}</span>
          <span class="kpi-trend" :class="{ up: kpi.trend.startsWith('+'), down: kpi.trend.startsWith('-') }">{{ kpi.trend }}</span>
        </div>
        <span class="kpi-label">{{ kpi.label }}</span>
        <div class="kpi-value">{{ kpi.value }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

.dashboard {
  font-family: 'Inter', -apple-system, sans-serif;
}

.grid-layout {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.region-card {
  background: var(--card);
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.04);
  transition: box-shadow 0.3s ease;
}

.region-card:hover {
  box-shadow: 0 8px 32px rgba(0,0,0,0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-header h3, .card-title {
  font-size: 17px;
  font-weight: 700;
  color: #1D1D1F;
}

.view-link {
  font-size: 13px;
  color: var(--accent);
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s;
}

.view-link:hover {
  text-decoration: underline;
}

/* Chart Grid */
.chart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.chart-box {
  background: #FAFAFC;
  border-radius: 16px;
  padding: 16px;
  position: relative;
}

.mini-chart {
  height: 180px;
}

.chart-hint {
  text-align: center;
  font-size: 11px;
  color: #86868B;
  margin-top: 4px;
}

/* Region Detail */
.region-detail {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.detail-header h4 {
  font-size: 13px;
  font-weight: 600;
  color: #1D1D1F;
}

.close-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: #F2F2F7;
  color: #86868B;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #E5E5EA;
  color: #1D1D1F;
}

.city-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.city-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 6px 10px;
  background: white;
  border-radius: 8px;
}

.city-name { font-weight: 600; color: #1D1D1F; flex: 1; }
.city-value { color: var(--accent); font-weight: 600; }
.city-count { color: #86868B; font-size: 11px; }

/* Region Stats */
.region-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stat-item {
  padding: 16px;
  background: #FAFAFC;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.stat-item:hover {
  background: #F2F2F7;
  transform: translateY(-2px);
}

.stat-item.active {
  border-color: var(--accent);
  background: rgba(0,113,227,0.04);
}

.stat-label {
  font-size: 11px;
  color: #86868B;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  margin-top: 6px;
  color: #1D1D1F;
  font-family: 'Inter', sans-serif;
}

.stat-sub {
  font-size: 11px;
  color: #86868B;
  margin-top: 2px;
}

/* Ranking List */
.card-title {
  margin-bottom: 20px;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  transition: all 0.2s;
}

.ranking-item:hover {
  background: #F9F9FB;
}

.rank-top {
  background: linear-gradient(135deg, rgba(255,215,0,0.05), rgba(255,215,0,0.02));
}

.rank-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #86868B;
  background: #F2F2F7;
  flex-shrink: 0;
}

.rank-gold { background: linear-gradient(135deg, #FFD700, #FFA500); color: white; }
.rank-silver { background: linear-gradient(135deg, #C0C0C0, #A0A0A0); color: white; }
.rank-bronze { background: linear-gradient(135deg, #CD7F32, #B87333); color: white; }

.rank-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.avatar {
  width: 36px;
  height: 36px;
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
  color: #1D1D1F;
}

.rank-region {
  font-size: 12px;
  color: #86868B;
}

.rank-right {
  text-align: right;
}

.rank-percent {
  font-size: 16px;
  font-weight: 700;
  color: #1D1D1F;
  font-family: 'Inter', sans-serif;
}

.text-success { color: #34C759; }

.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  margin-top: 4px;
}

.badge-success { background: #E3FBE9; color: #1DB440; }
.badge-warning { background: #FFF4E5; color: #FF9500; }
.badge-danger { background: #FEE2E2; color: #EF4444; }

.btn-view-all {
  display: block;
  width: 100%;
  margin-top: 20px;
  padding: 12px;
  border: none;
  border-radius: 12px;
  background: #F5F5F7;
  color: var(--text);
  font-weight: 600;
  font-size: 13px;
  text-decoration: none;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-view-all:hover {
  background: #E8E8ED;
  transform: translateY(-1px);
}

/* KPI Row */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
}

.kpi-card {
  background: var(--card);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.03);
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.kpi-card:hover {
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  transform: translateY(-4px);
  border-color: rgba(0,113,227,0.1);
}

.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.kpi-icon {
  font-size: 20px;
}

.kpi-trend {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 8px;
}

.kpi-trend.up {
  background: #E3FBE9;
  color: #1DB440;
}

.kpi-trend.down {
  background: #FEE2E2;
  color: #EF4444;
}

.kpi-label {
  font-size: 12px;
  color: #86868B;
  font-weight: 500;
}

.kpi-value {
  font-size: 24px;
  font-weight: 800;
  margin-top: 8px;
  color: #1D1D1F;
  font-family: 'Inter', sans-serif;
  letter-spacing: -0.5px;
}

@media (max-width: 1200px) {
  .grid-layout { grid-template-columns: 1fr; }
  .chart-grid { grid-template-columns: 1fr; }
  .kpi-row { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 768px) {
  .kpi-row { grid-template-columns: repeat(2, 1fr); }
  .region-stats { grid-template-columns: 1fr; }
}
</style>
