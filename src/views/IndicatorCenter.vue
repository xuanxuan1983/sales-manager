<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { ScatterChart, BarChart, LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  MarkPointComponent,
  MarkAreaComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import type { MonthlyIndicator } from '@/types/sales'
import { useMedicalSalesStore } from '@/stores/medicalSales'
import { generateTemplate, parseIndicatorsExcel } from '@/utils/import'
import { useRouter } from 'vue-router'

const router = useRouter()

use([
  CanvasRenderer, ScatterChart, BarChart, LineChart,
  TitleComponent, TooltipComponent, GridComponent, LegendComponent,
  MarkLineComponent, MarkPointComponent, MarkAreaComponent
])

const store = useMedicalSalesStore()
const filterDate = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const activeTab = ref<'overview' | 'detail' | 'monthly'>('overview')

// Drill-down Logic
const getRegionDetails = (regionName: string) => {
  const grouped = new Map<string, any>()
  store.indicators.filter(i => i.regionName === regionName).forEach(i => {
    const key = i.salespersonName || 'Unknown'
    if (!grouped.has(key)) {
      grouped.set(key, { name: key, salesA: 0, salesATarget: 0, salesB: 0, salesBTarget: 0 })
    }
    const current = grouped.get(key)
    current.salesA += i.salesAActual || 0
    current.salesB += i.salesBActual || 0
    current.salesATarget += i.salesATarget || 0
    current.salesBTarget += i.salesBTarget || 0
  })
  return Array.from(grouped.values()).sort((a, b) => b.salesA - a.salesA)
}

// Monthly Trends
const monthlyIndicators = computed(() => {
  const grouped = new Map<string, MonthlyIndicator>()
  store.indicators.forEach(item => {
    const key = `${item.year}-${item.month}`
    if (!grouped.has(key)) {
      grouped.set(key, { ...item, salesATarget: 0, salesAActual: 0, salesBTarget: 0, salesBActual: 0 })
    }
    const current = grouped.get(key)!
    current.salesATarget += item.salesATarget || 0
    current.salesAActual += item.salesAActual || 0
    current.salesBTarget += item.salesBTarget || 0
    current.salesBActual += item.salesBActual || 0
  })
  return Array.from(grouped.values()).sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
})

// Import Logic
const handleImportShortcut = () => fileInput.value?.click()

const onFileSelected = async (event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target.files?.length) return
  try {
    const file = target.files[0]
    ElMessage.info('正在解析实绩数据...')
    const result = await parseIndicatorsExcel(file)
    if (result.data.length > 0) {
      store.importIndicators(result.data as unknown as MonthlyIndicator[])
      ElMessage.success(`成功导入 ${result.data.length} 条实绩数据！`)
    } else {
      ElMessage.warning('文件中未发现有效数据')
    }
  } catch (e: any) {
    ElMessage.error('导入失败: ' + e.message)
  } finally {
    target.value = ''
  }
}

const downloadTemplate = () => {
  generateTemplate('indicators')
  ElMessage.success('模板已下载')
}

// Performance Logic
const totalActualA = computed(() => store.indicators.reduce((sum, i) => sum + (i.salesAActual || 0), 0))
const totalActualB = computed(() => store.indicators.reduce((sum, i) => sum + (i.salesBActual || 0), 0))

