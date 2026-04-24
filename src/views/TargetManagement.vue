<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMedicalSalesStore } from '@/stores/medicalSales'
import { ElMessage, ElMessageBox } from 'element-plus'

const store = useMedicalSalesStore()

// State (Wrapper for Wan Unit)
const inputGlobalA = computed({
    get: () => store.globalTarget.salesA / 10000,
    set: (val) => store.setGlobalTarget(val * 10000, store.globalTarget.salesB)
})

const inputGlobalB = computed({
    get: () => store.globalTarget.salesB / 10000,
    set: (val) => store.setGlobalTarget(store.globalTarget.salesA, val * 10000)
})

const allocationStrategy = ref<'manual' | 'gdp' | 'growth'>('manual')

// Sync Global (Deprecated manual sync, now computed handles it, but keep for message)
const updateGlobal = () => {
    ElMessage.success('公司总是已更新 (单位: 万元)')
}


import * as XLSX from 'xlsx'

const handleExportTemplate = () => {
    ElMessage.success('正在生成目标分配书...')
    
    // 1. Prepare Data
    const exportData = tableData.value.map(row => ({
        '大区名称': row.name,
        '大区代码': row.code.toUpperCase(),
        '决策因子_GDP(亿)': row.gdp,
        '决策因子_人口(千万)': row.pop,
        '去年实绩_进货(万)': (row.lastYearA / 10000).toFixed(2),
        '去年实绩_纯销(万)': (row.lastYearB / 10000).toFixed(2),
        '2025目标_进货(万)': (row.currentA).toFixed(2),
        '2025目标_纯销(万)': (row.currentB).toFixed(2),
        '分配权重': row.weight
    }))

    // 2. Create Sheet
    const ws = XLSX.utils.json_to_sheet(exportData)
    
    // 3. Set Column Widths (Optional polish)
    ws['!cols'] = [
        { wch: 10 }, { wch: 10 }, 
        { wch: 15 }, { wch: 15 },
        { wch: 15 }, { wch: 15 },
        { wch: 15 }, { wch: 15 },
        { wch: 10 }
    ]

    // 4. Create Workbook and Download
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "2025目标拆解表")
    XLSX.writeFile(wb, "2025年度销售目标分配书.xlsx")
}
// Compute Table Data
const tableData = computed(() => {
    // Total Potential (Aggregate of all regions)
    let totalPotential = 0
    // Access computed value via .value or simple access if it was ref, but here it's computed in store
    const marketMap = store.regionMarketStats // It's a reactive object in Pinia
    
    store.regions.forEach(r => {
        const m = marketMap[r.id] || { totalGdp: 0, population: 0 }
        // Potential = Total GDP of the region (Simple & Strong correlation)
        totalPotential += m.totalGdp
    })

    return store.regions.map(r => {
        const stats = store.regionStats.find(s => s.regionId === r.id)
        const market = marketMap[r.id] || { totalGdp: 0, population: 0, gdpPerCapita: 0 }
        
        // Weight based on Region's Share of Total Mock GDP
        const weight = totalPotential ? (market.totalGdp / totalPotential) : 0
        const suggestedA = Math.round(store.globalTarget.salesA * weight)
        const suggestedB = Math.round(store.globalTarget.salesB * weight)

        return {
            id: r.id,
            name: r.name,
            code: r.code,
            // Last Year
            lastYearA: stats ? stats.totalAmount : 0,
            lastYearB: stats ? (stats.totalAmount * 0.8) : 0, 
            // Market Factors (City Aggregated)
            gdp: market.totalGdp, // Billions
            pop: market.population, // Millions
            perCapita: market.gdpPerCapita,
            weight: (weight * 100).toFixed(1) + '%',
            // Current Target (Converted to Wan)
            currentA: (store.regionTargets[r.id]?.salesA || 0) / 10000,
            currentB: (store.regionTargets[r.id]?.salesB || 0) / 10000,
            // Suggestions (Converted to Wan)
            suggestedA: Math.round(suggestedA / 10000),
            suggestedB: Math.round(suggestedB / 10000)
        }
    })
})

