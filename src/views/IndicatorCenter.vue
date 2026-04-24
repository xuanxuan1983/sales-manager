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
import type { MonthlyIndicator } from '@/types/sales' // Fixed: removed DualChannelIndicator
import { useMedicalSalesStore } from '@/stores/medicalSales'


use([
  CanvasRenderer,
  ScatterChart,
  BarChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  MarkPointComponent,
  MarkAreaComponent
])

// Mock Data (Expanded for visualization)
const store = useMedicalSalesStore()

const filterDate = ref('') // Added filterDate

// Drill-down Logic
const getRegionDetails = (regionName: string) => {
    // Filter indicators by region
    // Aggregate by Salesperson or City/Distributor based on data availability
    // store.indicators has 'salespersonName'
    
    // Group by Salesperson
    const grouped = new Map<string, any>()
    store.indicators.filter(i => i.regionName === regionName).forEach(i => {
        const key = i.salespersonName || 'Unknown'
        if (!grouped.has(key)) {
            grouped.set(key, { 
                name: key, 
                salesA: 0, 
                salesATarget: i.salesATarget || 0, // Assuming static target per row or need sum
                salesB: 0,
                salesBTarget: i.salesBTarget || 0
            })
        }
        const current = grouped.get(key)
        current.salesA += i.salesAActual || 0
        current.salesB += i.salesBActual || 0
        // Target in indicators might be monthly, so sum it up
        current.salesATarget += i.salesATarget || 0
        current.salesBTarget += i.salesBTarget || 0
    })
    
    return Array.from(grouped.values()).sort((a,b) => b.salesA - a.salesA)
}


