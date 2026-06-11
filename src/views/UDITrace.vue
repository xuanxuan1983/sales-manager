<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useUDITraceStore } from '@/stores/udiTrace'

const store = useUDITraceStore()

// 搜索
const searchQuery = ref('')
const searchType = ref<'udi' | 'batch'>('udi')

// 追溯结果
const traceResult = ref<ReturnType<typeof store.getTraceByUDI>>([])
const searched = ref(false)

const handleSearch = () => {
  if (!searchQuery.value.trim()) {
    ElMessage.warning('请输入查询内容')
    return
  }

  searched.value = true

  if (searchType.value === 'udi') {
    traceResult.value = store.getTraceByUDI(searchQuery.value.trim())
  } else {
    traceResult.value = store.getTraceByBatch(searchQuery.value.trim())
  }

  if (traceResult.value.length === 0) {
    ElMessage.info('未找到追溯记录')
  }
}

// 效期预警
const alerts = computed(() => store.expiryAlerts)
const stats = computed(() => store.alertStats)

const getAlertColor = (level: string) => {
  const map: Record<string, string> = {
    critical: '#EF4444',
    warning: '#FF9500',
    notice: '#0071E3'
  }
  return map[level] || '#6B7280'
}

const getAlertLabel = (level: string) => {
  const map: Record<string, string> = {
    critical: '紧急',
    warning: '预警',
    notice: '提醒'
  }
  return map[level] || level
}

const getDaysLabel = (days: number) => {
  if (days < 0) return `已过期 ${Math.abs(days)} 天`
  if (days === 0) return '今天过期'
  return `剩余 ${days} 天`
}

// 批次列表（用于展示在库情况）
const batches = computed(() => store.batches)

const getStatusTag = (status: string) => {
  const map: Record<string, { type: 'success' | 'warning' | 'danger' | 'info', label: string }> = {
    in_stock: { type: 'success', label: '在库' },
    shipping: { type: 'warning', label: '出库中' },
    sold_out: { type: 'info', label: '售罄' },
    expired: { type: 'danger', label: '过期' },
    recalled: { type: 'danger', label: '召回' }
  }
  return map[status] || { type: 'info', label: status }
}

// 活跃标签页
const activeTab = ref<'trace' | 'alert' | 'batch'>('alert')
</script>

