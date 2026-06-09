<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useCollagenProjectsStore } from '@/stores/collagenProjects'
import type { CollagenProjectRiskLevel } from '@/types/collagenProject'

const collagenProjectsStore = useCollagenProjectsStore()
const ownerFilter = ref('全部')
const riskFilter = ref<'全部' | CollagenProjectRiskLevel>('全部')

const ownerOptions = computed(() => {
  const owners = Array.from(new Set(collagenProjectsStore.followUps.map(item => item.project.owner)))
  return ['全部', ...owners]
})

const filteredFollowUps = computed(() => {
  return collagenProjectsStore.followUps.filter(item => {
    const ownerMatched = ownerFilter.value === '全部' || item.project.owner === ownerFilter.value
    const riskMatched = riskFilter.value === '全部' || item.project.risk === riskFilter.value
    return ownerMatched && riskMatched
  })
})

const summary = computed(() => {
  const highPriority = filteredFollowUps.value.filter(item => item.priority === '高').length
  const highRisk = filteredFollowUps.value.filter(item => item.project.risk === '高').length
  const repurchaseReady = filteredFollowUps.value.filter(item => ['复购', '样板沉淀'].includes(item.project.decision)).length
  return {
    total: filteredFollowUps.value.length,
    highPriority,
    highRisk,
    repurchaseReady
  }
})

const priorityClass = (priority: string) => ({
  'priority-high': priority === '高',
  'priority-medium': priority === '中',
  'priority-low': priority === '低'
})

const riskClass = (risk: CollagenProjectRiskLevel) => ({
  'risk-low': risk === '低',
  'risk-medium': risk === '中',
  'risk-high': risk === '高'
})

onMounted(() => {
  collagenProjectsStore.loadProjects()
})
</script>

<template>
  <div class="follow-page">
    <section class="summary-band">
      <div>
        <p class="eyebrow">Daily Follow-up Queue</p>
        <h2>胶原项目跟进清单</h2>
      </div>
      <div class="summary-actions">
        <select v-model="ownerFilter" class="filter-select">
          <option v-for="owner in ownerOptions" :key="owner" :value="owner">{{ owner }}负责人</option>
        </select>
        <select v-model="riskFilter" class="filter-select">
          <option value="全部">全部风险</option>
          <option value="高">高风险</option>
          <option value="中">中风险</option>
          <option value="低">低风险</option>
        </select>
        <router-link class="primary-link" to="/collagen-projects">返回总看板</router-link>
      </div>
    </section>

    <section class="metric-grid">
      <div class="metric-tile">
        <span>待跟进</span>
        <strong>{{ summary.total }}</strong>
        <small>推进中机构动作</small>
      </div>
      <div class="metric-tile danger">
        <span>高优先级</span>
        <strong>{{ summary.highPriority }}</strong>
        <small>今天先处理</small>
      </div>
      <div class="metric-tile danger">
        <span>高风险</span>
        <strong>{{ summary.highRisk }}</strong>
        <small>需负责人介入</small>
      </div>
      <div class="metric-tile">
        <span>复购/样板</span>
        <strong>{{ summary.repurchaseReady }}</strong>
        <small>经营机会动作</small>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h3>今日处理顺序</h3>
        <span>按风险、决策价值、评分倒排</span>
      </div>

      <div class="empty-state" v-if="!filteredFollowUps.length">
        <h3>暂无待跟进动作</h3>
        <p>推进中机构的下一步动作为空，或当前筛选下没有匹配项。</p>
      </div>

      <div class="table-wrap" v-else>
        <table class="follow-table">
          <thead>
            <tr>
              <th>优先级</th>
              <th>机构</th>
              <th>负责人</th>
              <th>阶段</th>
              <th>风险</th>
              <th>动作</th>
              <th>经营判断</th>
              <th>入口</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredFollowUps" :key="item.project.id">
              <td><span class="priority-pill" :class="priorityClass(item.priority)">{{ item.priority }}</span></td>
              <td>
                <div class="institution-cell">
                  <strong>{{ item.project.name }}</strong>
                  <span>{{ item.project.city }} · 评分 {{ item.project.score }}</span>
                </div>
              </td>
              <td>{{ item.project.owner }}</td>
              <td>{{ item.project.stage }}</td>
              <td><span class="risk-pill" :class="riskClass(item.project.risk)">{{ item.project.risk }}</span></td>
              <td class="action-cell">{{ item.project.nextAction }}</td>
              <td>{{ item.project.decision }}</td>
              <td>
                <router-link class="detail-link" :to="`/collagen-projects/${item.project.id}`">处理</router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.follow-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.summary-band,
.panel,
.metric-tile {
  background: var(--card);
  border-radius: var(--radius);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

.summary-band {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 24px;
}

.eyebrow {
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
}

.summary-band h2 {
  font-size: 24px;
  font-weight: 700;
}

.summary-actions {
  display: flex;
  gap: 12px;
}

.filter-select {
  min-width: 132px;
  padding: 9px 14px;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  background: white;
  color: var(--primary);
  font-size: 14px;
}

.primary-link,
.detail-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 8px 14px;
  border-radius: 8px;
  background: var(--primary);
  color: white;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.metric-tile {
  min-height: 120px;
  padding: 18px;
}

.metric-tile span,
.metric-tile small {
  display: block;
  color: var(--text-secondary);
  font-size: 13px;
}

.metric-tile strong {
  display: block;
  margin: 10px 0 8px;
  font-size: 30px;
  line-height: 1;
}

.metric-tile.danger strong {
  color: var(--danger);
}

.panel {
  padding: 22px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.panel-header h3 {
  font-size: 18px;
  font-weight: 700;
}

.panel-header span {
  color: var(--text-secondary);
  font-size: 13px;
}

.table-wrap {
  overflow-x: auto;
}

.follow-table {
  width: 100%;
  min-width: 960px;
  border-collapse: collapse;
}

.follow-table th {
  text-align: left;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  padding: 0 12px 12px 0;
  border-bottom: 1px solid #eee;
}

.follow-table td {
  padding: 14px 12px 14px 0;
  border-bottom: 1px solid #f5f5f7;
  font-size: 14px;
  vertical-align: middle;
}

.institution-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 180px;
}

.institution-cell strong {
  font-weight: 700;
}

.institution-cell span {
  color: var(--text-secondary);
  font-size: 12px;
}

.priority-pill,
.risk-pill {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.priority-high,
.risk-high {
  background: #feecec;
  color: var(--danger);
}

.priority-medium,
.risk-medium {
  background: #fff4e5;
  color: #cc7700;
}

.priority-low,
.risk-low {
  background: #e8f8ee;
  color: var(--success);
}

.action-cell {
  max-width: 280px;
  color: var(--primary);
}

.detail-link {
  min-height: 30px;
  background: #f5f5f7;
  color: var(--accent);
  font-size: 13px;
}

.empty-state {
  padding: 18px;
  border-radius: 10px;
  background: #f8f8fb;
}

.empty-state p {
  margin-top: 6px;
  color: var(--text-secondary);
}

@media (max-width: 980px) {
  .summary-band,
  .panel-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .summary-actions {
    width: 100%;
  }

  .filter-select,
  .primary-link {
    flex: 1;
    min-width: 0;
  }

  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