const unallocated = computed(() => store.getUnallocatedTarget)

// Actions
const fileInput = ref<HTMLInputElement | null>(null)

import { generateTemplate, parseCityStatsExcel } from '@/utils/import'

const downloadTemplate = () => {
    generateTemplate('cityStats')
    ElMessage.success('已下载城市因子模板，请填入最新GDP数据后上传')
}

const triggerImport = () => {
    fileInput.value?.click()
}

// Export current region targets as Excel (placeholder implementation)
const exportCurrentTargets = () => {
    const data = Object.entries(store.regionTargets).map(([regionId, target]) => ({
        regionId,
        salesA: (target.salesA / 10000).toFixed(2), // 万元
        salesB: (target.salesB / 10000).toFixed(2)
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'RegionTargets')
    XLSX.writeFile(wb, 'region_targets.xlsx')
    ElMessage.success('已导出当前目标 (Excel)')
}

// AI 助手入口（暂时弹出提示）
const openAIAssistant = () => {
    ElMessage.info('AI 助手功能即将上线，敬请期待！')
}

const handleImportFactors = async (event: Event) => {
    const target = event.target as HTMLInputElement
    if (!target.files?.length) return

    try {
        const file = target.files[0]
        const stats = await parseCityStatsExcel(file)
        
        // Convert array to Record<id, stat>
        // We need to match City Name -> City ID
        // Strategy: Iterate store.cities. If name matches, update data.
        const updateMap: Record<string, { gdp: number, pop: number, name: string }> = {}
        let matchCount = 0
        
        stats.forEach(s => {
            const city = store.cities.find(c => c.name === s.cityName)
            if (city) {
                updateMap[city.id] = { name: s.cityName, gdp: s.gdp, pop: s.pop }
                matchCount++
            }
        })
        
        store.importCityStats(updateMap)
        ElMessage.success(`成功更新 ${matchCount} 个城市的经济因子数据！`)
        
    } catch (e: any) {
        ElMessage.error('导入失败: ' + e.message)
    } finally {
        target.value = '' // Reset
    }
}

const updateRegionTarget = (row: any) => {
    // Convert Wan back to Raw for store
    store.setRegionTarget(row.id, row.currentA * 10000, row.currentB * 10000)
}

const applyStrategy = () => {
    if (allocationStrategy.value === 'manual') return

    ElMessageBox.confirm(
        `确定要根据“${allocationStrategy.value === 'gdp' ? '区域GDP潜力权重' : '历史增长率'}”自动覆盖当前分配吗？`,
        '智能分配确认',
        { confirmButtonText: '执行分配', cancelButtonText: '取消', type: 'warning' }
    ).then(() => {
        tableData.value.forEach(row => {
            // Apply suggestion (Convert Wan to Raw)
            store.setRegionTarget(row.id, row.suggestedA * 10000, row.suggestedB * 10000)
        })
        ElMessage.success('智能分配已完成！已根据各区经济潜力自动加权。')
    })
}

const getStatusColor = (val: number) => {
    if (val === 0) return 'success'
    return val > 0 ? 'warning' : 'exception'
}

</script>

<template>
  <div class="target-management-v2">
    <!-- 1. Global Command Deck -->
    <div class="command-deck">
        <div class="deck-header">
            <div class="title-block">
                <h1>🎯 2025 战略指挥中心</h1>
                <div class="subtitle">Strategic Target Decomposition System</div>
            </div>
            <div class="global-kpi">
                <div class="kpi-item">
                    <div class="label">Sales-A 渠道进货总盘 (万元)</div>
                    <el-input-number v-model="inputGlobalA" :step="100" size="large" @change="updateGlobal" class="huge-input"/>
                </div>
                <div class="kpi-item blue">
                    <div class="label">Sales-B 纯销总盘 (万元)</div>
                    <el-input-number v-model="inputGlobalB" :step="100" size="large" @change="updateGlobal" class="huge-input"/>
                </div>
            </div>
        </div>

        <div class="strategy-bar">
            <span class="bar-label">分配策略引擎：</span>
            <el-radio-group v-model="allocationStrategy" size="default">
                <el-radio-button label="manual">🖐 手工微调</el-radio-button>
                <el-radio-button label="gdp">📊 按GDP潜力加权 (推荐)</el-radio-button>
                <el-radio-button label="growth" disabled>📈 按历史增速 (开发中)</el-radio-button>
            </el-radio-group>
            
            <el-button 
                v-if="allocationStrategy !== 'manual'" 
                type="primary" 
                class="apply-btn"
                @click="applyStrategy"
            >
                ⚡ 一键应用智能分配
            </el-button>
            <!-- Scenario Multipliers -->
            <div class="scenario-multipliers" style="margin-top: 12px; display: flex; gap: 12px; align-items: center;">
              <span>保底倍率 (🛡️):</span>
              <el-input-number v-model="store.scenarios.worstMultiplier" :step="0.05" :min="0.5" :max="1.5" size="small" />
              <span>冲刺倍率 (🚀):</span>
              <el-input-number v-model="store.scenarios.bestMultiplier" :step="0.05" :min="0.8" :max="2.0" size="small" />
            </div>

            <div class="remaining-alert">
                <span>待分余额：</span>
                <el-tag :type="getStatusColor(unallocated.salesA)" effect="dark">
                    A: {{ (unallocated.salesA / 10000).toFixed(1) }}万
                </el-tag>
            </div>
            
            <div style="flex: 1"></div> <!-- Spacer -->

            <!-- Data Factor Actions -->
            <div class="factor-actions">
                 <input type="file" ref="fileInput" accept=".xlsx,.xls" style="display: none" @change="handleImportFactors">
                 <el-button link type="primary" @click="downloadTemplate">下载因子模板</el-button>
                 <el-button size="small" @click="triggerImport">⚙️ 更新城市GDP数据</el-button>
                 <el-button type="success" size="small" @click="exportCurrentTargets" style="margin-left: 8px">导出当前目标</el-button>
                 <el-button type="info" size="small" @click="openAIAssistant">AI 助手</el-button>
            </div>
        </div>
    </div>

    <!-- 2. Strategic Decomposition Table -->
    <div class="main-table-container">
        <el-table :data="tableData" style="width: 100%" row-key="id" border stripe>
            <!-- Region Info -->
            <el-table-column label="战略大区" width="120" fixed>
                <template #default="{ row }">
                    <div class="region-name">{{ row.name }}</div>
                    <div class="region-code">{{ row.code.toUpperCase() }}</div>
                </template>
            </el-table-column>

            <!-- Economic Factors (Reference) -->
            <el-table-column label="城市群总量指标 (2024)" width="300">
                <template #default="{ row }">
                    <div class="factor-grid">
                        <div class="factor-item">
                            <span>区域总GDP</span>
                            <strong>¥{{row.gdp}}亿</strong>
                        </div>
                        <div class="factor-item">
                            <span>覆盖人口</span>
                            <strong>{{row.pop.toFixed(1)}}kw</strong>
                        </div>
                         <div class="factor-item">
                            <span>人均GDP</span>
                            <strong>¥{{(row.perCapita/10000).toFixed(1)}}w</strong>
                        </div>
                        <div class="factor-item weight">
                            <span>GDP权重</span>
                            <strong>{{row.weight}}</strong>
                        </div>
                    </div>
                </template>
            </el-table-column>

            <!-- Last Year (Historical) -->
            <el-table-column label="去年实绩 (参考)" width="180" align="right">
                <template #default="{ row }">
                    <div class="hist-val">A: {{ (row.lastYearA / 10000).toFixed(1) }}万</div>
                    <div class="hist-val sub">B: {{ (row.lastYearB / 10000).toFixed(1) }}万</div>
                </template>
            </el-table-column>

            <!-- Sales-A Allocation -->
            <el-table-column label="Sales-A 进货目标 (万)" min-width="200" class-name="target-col-a">
                <template #header>
                    <span class="col-header-a">Sales-A 进货目标</span>
                </template>
                <template #default="{ row }">
                    <div class="target-input-group">
                        <el-input-number 
                            v-model="row.currentA" 
                            :step="100" 
                            size="default" 
                            style="width: 100%"
                            @change="updateRegionTarget(row)"
                        />
                        <div v-if="allocationStrategy !== 'manual'" class="suggestion">
                            建议: {{ row.suggestedA }}
                        </div>
                    </div>
                </template>
            </el-table-column>

            <!-- Sales-B Allocation -->
            <el-table-column label="Sales-B 纯销目标 (万)" min-width="200" class-name="target-col-b">
                 <template #header>
                    <span class="col-header-b">Sales-B 纯销目标</span>
                </template>
                <template #default="{ row }">
                    <div class="target-input-group">
                        <el-input-number 
                            v-model="row.currentB" 
                            :step="100" 
                            size="default" 
                            style="width: 100%"
                            @change="updateRegionTarget(row)"
                        />
                        <div v-if="allocationStrategy !== 'manual'" class="suggestion">
                            建议: {{ row.suggestedB }}
                        </div>
                    </div>
                </template>
            </el-table-column>
        </el-table>
    </div>
  </div>
</template>

<style scoped>
.target-management-v2 { padding: 20px; background: #F5F7FA; min-height: 100vh; }

/* Command Deck */
.command-deck {
    background: white;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
}
.deck-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
.title-block h1 { margin: 0; font-size: 24px; color: #1F2937; }
.subtitle { color: #6B7280; font-size: 13px; margin-top: 4px; }

.global-kpi { display: flex; gap: 40px; }
.kpi-item .label { font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; margin-bottom: 8px; }
.huge-input { width: 220px; }

.strategy-bar { 
    display: flex; align-items: center; gap: 16px; 
    padding-top: 20px; border-top: 1px solid #E5E7EB; 
}
.bar-label { font-size: 14px; font-weight: 500; color: #374151; }
.remaining-alert { margin-left: auto; display: flex; align-items: center; gap: 12px; font-size: 14px; font-weight: 500; }

.apply-btn { font-weight: 600; letter-spacing: 0.5px; }

/* Main Table */
.main-table-container {
    background: white;
    border-radius: 12px;
    padding: 12px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.03);
}

.region-name { font-weight: 700; color: #111827; font-size: 15px; }
.region-code { font-size: 12px; color: #9CA3AF; margin-top: 2px; }

.factor-grid { display: flex; gap: 12px; flex-wrap: wrap; }
.factor-item { 
    background: #F3F4F6; padding: 4px 8px; border-radius: 6px; 
    display: flex; flex-direction: column; align-items: flex-start;
}
.factor-item span { font-size: 10px; color: #6B7280; }
.factor-item strong { font-size: 12px; color: #374151; }
.factor-item.weight { background: #EEF2FF; border: 1px solid #C7D2FE; }
.factor-item.weight strong { color: #4F46E5; }

.hist-val { font-family: monospace; font-weight: 500; color: #374151; }
.hist-val.sub { color: #6B7280; font-size: 12px; margin-top: 2px; }

.col-header-a { color: #D97706; font-weight: 700; }
.col-header-b { color: #2563EB; font-weight: 700; }

.target-input-group { position: relative; }
.suggestion { 
    position: absolute; right: 0; top: -18px; 
    font-size: 11px; color: #059669; font-weight: 600;
}
</style>
