<script setup lang="ts">
import { ref, computed } from 'vue'
import type { HeadcountPlan, SalespersonEnhanced } from '@/types/sales'

import { useMedicalSalesStore } from '@/stores/medicalSales'

const store = useMedicalSalesStore()

// Real Data from Store
const headcountPlans = computed(() => store.headcountPlans)

// For salespeople, we need to map them to enhanced view or use store's salespeople
// The store has proper Salesperson type, but the view expects SalespersonEnhanced.
// We can try to cast or map. The store might not have full enhanced data populated if just imported as base Salesperson.
// But we updated the import to include extra fields. Let's assume they are there as extra props.
const salespeople = computed(() => store.salespeople as unknown as SalespersonEnhanced[])

const selectedYear = ref(2024)

// Computed
const totalStats = computed(() => {
  return headcountPlans.value.reduce((acc, curr) => ({
    planned: acc.planned + curr.plannedCount,
    actual: acc.actual + curr.actualCount,
    recruiting: acc.recruiting + curr.recruitingCount,
    bonus: acc.bonus + curr.bonusPool
  }), { planned: 0, actual: 0, recruiting: 0, bonus: 0 })
})

const completionRate = computed(() => {
  return totalStats.value.planned ? Math.round(totalStats.value.actual / totalStats.value.planned * 100) : 0
})

const getStatusColor = (status: string) => {
  switch (status) {
    case 'onboarded': return 'success'
    case 'recruiting': return 'warning'
    case 'resigned': return 'danger'
    default: return 'info'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'onboarded': return '已到岗'
    case 'recruiting': return '招聘中'
    case 'resigned': return '离职'
    default: return '计划中'
  }
}

</script>

<template>
  <div class="headcount-center">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">人员配置规划</h1>
        <p class="page-subtitle">区域编制管理与到岗率追踪 · {{ selectedYear }}</p>
      </div>
      <div class="header-actions">
        <el-button type="primary">+ 新增编制需求</el-button>
      </div>
    </div>

    <!-- Overview Cards -->
    <div class="overview-grid">
      <div class="stat-card">
        <div class="stat-label">总计划编制</div>
        <div class="stat-value">{{ totalStats.planned }} <span class="unit">人</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">实际在岗</div>
        <div class="stat-value highlight">{{ totalStats.actual }} <span class="unit">人</span></div>
        <div class="stat-sub">到岗率 {{ completionRate }}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">招聘缺口</div>
        <div class="stat-value warning">{{ totalStats.recruiting }} <span class="unit">人</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">年度奖金池</div>
        <div class="stat-value">¥{{ totalStats.bonus }} <span class="unit">万</span></div>
      </div>
    </div>

    <!-- Region Breakdown -->
    <div class="section">
      <h2 class="section-title">🗺️ 区域编制详情</h2>
      <el-table :data="headcountPlans" style="width: 100%">
        <el-table-column prop="regionName" label="大区" width="120" />
        <el-table-column prop="plannedCount" label="计划编制" align="center" />
        <el-table-column prop="actualCount" label="实际到岗" align="center">
          <template #default="{ row }">
            <span class="actual-val">{{ row.actualCount }}</span>
          </template>
        </el-table-column>
        <el-table-column label="到岗率" align="center">
          <template #default="{ row }">
            <el-progress 
              :percentage="Math.round(row.actualCount/row.plannedCount*100)" 
              :status="row.actualCount >= row.plannedCount ? 'success' : 'warning'"
            />
          </template>
        </el-table-column>
        <el-table-column prop="recruitingCount" label="招聘中" align="center">
          <template #default="{ row }">
            <span v-if="row.recruitingCount > 0" class="recruiting-tag">{{ row.recruitingCount }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="bonusPool" label="奖金池 (万)" align="right" />
        <el-table-column label="操作" width="100" align="center">
          <template #default>
            <el-button link type="primary" size="small">调整</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Staff List -->
    <div class="section">
      <h2 class="section-title">👥 人员状态追踪</h2>
      <el-table :data="salespeople" style="width: 100%">
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="regionName" label="大区" width="100" />
        <el-table-column prop="cityName" label="城市" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusColor(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="hireDate" label="入职日期" width="140" />
        <el-table-column label="月度目标 (万)" align="right">
          <template #default="{ row }">
            <div>Sales-A: {{ row.salesATarget }}</div>
            <div class="sub-text">Sales-B: {{ row.salesBTarget }}</div>
          </template>
        </el-table-column>
        <el-table-column label="达成追踪" min-width="200">
          <template #default="{ row }">
            <div v-if="row.status === 'onboarded'">
              <el-progress 
                :percentage="Math.min(Math.round(row.salesAActual/row.salesATarget*100), 100)" 
                stroke-width="6"
                style="margin-bottom: 4px"
              >
                <template #default>
                  <span class="prog-text">A: {{ row.salesAActual }}/{{ row.salesATarget }}</span>
                </template>
              </el-progress>
              <el-progress 
                :percentage="Math.min(Math.round(row.salesBActual/row.salesBTarget*100), 100)" 
                status="success" 
                stroke-width="6"
              >
                <template #default>
                  <span class="prog-text">B: {{ row.salesBActual }}/{{ row.salesBTarget }}</span>
                </template>
              </el-progress>
            </div>
            <span v-else class="sub-text">--</span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.headcount-center { padding-bottom: 40px; }

.page-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin-bottom: 32px; 
}
.page-title { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
.page-subtitle { color: #86868B; font-size: 14px; margin-top: 4px; }

/* Overview Grid */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
  display: flex;
  flex-direction: column;
}

.stat-label { color: #86868B; font-size: 14px; margin-bottom: 8px; }
.stat-value { font-size: 28px; font-weight: 700; color: #1D1D1F; }
.stat-value.highlight { color: #0071E3; }
.stat-value.warning { color: #FF9500; }
.unit { font-size: 14px; color: #86868B; font-weight: normal; margin-left: 4px; }
.stat-sub { font-size: 12px; color: #34C759; margin-top: 4px; }

/* Section */
.section {
  background: white;
  border-radius: 20px;
  padding: 28px;
  margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.04);
}

.section-title { font-size: 18px; font-weight: 600; margin-bottom: 20px; }

.actual-val { font-weight: 700; font-size: 16px; }

.recruiting-tag {
  background: #FFF4E5;
  color: #B25000;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

.sub-text { font-size: 12px; color: #86868B; }

.prog-text { font-size: 11px; margin-left: 8px; }

</style>