const yearProgress = computed(() => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const end = new Date(now.getFullYear(), 11, 31)
  return Math.min(100, ((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100)
})

const performanceA = computed(() => {
  if (store.currentTarget.salesA === 0) return 0
  return Math.min(100, Math.round((totalActualA.value / store.currentTarget.salesA) * 100))
})

const performanceB = computed(() => {
  if (store.currentTarget.salesB === 0) return 0
  return Math.min(100, Math.round((totalActualB.value / store.currentTarget.salesB) * 100))
})

const isBehindSchedule = (perf: number) => perf < yearProgress.value

// Region Attributes
const regionAttributes = computed(() => {
  return store.regions.map(r => {
    const targetData = store.regionTargets[r.id]
    const targetA = targetData?.salesA || 0
    const targetB = targetData?.salesB || 0
    let actualA = 0, actualB = 0
    store.indicators.filter(i => i.regionName === r.name).forEach(i => {
      actualA += i.salesAActual || 0
      actualB += i.salesBActual || 0
    })
    const growth = targetA > 0 ? ((actualA - targetA) / targetA) : 0
    return {
      name: r.name, region: r.name, salesA: actualA, salesB: actualB,
      target: targetA, targetB, growth: isNaN(growth) ? 0 : growth
    }
  })
})

// Charts
const healthMatrixOption = computed(() => ({
  title: { text: '双渠道健康度透视', left: 'center', textStyle: { fontSize: 14 } },
  tooltip: { formatter: (params: any) => `<b>${params.data.name}</b><br/>Sales-A: ${params.data.value[0]}<br/>Sales-B: ${params.data.value[1]}` },
  grid: { left: '10%', right: '10%', bottom: '10%', top: '20%' },
  xAxis: { name: 'Sales-A (进货)', splitLine: { show: false } },
  yAxis: { name: 'Sales-B (纯销)', splitLine: { show: false } },
  series: [{
    type: 'scatter', symbolSize: 20,
    data: regionAttributes.value.map(item => ({
      name: item.name, value: [item.salesA, item.salesB],
      itemStyle: { color: item.salesA > item.salesB * 1.2 ? '#FF9500' : item.salesB > item.salesA ? '#34C759' : '#0071E3' }
    })),
    markArea: {
      silent: true, itemStyle: { color: 'transparent', borderWidth: 1, borderType: 'dashed' },
      data: [
        [{ name: '库存积压区', xAxis: 'center', yAxis: 0 }, { xAxis: 'max', yAxis: 'center' }],
        [{ name: '良性发展区', xAxis: 0, yAxis: 'center' }, { xAxis: 'center', yAxis: 'max' }]
      ]
    }
  }]
}))

const gapWaterfallOption = computed(() => {
  const data = regionAttributes.value.map(r => ({ name: r.name, value: r.salesA - r.target })).sort((a, b) => a.value - b.value)
  return {
    title: { text: '业绩差距分析', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { bottom: '10%', left: '3%', right: '4%', containLabel: true },
    xAxis: { type: 'category', data: data.map(d => d.name), axisLabel: { interval: 0 } },
    yAxis: { type: 'value', name: '差距金额' },
    series: [{ type: 'bar', data: data.map(d => ({ value: d.value, itemStyle: { color: d.value >= 0 ? '#34C759' : '#EF4444' } })), label: { show: true, position: 'top' } }]
  }
})

const cumulativeTrendOption = computed(() => {
  const months = monthlyIndicators.value.map(m => `${m.month}月`)
  const targetCumulative: number[] = [], actualCumulative: number[] = []
  let tSum = 0, aSum = 0
  monthlyIndicators.value.forEach(m => { tSum += m.salesATarget || 0; aSum += m.salesAActual || 0; targetCumulative.push(tSum); actualCumulative.push(aSum) })
  return {
    title: { text: '年度累计销售趋势', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' }, legend: { bottom: 0, data: ['累计目标', '累计达成'] },
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value', name: '累计金额' },
    series: [
      { name: '累计目标', type: 'line', data: targetCumulative, smooth: true, lineStyle: { color: '#0071E3', width: 3 }, showSymbol: false },
      { name: '累计达成', type: 'line', data: actualCumulative, smooth: true, lineStyle: { color: '#FF9500', width: 3 }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(255,149,0,0.2)' }, { offset: 1, color: 'rgba(255,149,0,0)' }] } }, showSymbol: false }
    ]
  }
})

const getCompletionColor = (actual: number, target: number) => {
  const rate = actual / target
  if (rate >= 1) return 'success'
  if (rate >= 0.8) return 'warning'
  return 'danger'
}

const getInventoryStatus = (salesA: number, salesB: number) => {
  const ratio = salesA / salesB
  if (ratio > 1.2) return { text: '积压', type: 'danger' as const }
  if (salesB > salesA) return { text: '缺货', type: 'warning' as const }
  return { text: '正常', type: 'success' as const }
}

const formatTrend = (growth: number) => (growth > 0 ? '+' : '') + (growth * 100).toFixed(1) + '%'
</script>

<template>
  <div class="indicator-center">
    <!-- Header -->
    <div class="page-header">
      <div class="header-title-section">
        <h1>📊 指标管理驾驶舱</h1>
        <p class="subtitle">全域销售指标实时监控 · {{ new Date().getFullYear() }}战略视图</p>
      </div>
      <div class="header-actions">
        <input type="file" ref="fileInput" accept=".xlsx,.xls" style="display: none" @change="onFileSelected">
        <el-button link type="primary" @click="downloadTemplate">下载实绩模板</el-button>
        <el-button type="success" plain @click="handleImportShortcut">📥 导入本月实绩</el-button>
        <el-button type="primary" plain @click="router.push('/targets')">🎯 调整战略</el-button>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="kpi-cards">
      <div class="kpi-card" :class="{ danger: isBehindSchedule(performanceA) }">
        <div class="kpi-header">
          <span class="kpi-label">Sales-A 渠道进货达成</span>
          <el-tag :type="isBehindSchedule(performanceA) ? 'danger' : 'success'" size="small">
            {{ isBehindSchedule(performanceA) ? '落后' : '正常' }}
          </el-tag>
        </div>
        <div class="kpi-value">¥{{ (totalActualA / 10000).toFixed(1) }}<span class="unit">万</span></div>
        <div class="kpi-target">目标: ¥{{ (store.currentTarget.salesA / 10000).toFixed(1) }}万</div>
        <div class="progress-wrapper">
          <el-progress :percentage="performanceA" :color="isBehindSchedule(performanceA) ? '#F56C6C' : '#67C23A'" :stroke-width="10" :show-text="true" />
          <div class="time-marker" :style="{ left: yearProgress + '%' }">
            <div class="marker-line"></div>
            <span class="marker-label">时间进度</span>
          </div>
        </div>
        <div class="kpi-footer">
          <span>达成率: <strong>{{ performanceA }}%</strong></span>
          <span>时间进度: <strong>{{ yearProgress.toFixed(1) }}%</strong></span>
        </div>
      </div>

      <div class="kpi-card" :class="{ danger: isBehindSchedule(performanceB) }">
        <div class="kpi-header">
          <span class="kpi-label">Sales-B 纯销达成</span>
          <el-tag :type="isBehindSchedule(performanceB) ? 'danger' : 'success'" size="small">
            {{ isBehindSchedule(performanceB) ? '落后' : '正常' }}
          </el-tag>
        </div>
        <div class="kpi-value" style="color: #0071E3">¥{{ (totalActualB / 10000).toFixed(1) }}<span class="unit">万</span></div>
        <div class="kpi-target">目标: ¥{{ (store.currentTarget.salesB / 10000).toFixed(1) }}万</div>
        <div class="progress-wrapper">
          <el-progress :percentage="performanceB" :color="isBehindSchedule(performanceB) ? '#F56C6C' : '#0071E3'" :stroke-width="10" :show-text="true" />
          <div class="time-marker" :style="{ left: yearProgress + '%' }">
            <div class="marker-line"></div>
          </div>
        </div>
        <div class="kpi-footer">
          <span>达成率: <strong>{{ performanceB }}%</strong></span>
          <span>时间进度: <strong>{{ yearProgress.toFixed(1) }}%</strong></span>
        </div>
      </div>

      <!-- Scenario Card -->
      <div class="kpi-card scenario-card">
        <div class="kpi-header">
          <span class="kpi-label">情景模拟</span>
        </div>
        <div class="scenario-content">
          <el-radio-group v-model="store.activeScenarioKey" size="default">
            <el-radio-button label="worst">🛡️ 保底</el-radio-button>
            <el-radio-button label="base">⚖️ 基准</el-radio-button>
            <el-radio-button label="best">🚀 冲刺</el-radio-button>
          </el-radio-group>
          <div class="scenario-info">
            <div class="scenario-item">
              <span class="s-label">保底倍率</span>
              <el-input-number v-model="store.scenarios.worstMultiplier" :step="0.05" :min="0.5" :max="1.5" size="small" />
            </div>
            <div class="scenario-item">
              <span class="s-label">冲刺倍率</span>
              <el-input-number v-model="store.scenarios.bestMultiplier" :step="0.05" :min="0.8" :max="2.0" size="small" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="charts-row">
      <div class="chart-card large">
        <div class="chart-header">
          <h3>年度累计销售趋势</h3>
          <el-date-picker v-model="filterDate" type="month" :placeholder="new Date().getFullYear() + '-01'" size="small" style="width: 130px" />
        </div>
        <v-chart class="chart" :option="cumulativeTrendOption" autoresize />
      </div>
      <div class="chart-card">
        <h3>双渠道健康度透视</h3>
        <v-chart class="chart" :option="healthMatrixOption" autoresize />
        <div class="chart-legend">
          <span class="legend-item"><span class="dot warning"></span>积压预警 (A > 1.2*B)</span>
          <span class="legend-item"><span class="dot success"></span>供不应求 (B > A)</span>
        </div>
      </div>
      <div class="chart-card">
        <h3>业绩差距分析</h3>
        <v-chart class="chart" :option="gapWaterfallOption" autoresize />
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-section">
      <div class="tabs-header">
        <button 
          v-for="tab in ([{key: 'overview' as const, label: '区域概览'}, {key: 'detail' as const, label: '团队明细'}, {key: 'monthly' as const, label: '月度趋势'}])" 
          :key="tab.key"
          class="tab-btn"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Overview Tab -->
      <div v-show="activeTab === 'overview'" class="tab-content">
        <el-table :data="regionAttributes" style="width: 100%" stripe>
          <el-table-column prop="name" label="大区" width="120" fixed />
          <el-table-column label="Sales-A (进货)" align="right" min-width="180">
            <template #default="{ row }">
              <div class="metric-cell">
                <span class="value">{{ row.salesA }}</span>
                <span class="sub">/ {{ row.target }}</span>
              </div>
              <el-progress :percentage="Math.min(Math.round(row.salesA/row.target*100), 100)" :status="getCompletionColor(row.salesA, row.target)" :stroke-width="6" :show-text="false" />
            </template>
          </el-table-column>
          <el-table-column label="Sales-B (纯销)" align="right" min-width="140">
            <template #default="{ row }">
              <span class="value">{{ row.salesB }}</span>
            </template>
          </el-table-column>
          <el-table-column label="健康度" width="140" align="center">
            <template #default="{ row }">
              <div class="health-cell">
                <el-tag :type="getInventoryStatus(row.salesA, row.salesB).type" size="small" effect="dark">
                  {{ getInventoryStatus(row.salesA, row.salesB).text }}
                </el-tag>
                <span :class="['trend', row.growth > 0 ? 'up' : 'down']">{{ formatTrend(row.growth) }}</span>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- Detail Tab -->
      <div v-show="activeTab === 'detail'" class="tab-content">
        <el-table :data="regionAttributes" style="width: 100%" stripe>
          <el-table-column type="expand">
            <template #default="props">
              <div class="expand-content">
                <h4>{{ props.row.name }} - 销售团队业绩排名</h4>
                <el-table :data="getRegionDetails(props.row.name)" size="small" border>
                  <el-table-column prop="name" label="销售经理/代表" width="150" />
                  <el-table-column label="Sales-A 实绩" align="right">
                    <template #default="{ row }">
                      {{ row.salesA }} <span class="text-muted">/ {{ row.salesATarget }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="达成率" width="160">
                    <template #default="{ row }">
                      <el-progress :percentage="Math.min(100, Math.round(row.salesA/(row.salesATarget||1)*100))" />
                    </template>
                  </el-table-column>
                  <el-table-column prop="salesB" label="Sales-B 纯销" align="right" />
                </el-table>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="大区" width="100" />
          <el-table-column label="Sales-A 实绩/目标" align="right" min-width="200">
            <template #default="{ row }">
              {{ row.salesA }} / {{ row.target }}
            </template>
          </el-table-column>
          <el-table-column prop="salesB" label="Sales-B 纯销" align="right" />
        </el-table>
      </div>

      <!-- Monthly Tab -->
      <div v-show="activeTab === 'monthly'" class="tab-content">
        <el-table :data="monthlyIndicators" style="width: 100%" stripe>
          <el-table-column prop="month" label="月份" width="80" />
          <el-table-column label="Sales-A 达成" align="right">
            <template #default="{ row }">
              <div class="metric-cell">
                <span class="value">{{ row.salesAActual }}</span>
                <span class="sub">/ {{ row.salesATarget }}</span>
              </div>
              <el-progress :percentage="Math.min(100, Math.round(row.salesAActual/(row.salesATarget||1)*100))" :stroke-width="4" :show-text="false" />
            </template>
          </el-table-column>
          <el-table-column label="Sales-B 达成" align="right">
            <template #default="{ row }">
              <div class="metric-cell">
                <span class="value">{{ row.salesBActual }}</span>
                <span class="sub">/ {{ row.salesBTarget }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="A/B 比率" align="center" width="100">
            <template #default="{ row }">
              <el-tag :type="row.salesAActual > row.salesBActual * 1.2 ? 'warning' : 'success'" size="small">
                {{ (row.salesAActual / (row.salesBActual || 1)).toFixed(2) }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.indicator-center { padding-bottom: 40px; }

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #E5E7EB;
}

.header-title-section h1 {
  font-size: 24px;
  font-weight: 700;
  color: #1F2937;
  margin: 0 0 6px 0;
}

.subtitle { color: #6B7280; font-size: 14px; }

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* KPI Cards */
.kpi-cards {
  display: grid;
  grid-template-columns: 1fr 1fr 0.8fr;
  gap: 20px;
  margin-bottom: 24px;
}

.kpi-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.04);
  border: 2px solid transparent;
  transition: all 0.3s;
}

.kpi-card:hover {
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
}

.kpi-card.danger {
  border-color: #FEE2E2;
  background: linear-gradient(135deg, #fff, #FEF2F2);
}

.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.kpi-label {
  font-size: 13px;
  color: #6B7280;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.kpi-value {
  font-size: 32px;
  font-weight: 700;
  color: #1F2937;
  margin-bottom: 4px;
  letter-spacing: -1px;
}

.kpi-value .unit {
  font-size: 16px;
  color: #9CA3AF;
  font-weight: 500;
  margin-left: 4px;
}

.kpi-target {
  font-size: 13px;
  color: #9CA3AF;
  margin-bottom: 16px;
}

.progress-wrapper {
  position: relative;
  margin-bottom: 12px;
}

.time-marker {
  position: absolute;
  top: -4px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.marker-line {
  width: 2px;
  height: 24px;
  background: #6B7280;
}

.marker-label {
  font-size: 10px;
  color: #6B7280;
  white-space: nowrap;
  margin-top: 2px;
}

.kpi-footer {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #6B7280;
  padding-top: 12px;
  border-top: 1px solid #F3F4F6;
}

.kpi-footer strong {
  color: #1F2937;
}

/* Scenario Card */
.scenario-card {
  display: flex;
  flex-direction: column;
}

.scenario-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.scenario-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: auto;
}

.scenario-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.s-label {
  font-size: 13px;
  color: #4B5563;
}

/* Charts */
.charts-row {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.chart-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.04);
}

.chart-card.large {
  grid-row: span 1;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.chart-card h3 {
  font-size: 15px;
  font-weight: 600;
  color: #1F2937;
  margin: 0 0 12px 0;
}

.chart {
  height: 280px;
}

.chart-legend {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  font-size: 12px;
  color: #6B7280;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot.warning { background: #FF9500; }
.dot.success { background: #34C759; }

/* Tabs */
.tabs-section {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.04);
  overflow: hidden;
}

.tabs-header {
  display: flex;
  border-bottom: 1px solid #E5E7EB;
  background: #FAFAFC;
}

.tab-btn {
  padding: 14px 24px;
  font-size: 14px;
  font-weight: 500;
  color: #6B7280;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.tab-btn:hover {
  color: #1F2937;
  background: rgba(0,0,0,0.02);
}

.tab-btn.active {
  color: #0071E3;
  font-weight: 600;
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 16px;
  right: 16px;
  height: 2px;
  background: #0071E3;
  border-radius: 2px;
}

.tab-content {
  padding: 20px;
}

/* Table Styles */
.metric-cell {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 4px;
}

.metric-cell .value {
  font-weight: 600;
  font-size: 14px;
}

.metric-cell .sub {
  font-size: 12px;
  color: #9CA3AF;
}

.health-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.trend {
  font-size: 12px;
  font-weight: 600;
}

.trend.up { color: #34C759; }
.trend.down { color: #EF4444; }

.expand-content {
  padding: 20px;
  background: #FAFAFC;
  border-radius: 12px;
  margin: 8px;
}

.expand-content h4 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #1F2937;
}

.text-muted {
  color: #9CA3AF;
  font-size: 12px;
}

/* Responsive */
@media (max-width: 1200px) {
  .kpi-cards { grid-template-columns: 1fr 1fr; }
  .charts-row { grid-template-columns: 1fr 1fr; }
  .chart-card.large { grid-column: span 2; }
}

@media (max-width: 768px) {
  .page-header { flex-direction: column; gap: 16px; }
  .kpi-cards { grid-template-columns: 1fr; }
  .charts-row { grid-template-columns: 1fr; }
  .chart-card.large { grid-column: span 1; }
  .tabs-header { overflow-x: auto; }
}
</style>