// 1. Monthly Trends (Aggregated from store)
const monthlyIndicators = computed(() => {
  // Group by month
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

// Real-time Allocation Progress (Synced with Target Command)
const unallocated = computed(() => store.getUnallocatedTarget)

// Import Logic
const fileInput = ref<HTMLInputElement | null>(null)
import { parseIndicatorsExcel, generateTemplate } from '@/utils/import'

const handleImportShortcut = () => {
    fileInput.value?.click()
}

const onFileSelected = async (event: Event) => {
    const target = event.target as HTMLInputElement
    if (!target.files?.length) return
    
    try {
        const file = target.files[0]
        ElMessage.info('正在解析实绩数据...')
        const data = await parseIndicatorsExcel(file)
        
        if (data.length > 0) {
            store.importIndicators(data)
            ElMessage.success(`成功导入 ${data.length} 条实绩数据！`)
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
}
// Performance Logic (Actual vs Target)
const totalActualA = computed(() => store.indicators.reduce((sum, i) => sum + (i.salesAActual || 0), 0))
const totalActualB = computed(() => store.indicators.reduce((sum, i) => sum + (i.salesBActual || 0), 0))

// Time Pacing Logic
const yearProgress = computed(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 1)
    const end = new Date(now.getFullYear(), 11, 31)
    const total = end.getTime() - start.getTime()
    const current = now.getTime() - start.getTime()
    return Math.min(100, (current / total) * 100)
})

const performanceA = computed(() => {
    if (store.currentTarget.salesA === 0) return 0
    return Math.min(100, Math.round((totalActualA.value / store.currentTarget.salesA) * 100))
})

const performanceB = computed(() => {
    if (store.currentTarget.salesB === 0) return 0
    return Math.min(100, Math.round((totalActualB.value / store.currentTarget.salesB) * 100))
})

// Warning Logic
const isBehindSchedule = (perf: number) => perf < yearProgress.value


// 2. Region Attributes (Aggregated from store)
const regionAttributes = computed(() => {
  return store.regions.map(r => {
      // 1. Get Target (From Command Center)
      const targetData = store.regionTargets[r.id]
      const targetA = targetData?.salesA || 0
      const targetB = targetData?.salesB || 0
      
      // 2. Get Actuals (Aggregated from indicators/stats - Mock for now vs Target)
      // In a real app, we'd sum up store.indicators filtered by region
      // For this demo, let's look at the store.indicators to see if we have data for this region
      let actualA = 0
      let actualB = 0
      
      store.indicators.filter(i => i.regionName === r.name).forEach(i => {
          actualA += i.salesAActual || 0
          actualB += i.salesBActual || 0
      })
      
      // Calculate growth (Mock vs Target as proxy)
      const growth = targetA > 0 ? ((actualA - targetA) / targetA) : 0

      return {
          name: r.name,
          region: r.name,
          salesA: actualA,
          salesB: actualB,
          target: targetA, // Use SalesA as the primary bar target
          targetB: targetB, // Extra data if needed
          growth: isNaN(growth) ? 0 : growth
      }
  })
})

// Computed for Charts

// 1. Health Matrix Option (Scatter)
const healthMatrixOption = computed(() => {
  return {
    title: { text: '双渠道健康度透视 (Health Matrix)', left: 'center' },
    tooltip: {
      formatter: (params: any) => {
        return `<b>${params.data.name}</b><br/>Sales-A (进货): ${params.data.value[0]}<br/>Sales-B (纯销): ${params.data.value[1]}`
      }
    },
    grid: { left: '10%', right: '10%', bottom: '10%', top: '20%' },
    xAxis: { name: 'Sales-A (进货)', splitLine: { show: false } },
    yAxis: { name: 'Sales-B (纯销)', splitLine: { show: false } },
    series: [{
      type: 'scatter',
      symbolSize: 20,
      data: regionAttributes.value.map(item => ({
        name: item.name,
        value: [item.salesA, item.salesB],
        itemStyle: {
          color: item.salesA > item.salesB * 1.2 ? '#FF9500' : // High inventory
                 item.salesB > item.salesA ? '#34C759' : '#0071E3'  // Good or Normal
        }
      })),
      markArea: {
        silent: true,
        itemStyle: { color: 'transparent', borderWidth: 1, borderType: 'dashed' },
        data: [
          [{ name: '库存积压区 (High Inventory)', xAxis: 'center', yAxis: 0 }, { xAxis: 'max', yAxis: 'center' }],
          [{ name: '良性发展区 (Healthy)', xAxis: 0, yAxis: 'center' }, { xAxis: 'center', yAxis: 'max' }]
        ]
      },
      markLine: {
        lineStyle: { type: 'solid', color: '#999' },
        data: [{ name: '1:1 Ratio', slope: 1 }] // Ideal 1:1 line
      }
    }]
  }
})

// 2. Gap Waterfall Option
const gapWaterfallOption = computed(() => {
  // Logic: Calculate gap for each region
  const data = regionAttributes.value.map(r => ({
    name: r.name,
    value: r.salesA - r.target
  })).sort((a, b) => a.value - b.value) // Ascending order

  return {
    title: { text: '业绩差距分析 (Gap Analysis)', left: 'center' },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { bottom: '10%' },
    xAxis: {
      type: 'category',
      data: data.map(d => d.name),
      axisLabel: { interval: 0 }
    },
    yAxis: { type: 'value', name: '差距金额 (万)' },
    series: [{
      type: 'bar',
      data: data.map(d => ({
        value: d.value,
        itemStyle: { color: d.value >= 0 ? '#34C759' : '#EF4444' }
      })),
      label: { show: true, position: 'top' }
    }]
  }
})

// 3. Cumulative Trend Option (SFE Requirement)
const cumulativeTrendOption = computed(() => {
  const months = monthlyIndicators.value.map(m => `${m.month}月`)
  const targetCumulative: number[] = []
  const actualCumulative: number[] = []
  
  let tSum = 0
  let aSum = 0
  
  monthlyIndicators.value.forEach(m => {
    tSum += m.salesATarget || 0
    aSum += m.salesAActual || 0
    targetCumulative.push(tSum)
    actualCumulative.push(aSum)
  })

  // Calculate annual target line (linear projection)
  // Assuming targetCumulative reflects seasonality, if not we could use linear average
  
  return {
    title: { text: '年度累计销售趋势 (YTD Trend)', left: 'center' },
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value', name: '累计金额 (万)' },
    series: [
      {
        name: '累计目标',
        type: 'line',
        data: targetCumulative,
        smooth: true,
        lineStyle: { width: 3, color: '#0071E3' },
        showSymbol: false
      },
      {
        name: '累计达成',
        type: 'line',
        data: actualCumulative,
        smooth: true,
        lineStyle: { width: 3, color: '#FF9500' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(255, 149, 0, 0.3)' }, { offset: 1, color: 'rgba(255, 149, 0, 0)' }]
          }
        },
        markPoint: {
          data: [
            { type: 'max', name: 'Current', label: { formatter: 'YTD: {c}' } }
          ]
        }
      }
    ]
  }
})

// Super Grid Helpers
const getCompletionColor = (actual: number, target: number) => {
  const rate = actual / target
  if (rate >= 1) return 'success'
  if (rate >= 0.8) return 'warning'
  return 'danger'
}

const getInventoryStatus = (salesA: number, salesB: number) => {
  const ratio = salesA / salesB
  if (ratio > 1.2) return { text: '积压', type: 'danger' }
  if (salesB > salesA) return { text: '缺货', type: 'warning' }
  return { text: '正常', type: 'success' }
}

const formatTrend = (growth: number) => {
  return (growth > 0 ? '+' : '') + (growth * 100).toFixed(1) + '%'
}

</script>

<template>
  <div class="indicator-center">
    <!-- UNIFIED DASHBOARD HEADER -->
    <div class="dashboard-header">
      <div class="header-top">
        <div class="title-section">
          <h1>📊 指标管理驾驶舱 (Metrics Center)</h1>
          <p class="subtitle">全域销售指标实时监控 · 2025战略视图</p>
        </div>
        <div class="actions-section">
           <!-- Import Shortcut -->
           <input type="file" ref="fileInput" accept=".xlsx,.xls" style="display: none" @change="onFileSelected">
           <el-button link type="primary" @click="downloadTemplate" style="margin-right: 8px">下载实绩模板</el-button>
           <el-button type="success" plain @click="handleImportShortcut" style="margin-right: 16px">
               📥 导入本月实绩
           </el-button>

           <router-link to="/targets" style="margin-right: 8px">
              <el-button type="primary" plain size="default" class="strategy-btn">
                  🎯 调整战略 (Target Command)
              </el-button>
           </router-link>
            <router-link to="/sales">
              <el-button type="warning" plain size="default">
                  ⚔️ 销售视角 (Sales View)
              </el-button>
           </router-link>


           <div class="scenario-switcher" style="margin-right: 16px">
             <el-radio-group v-model="store.activeScenarioKey" size="default">
               <el-radio-button label="worst">🛡️ 保底</el-radio-button>
               <el-radio-button label="base">⚖️ 基准</el-radio-button>
               <el-radio-button label="best">🚀 冲刺</el-radio-button>
             </el-radio-group>
           </div>

           <div class="divider-v"></div>
           <el-date-picker v-model="filterDate" type="month" placeholder="2025-01" style="width: 120px" />
        </div>
      </div>

      <!-- KEY METRICS ROW (Integrated) -->
      <div class="key-metrics-row">
          <!-- Metric A -->
          <div class="metric-item">
              <div class="m-label">Sales-A 渠道进货达成</div>
              <div class="m-value-row">
                  <span class="m-val">¥{{ (totalActualA / 10000).toFixed(1) }}w</span>
                  <span class="m-sub">目标: {{ (store.currentTarget.salesA / 10000).toFixed(1) }}w</span>
              </div>
              <div class="progress-wrapper">
                  <el-progress 
                    :percentage="performanceA" 
                    :color="isBehindSchedule(performanceA) ? '#F56C6C' : '#67C23A'" 
                    :stroke-width="8" 
                    :show-text="false"
                  />
                  <!-- Time Marker -->
                  <div class="time-marker" :style="{ left: yearProgress + '%' }" title="当前时间进度">
                      <div class="marker-line"></div>
                      <div class="marker-label">Today</div>
                  </div>
              </div>
              <div class="pacing-text" :class="{ 'text-danger': isBehindSchedule(performanceA) }">
                  进度: {{ performanceA }}% | 时间: {{ yearProgress.toFixed(1) }}%
              </div>
          </div>

          <!-- Divider -->
          <div class="metric-divider"></div>

          <!-- Metric B -->
          <div class="metric-item">
              <div class="m-label">Sales-B 纯销达成</div>
              <div class="m-value-row">
                  <span class="m-val" style="color: #0071E3">¥{{ (totalActualB / 10000).toFixed(1) }}w</span>
                  <span class="m-sub">目标: {{ (store.currentTarget.salesB / 10000).toFixed(1) }}w</span>
              </div>
               <div class="progress-wrapper">
                  <el-progress 
                    :percentage="performanceB" 
                    :color="isBehindSchedule(performanceB) ? '#F56C6C' : '#0071E3'" 
                    :stroke-width="8" 
                    :show-text="false"
                  />
                   <!-- Time Marker -->
                  <div class="time-marker" :style="{ left: yearProgress + '%' }" title="当前时间进度">
                      <div class="marker-line"></div>
                  </div>
               </div>
               <div class="pacing-text" :class="{ 'text-danger': isBehindSchedule(performanceB) }">
                  进度: {{ performanceB }}% | 时间: {{ yearProgress.toFixed(1) }}%
              </div>
          </div>
      </div>
    </div>

    <!-- 1. Health Matrix & Gap Analysis -->
    <div class="chart-row-three">
      <div class="chart-card">
        <v-chart class="chart" :option="cumulativeTrendOption" autoresize />
      </div>
      <div class="chart-card">
        <v-chart class="chart" :option="healthMatrixOption" autoresize />
        <div class="chart-desc">
          <span class="dot warning"></span> 积压预警 (A > 1.2*B)<br/>
          <span class="dot success"></span> 供不应求 (B > A)
        </div>
      </div>
      <div class="chart-card">
        <v-chart class="chart" :option="gapWaterfallOption" autoresize />
      </div>
    </div>

    <!-- Super Grid: Advanced Table -->
    <div class="section-card">
      <h2 class="section-title">📊 区域明细 (Super Grid) - 点击展开查看团队实绩</h2>
      <el-table :data="regionAttributes" style="width: 100%" stripe>
        <!-- Drill Down Row -->
        <el-table-column type="expand">
            <template #default="props">
                <div style="padding: 20px; background: #f9f9f9;">
                    <h4>{{ props.row.name }} - 销售团队业绩排名</h4>
                    <el-table :data="getRegionDetails(props.row.name)" size="small" border>
                        <el-table-column prop="name" label="销售经理/代表" width="150" />
                        <el-table-column label="Sales-A 实绩" align="right">
                            <template #default="{ row }">
                                {{ row.salesA }}
                                <span style="color:#999; font-size:12px"> / {{ row.salesATarget }}</span>
                            </template>
                        </el-table-column>
                        <el-table-column label="达成率" width="180">
                            <template #default="{ row }">
                                <el-progress :percentage="Math.min(100, Math.round(row.salesA/(row.salesATarget||1)*100))" />
                            </template>
                        </el-table-column>
                         <el-table-column prop="salesB" label="Sales-B 纯销" align="right" />
                    </el-table>
                </div>
            </template>
        </el-table-column>
        
        <!-- Region/City Info -->
        <el-table-column prop="name" label="城市" width="100" fixed />
        <el-table-column prop="region" label="大区" width="100" />
        
        <!-- Sales-A (In) -->
        <el-table-column label="Sales-A (进货)" align="right">
          <template #default="{ row }">
            <div class="metric-cell">
              <span class="value">{{ row.salesA }}</span>
              <span class="sub-target"> / {{ row.target }}</span>
            </div>
            <el-progress 
              :percentage="Math.min(Math.round(row.salesA/row.target*100), 100)" 
              :status="getCompletionColor(row.salesA, row.target)"
              :stroke-width="4" 
              :show-text="false"
            />
          </template>
        </el-table-column>

        <!-- Sales-B (Out) -->
        <el-table-column label="Sales-B (纯销)" align="right">
          <template #default="{ row }">
             <div class="metric-cell">
              <span class="value">{{ row.salesB }}</span>
            </div>
          </template>
        </el-table-column>

        <!-- Health Indicators -->
        <el-table-column label="健康度诊断" width="180" align="center">
          <template #default="{ row }">
            <div class="health-tags">
              <el-tag :type="getInventoryStatus(row.salesA, row.salesB).type" size="small" effect="dark">
                {{ getInventoryStatus(row.salesA, row.salesB).text }}
              </el-tag>
              <span :class="['trend-text', row.growth > 0 ? 'up' : 'down']">
                 {{ formatTrend(row.growth) }}
              </span>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Monthly Breakdown (Legacy) -->
    <div class="section-card">
      <h2 class="section-title">📅 月度趋势分解</h2>
      <el-table :data="monthlyIndicators" style="width: 100%">
        <el-table-column prop="month" label="月份" width="80" />
        <el-table-column label="Sales-A 达成" align="right">
          <template #default="{ row }">
            {{ row.salesAActual }} / {{ row.salesATarget }}
          </template>
        </el-table-column>
         <el-table-column label="Sales-B 达成" align="right">
          <template #default="{ row }">
            {{ row.salesBActual }} / {{ row.salesBTarget }}
          </template>
        </el-table-column>
        <el-table-column label="A/B 比率" align="center">
           <template #default="{ row }">
            {{ (row.salesAActual / row.salesBActual).toFixed(2) }}
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.indicator-center { padding-bottom: 40px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
.page-title { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
.page-subtitle { color: #86868B; font-size: 14px; margin-top: 4px; }

.chart-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.chart-row-three {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.chart-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  height: 400px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
  position: relative;
}

.chart { height: 320px; }
.chart-desc { position: absolute; bottom: 20px; left: 20px; font-size: 12px; color: #666; }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; margin-left: 8px; }
.dot.warning { background: #FF9500; }
.dot.success { background: #34C759; }

.section-card {
  background: white;
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.04);
}
.section-title { font-size: 18px; font-weight: 600; margin-bottom: 20px; }

/* Super Grid Styles */
.metric-cell {
  display: flex;
  justify-content: flex-end;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 4px;
}
.value { font-weight: 700; font-size: 15px; font-family: monospace; }
.sub-target { font-size: 12px; color: #999; }

.health-tags {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.trend-text { font-size: 13px; font-weight: 600; }
.trend-text.up { color: #34C759; }
.trend-text.down { color: #EF4444; }


/* Unified Header Styles */
.dashboard-header {
    background: white;
    padding: 24px 32px;
    border-radius: 16px;
    margin-bottom: 24px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.02);
    border-bottom: 1px solid #F0F2F5;
}

.header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
.title-section h1 { font-size: 24px; font-weight: 700; color: #1F2937; margin: 0 0 4px 0; }
.subtitle { color: #6B7280; font-size: 13px; }

.actions-section { display: flex; align-items: center; gap: 16px; }
.strategy-btn { border-radius: 8px; font-weight: 500; }
.divider-v { width: 1px; height: 24px; background: #E5E7EB; }

.key-metrics-row { display: flex; align-items: center; gap: 48px; padding-top: 8px; }
.metric-item { flex: 1; min-width: 240px; }
.metric-item .m-label { font-size: 12px; color: #9CA3AF; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }

.m-value-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
.m-val { font-size: 28px; font-weight: 700; color: #374151; font-family: 'Inter', sans-serif; letter-spacing: -1px; }
.m-sub { font-size: 12px; color: #6B7280; font-weight: 500; }

.metric-divider { width: 1px; height: 40px; background: #E5E7EB; }
</style>
