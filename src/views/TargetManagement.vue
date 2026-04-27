<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMedicalSalesStore } from '@/stores/medicalSales'
import { useMedicalTargetStore } from '@/stores/medicalSales/target'
import { ElMessage } from 'element-plus'
import * as XLSX from 'xlsx'
import { generateTemplate, parseCityStatsExcel } from '@/utils/import'

// Use target store directly for reactive state
const targetStore = useMedicalTargetStore()
const store = useMedicalSalesStore()

// Current year
const currentYear = new Date().getFullYear()

// State (Wrapper for Wan Unit) - Direct binding to targetStore
const inputGlobalA = computed({
    get: () => targetStore.globalTarget.salesA / 10000,
    set: (val) => {
        targetStore.setGlobalTarget(val * 10000, targetStore.globalTarget.salesB)
    }
})

const inputGlobalB = computed({
    get: () => targetStore.globalTarget.salesB / 10000,
    set: (val) => {
        targetStore.setGlobalTarget(targetStore.globalTarget.salesA, val * 10000)
    }
})

const allocationStrategy = ref<'manual' | 'gdp' | 'growth'>('manual')

// Sync Global
const updateGlobal = () => {
    ElMessage.success('公司总目标已更新 (单位: 万元)')
}

// Compute Table Data
const tableData = computed(() => {
    let totalPotential = 0
    const marketMap = store.regionMarketStats
    
    store.regions.forEach(r => {
        const m = marketMap[r.id] || { totalGdp: 0, population: 0 }
        totalPotential += m.totalGdp
    })

    return store.regions.map(r => {
        const market = marketMap[r.id] || { totalGdp: 0, population: 0, gdpPerCapita: 0 }
        const weight = totalPotential ? (market.totalGdp / totalPotential) : 0
        
        // Dynamic allocation based on current global target
        const allocatedA = Math.round((targetStore.globalTarget.salesA * weight) / 10000)
        const allocatedB = Math.round((targetStore.globalTarget.salesB * weight) / 10000)

        return {
            id: r.id,
            name: r.name,
            code: r.code,
            cities: store.cities.filter(c => c.regionId === r.id).map(c => c.name),
            // Dynamic reference: what this region should get based on current total target
            dynamicA: allocatedA,
            dynamicB: allocatedB,
            gdp: market.totalGdp,
            pop: market.population,
            perCapita: market.gdpPerCapita,
            weight: (weight * 100).toFixed(1) + '%',
            currentA: (targetStore.regionTargets[r.id]?.salesA || 0) / 10000,
            currentB: (targetStore.regionTargets[r.id]?.salesB || 0) / 10000,
            suggestedA: allocatedA,
            suggestedB: allocatedB
        }
    })
})

// Auto-fill all regions based on GDP weight
const autoFillTargets = () => {
    tableData.value.forEach(row => {
        targetStore.setRegionTarget(row.id, row.suggestedA * 10000, row.suggestedB * 10000)
    })
    ElMessage.success('已按GDP权重自动分配目标到所有大区')
}

// Reset all region targets
const resetTargets = () => {
    store.regions.forEach(r => {
        targetStore.setRegionTarget(r.id, 0, 0)
    })
    ElMessage.success('已重置所有大区目标')
}

const unallocated = computed(() => targetStore.getUnallocatedTarget)

// Actions
const fileInput = ref<HTMLInputElement | null>(null)

const downloadTemplate = () => {
    generateTemplate('cityStats')
    ElMessage.success('已下载城市因子模板，请填入最新GDP数据后上传')
}

const triggerImport = () => {
    fileInput.value?.click()
}