<template>
  <div class="udi-trace">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1>🔍 UDI 追溯查询</h1>
        <p class="subtitle">全链路追踪 · 效期预警 · 批次管理</p>
      </div>
      <div class="header-actions">
        <el-button type="danger" plain @click="$router.push('/udi/adverse')">
          ⚠️ 不良事件
        </el-button>
        <el-button type="primary" @click="$router.push('/udi/inbound')">
          📦 扫码入库
        </el-button>
      </div>
    </div>

    <!-- 预警看板（置顶） -->
    <div class="alert-dashboard">
      <div class="alert-card critical" v-if="stats.critical > 0">
        <div class="alert-icon">🚨</div>
        <div class="alert-count">{{ stats.critical }}</div>
        <div class="alert-label">紧急预警</div>
        <div class="alert-desc">已过期或3个月内到期</div>
      </div>
      <div class="alert-card warning" v-if="stats.warning > 0">
        <div class="alert-icon">⚠️</div>
        <div class="alert-count">{{ stats.warning }}</div>
        <div class="alert-label">到期预警</div>
        <div class="alert-desc">6个月内到期</div>
      </div>
      <div class="alert-card safe" v-if="stats.total === 0">
        <div class="alert-icon">✅</div>
        <div class="alert-count">0</div>
        <div class="alert-label">状态正常</div>
        <div class="alert-desc">暂无效期预警</div>
      </div>
      <div class="alert-card summary">
        <div class="alert-icon">📊</div>
        <div class="alert-count">{{ batches.length }}</div>
        <div class="alert-label">在库批次</div>
        <div class="alert-desc">总库存 {{ batches.reduce((s, b) => s + b.remaining, 0) }} 支</div>
      </div>
    </div>

    <!-- 标签页 -->
    <div class="tabs-section">
      <div class="tabs-header">
        <button
          v-for="tab in ([{key: 'alert' as const, label: '效期预警'}, {key: 'trace' as const, label: '追溯查询'}, {key: 'batch' as const, label: '批次管理'}])"
          :key="tab.key"
          class="tab-btn"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- 效期预警 -->
      <div v-show="activeTab === 'alert'" class="tab-content">
        <div v-if="alerts.length === 0" class="empty-state">
          <div class="empty-icon">✅</div>
          <p>所有批次效期正常，无需处理</p>
        </div>

        <div v-else class="alert-list">
          <div
            v-for="alert in alerts"
            :key="alert.id"
            class="alert-item"
            :class="alert.alertLevel"
          >
            <div class="alert-left">
              <div class="alert-level-badge" :style="{ background: getAlertColor(alert.alertLevel) }">
                {{ getAlertLabel(alert.alertLevel) }}
              </div>
              <div class="alert-info">
                <div class="alert-title">{{ alert.productName }}</div>
                <div class="alert-batch">批号: {{ alert.batchNo }}</div>
              </div>
            </div>
            <div class="alert-right">
              <div class="alert-days" :style="{ color: getAlertColor(alert.alertLevel) }">
                {{ getDaysLabel(alert.daysUntilExpiry) }}
              </div>
              <div class="alert-meta">
                <span>📦 剩余 {{ alert.remainingQuantity }} 支</span>
                <span>📅 效期: {{ alert.expiryDate }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 追溯查询 -->
      <div v-show="activeTab === 'trace'" class="tab-content">
        <div class="search-box">
          <el-radio-group v-model="searchType" size="default">
            <el-radio-button label="udi">UDI-PI 查询</el-radio-button>
            <el-radio-button label="batch">批号查询</el-radio-button>
          </el-radio-group>
          <el-input
            v-model="searchQuery"
            :placeholder="searchType === 'udi' ? '输入 UDI-PI 码...' : '输入生产批号...'"
            size="large"
            style="width: 400px;"
            @keyup.enter="handleSearch"
          >
            <template #append>
              <el-button type="primary" @click="handleSearch">🔍 查询</el-button>
            </template>
          </el-input>
        </div>

        <!-- 追溯时间线 -->
        <div v-if="searched && traceResult.length > 0" class="trace-timeline">
          <h4>追溯结果: {{ searchQuery }}</h4>
          <div class="timeline">
            <div
              v-for="record in traceResult"
              :key="record.id"
              class="timeline-item"
            >
              <div class="timeline-dot" :class="record.operation" />
              <div class="timeline-content">
                <div class="timeline-header">
                  <span class="timeline-op">{{ record.operation === 'outbound' ? '出库' : record.operation === 'inbound' ? '入库' : record.operation }}</span>
                  <span class="timeline-time">{{ new Date(record.timestamp).toLocaleString('zh-CN') }}</span>
                </div>
                <div class="timeline-body">
                  <div class="flow-arrow">
                    <span class="from">{{ record.from }}</span>
                    <span class="arrow">→</span>
                    <span class="to">{{ record.to }}</span>
                    <el-tag size="small" :type="record.toType === 'hospital' ? 'success' : 'primary'">
                      {{ record.toType === 'hospital' ? '医院' : record.toType === 'clinic' ? '门诊部' : '经销商' }}
                    </el-tag>
                  </div>
                  <div class="timeline-detail">
                    <span>产品: {{ record.productName }}</span>
                    <span>批号: {{ record.batchNo }}</span>
                    <span>序列号: {{ record.serialNo }}</span>
                    <span>操作人: {{ record.operator }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="searched" class="empty-state">
          <div class="empty-icon">🔍</div>
          <p>未找到相关追溯记录</p>
        </div>
      </div>

      <!-- 批次管理 -->
      <div v-show="activeTab === 'batch'" class="tab-content">
        <el-table :data="batches" style="width: 100%" stripe>
          <el-table-column prop="batchNo" label="批号" width="160">
            <template #default="{ row }">
              <span class="mono">{{ row.batchNo }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="productId" label="产品" width="200">
            <template #default="{ row }">
              {{ row.productId === 'P001' ? '胶原蛋白植入剂 1ml' : '胶原蛋白植入剂 0.5ml' }}
            </template>
          </el-table-column>
          <el-table-column label="库存" width="140">
            <template #default="{ row }">
              <div class="stock-cell">
                <span class="stock-current" :class="{ low: row.remaining < 50 }">{{ row.remaining }}</span>
                <span class="stock-total">/ {{ row.quantity }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="productionDate" label="生产日期" width="120" />
          <el-table-column label="效期" width="120">
            <template #default="{ row }">
              <span :class="{ 'text-danger': new Date(row.expiryDate) < new Date('2026-10-23') }">
                {{ row.expiryDate }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusTag(row.status).type" size="small">
                {{ getStatusTag(row.status).label }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button link type="primary" @click="searchQuery = row.batchNo; searchType = 'batch'; activeTab = 'trace'; handleSearch()">
                查流向
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.udi-trace { padding-bottom: 40px; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #E5E7EB;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 700;
  color: #1F2937;
  margin: 0 0 6px 0;
}

.subtitle { color: #6B7280; font-size: 14px; }

/* 预警看板 */
.alert-dashboard {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.alert-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 4px 16px rgba(0,0,0,0.04);
  border: 2px solid transparent;
}

.alert-card.critical {
  border-color: #FEE2E2;
  background: linear-gradient(135deg, #fff, #FEF2F2);
}

.alert-card.warning {
  border-color: #FEF3C7;
  background: linear-gradient(135deg, #fff, #FFFBEB);
}

.alert-card.safe {
  border-color: #D1FAE5;
  background: linear-gradient(135deg, #fff, #ECFDF5);
}

.alert-icon { font-size: 32px; margin-bottom: 8px; }
.alert-count { font-size: 32px; font-weight: 700; color: #1F2937; }
.alert-label { font-size: 14px; font-weight: 600; color: #4B5563; margin-top: 4px; }
.alert-desc { font-size: 12px; color: #9CA3AF; margin-top: 2px; }

/* 标签页 */
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

.tab-btn:hover { color: #1F2937; background: rgba(0,0,0,0.02); }
.tab-btn.active { color: #0071E3; font-weight: 600; }
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

.tab-content { padding: 24px; }

/* 预警列表 */
.alert-list { display: flex; flex-direction: column; gap: 12px; }

.alert-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-radius: 12px;
  border-left: 4px solid #E5E7EB;
  background: #FAFAFC;
}

.alert-item.critical { border-left-color: #EF4444; background: #FEF2F2; }
.alert-item.warning { border-left-color: #FF9500; background: #FFFBEB; }

.alert-left { display: flex; align-items: center; gap: 16px; }
.alert-level-badge {
  color: white;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
}

.alert-title { font-weight: 600; color: #1F2937; }
.alert-batch { font-size: 13px; color: #6B7280; font-family: monospace; }

.alert-right { text-align: right; }
.alert-days { font-size: 18px; font-weight: 700; }
.alert-meta { font-size: 12px; color: #6B7280; margin-top: 4px; display: flex; gap: 12px; }

/* 搜索 */
.search-box {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

/* 追溯时间线 */
.trace-timeline h4 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 20px;
  color: #1F2937;
}

.timeline { position: relative; padding-left: 24px; }
.timeline::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #E5E7EB;
}

.timeline-item {
  position: relative;
  padding-bottom: 24px;
}

.timeline-dot {
  position: absolute;
  left: -20px;
  top: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 0 0 2px #E5E7EB;
}

.timeline-dot.inbound { background: #34C759; box-shadow: 0 0 0 2px #34C759; }
.timeline-dot.outbound { background: #0071E3; box-shadow: 0 0 0 2px #0071E3; }
.timeline-dot.return { background: #FF9500; box-shadow: 0 0 0 2px #FF9500; }

.timeline-content {
  background: #FAFAFC;
  border-radius: 12px;
  padding: 16px;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.timeline-op {
  font-weight: 600;
  color: #1F2937;
}

.timeline-time { font-size: 13px; color: #9CA3AF; }

.flow-arrow {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.from, .to { font-weight: 500; }
.arrow { color: #9CA3AF; }

.timeline-detail {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #6B7280;
  flex-wrap: wrap;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-state p { color: #9CA3AF; font-size: 14px; }

/* 表格 */
.mono { font-family: monospace; font-weight: 500; }

.stock-cell { display: flex; align-items: baseline; gap: 4px; }
.stock-current { font-weight: 600; font-size: 15px; }
.stock-current.low { color: #EF4444; }
.stock-total { font-size: 12px; color: #9CA3AF; }

.text-danger { color: #EF4444; font-weight: 600; }

/* Responsive */
@media (max-width: 1024px) {
  .alert-dashboard { grid-template-columns: repeat(2, 1fr); }
  .search-box { flex-direction: column; align-items: stretch; }
  .alert-item { flex-direction: column; gap: 12px; text-align: left; }
  .alert-right { text-align: left; }
}

@media (max-width: 768px) {
  .alert-dashboard { grid-template-columns: 1fr; }
}
</style>