const exportCurrentTargets = () => {
    const data = Object.entries(targetStore.regionTargets).map(([regionId, target]) => ({
        regionId,
        salesA: (target.salesA / 10000).toFixed(2),
        salesB: (target.salesB / 10000).toFixed(2)
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'RegionTargets')
    XLSX.writeFile(wb, 'region_targets.xlsx')
    ElMessage.success('已导出当前目标 (Excel)')
}

const openAIAssistant = () => {
    ElMessage.info('AI 助手功能即将上线，敬请期待！')
}

const handleImportFactors = async (event: Event) => {
    const target = event.target as HTMLInputElement
    if (!target.files?.length) return

    try {
        const file = target.files[0]
        const stats = await parseCityStatsExcel(file)
        
        const updateMap: Record<string, { gdp: number, pop: number, name: string }> = {}
        let matchCount = 0
        
        stats.forEach((s: { cityName: string; gdp: number; pop: number }) => {
            const city = store.cities.find(c => c.name === s.cityName)
            if (city) {
                updateMap[city.id] = { name: s.cityName, gdp: s.gdp, pop: s.pop }
                matchCount++
            }
        })
        
        targetStore.importCityStats(updateMap)
        ElMessage.success(`成功更新 ${matchCount} 个城市的经济因子数据！`)
        
    } catch (e: any) {
        ElMessage.error('导入失败: ' + e.message)
    } finally {
        target.value = ''
    }
}

const updateRegionTarget = (row: { id: string; currentA: number; currentB: number }) => {
    targetStore.setRegionTarget(row.id, row.currentA * 10000, row.currentB * 10000)
}

// Legacy: auto-fill using GDP weights
const _applyStrategy = () => {
    autoFillTargets()
}
void _applyStrategy

const getStatusColor = (val: number) => {
    if (val === 0) return 'success'
    return val > 0 ? 'warning' : 'exception'
}
</script>

<template>
  <div class="target-management-v2">
    <!-- Command Deck -->
    <div class="command-deck">
      <div class="deck-header">
        <div class="title-block">
          <h1>🎯 {{ currentYear }} 战略指挥中心</h1>
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

      <!-- Strategy Grid -->
      <div class="strategy-grid">
        <div class="strategy-section">
          <span class="section-label">分配策略引擎</span>
          <el-radio-group v-model="allocationStrategy" size="default">
            <el-radio-button label="manual">🖐 手工微调</el-radio-button>
            <el-radio-button label="gdp">📊 按GDP潜力加权 (推荐)</el-radio-button>
          </el-radio-group>
          <div class="auto-actions">
            <el-button type="primary" class="apply-btn" @click="autoFillTargets">
              ⚡ 自动分配目标
            </el-button>
            <el-button type="warning" plain size="small" @click="resetTargets">
              🔄 重置
            </el-button>
          </div>
        </div>

        <div class="multiplier-section">
          <div class="multiplier-item">
            <span class="mul-label">🛡️ 保底倍率</span>
            <el-input-number v-model="targetStore.scenarios.worstMultiplier" :step="0.05" :min="0.5" :max="1.5" size="small" />
          </div>
          <div class="multiplier-item">
            <span class="mul-label">🚀 冲刺倍率</span>
            <el-input-number v-model="targetStore.scenarios.bestMultiplier" :step="0.05" :min="0.8" :max="2.0" size="small" />
          </div>
        </div>

        <div class="balance-section">
          <span class="section-label">待分余额</span>
          <div class="balance-tags">
            <el-tag :type="getStatusColor(unallocated.salesA)" effect="dark" size="large">
              A: {{ (unallocated.salesA / 10000).toFixed(1) }}万
            </el-tag>
            <el-tag :type="getStatusColor(unallocated.salesB)" effect="dark" size="large">
              B: {{ (unallocated.salesB / 10000).toFixed(1) }}万
            </el-tag>
          </div>
        </div>

        <div class="action-section">
          <span class="section-label">数据操作</span>
          <div class="action-buttons">
            <input type="file" ref="fileInput" accept=".xlsx,.xls" style="display: none" @change="handleImportFactors">
            <el-button link type="primary" @click="downloadTemplate">下载因子模板</el-button>
            <el-button size="small" @click="triggerImport">⚙️ 更新城市GDP数据</el-button>
            <el-button type="success" size="small" @click="exportCurrentTargets">导出当前目标</el-button>
            <el-button type="info" size="small" @click="openAIAssistant">AI 助手</el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- Decomposition Table -->
    <div class="main-table-container">
      <el-table :data="tableData" style="width: 100%" row-key="id" border stripe>
        <el-table-column label="战略大区" width="140" fixed>
          <template #default="{ row }">
            <div class="region-name">{{ row.name }}</div>
            <div class="region-code">{{ row.code.toUpperCase() }}</div>
            <div class="region-cities">
              <el-tag v-for="city in row.cities.slice(0, 3)" :key="city" size="small" effect="plain" class="city-tag">
                {{ city }}
              </el-tag>
              <el-tag v-if="row.cities.length > 3" size="small" effect="plain">+{{ row.cities.length - 3 }}</el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="城市群经济因子 (2024)" width="280">
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

        <el-table-column label="动态分配参考" width="160" align="right">
          <template #default="{ row }">
            <div class="hist-val">A: {{ row.dynamicA }}万</div>
            <div class="hist-val sub">B: {{ row.dynamicB }}万</div>
            <div class="hist-val hint">按{{ row.weight }}分配</div>
          </template>
        </el-table-column>

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
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05);
}

.deck-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: flex-start; 
  margin-bottom: 24px; 
}

.title-block h1 { margin: 0; font-size: 22px; color: #1F2937; font-weight: 700; }
.subtitle { color: #6B7280; font-size: 13px; margin-top: 4px; }

.global-kpi { display: flex; gap: 40px; }
.kpi-item .label { font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; margin-bottom: 8px; }
.huge-input { width: 220px; }

/* Strategy Grid */
.strategy-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr 0.8fr 1fr;
  gap: 24px;
  padding-top: 20px;
  border-top: 1px solid #E5E7EB;
  align-items: start;
}

.strategy-section,
.multiplier-section,
.balance-section,
.action-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-label {
  font-size: 11px;
  font-weight: 700;
  color: #9CA3AF;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.apply-btn { font-weight: 600; letter-spacing: 0.5px; }

.auto-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.multiplier-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mul-label {
  font-size: 12px;
  color: #4B5563;
  font-weight: 500;
  min-width: 70px;
}

.balance-tags {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Main Table */
.main-table-container {
  background: white;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.03);
}

.region-name { font-weight: 700; color: #111827; font-size: 15px; }
.region-code { font-size: 12px; color: #9CA3AF; margin-top: 2px; }

.region-cities {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.city-tag {
  font-size: 11px;
}

.factor-grid { display: flex; gap: 12px; flex-wrap: wrap; }
.factor-item { 
  background: #F3F4F6; padding: 6px 10px; border-radius: 8px; 
  display: flex; flex-direction: column; align-items: flex-start;
}
.factor-item span { font-size: 10px; color: #6B7280; }
.factor-item strong { font-size: 12px; color: #374151; }
.factor-item.weight { background: #EEF2FF; border: 1px solid #C7D2FE; }
.factor-item.weight strong { color: #4F46E5; }

.hist-val { font-family: 'JetBrains Mono', monospace; font-weight: 500; color: #374151; }
.hist-val.sub { color: #6B7280; font-size: 12px; margin-top: 2px; }

.col-header-a { color: #D97706; font-weight: 700; }
.col-header-b { color: #2563EB; font-weight: 700; }

.target-input-group { position: relative; }
.suggestion { 
  position: absolute; right: 0; top: -18px; 
  font-size: 11px; color: #059669; font-weight: 600;
}

@media (max-width: 1400px) {
  .strategy-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 900px) {
  .strategy-grid {
    grid-template-columns: 1fr;
  }
  .deck-header {
    flex-direction: column;
    gap: 16px;
  }
}
</style>
