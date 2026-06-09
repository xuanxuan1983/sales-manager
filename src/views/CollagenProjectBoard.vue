<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useCollagenProjectsStore } from '@/stores/collagenProjects'
import { exportCollagenProjectsMonthlyReport } from '@/utils/export'
import type { CollagenProjectRiskLevel, CollagenProjectStage } from '@/types/collagenProject'

const collagenProjectsStore = useCollagenProjectsStore()
const stageFilter = ref<'全部' | CollagenProjectStage>('全部')
const riskFilter = ref<'全部' | CollagenProjectRiskLevel>('全部')
const archiveFilter = ref<'推进中' | '已归档' | '全部'>('推进中')

const filteredProjects = computed(() => {
  return collagenProjectsStore.filterProjects(stageFilter.value, riskFilter.value, archiveFilter.value)
})

const metrics = computed(() => collagenProjectsStore.metrics)
const stageSummary = computed(() => collagenProjectsStore.stageSummary)
const riskSummary = computed(() => collagenProjectsStore.riskSummary)

const stageOptions: Array<'全部' | CollagenProjectStage> = ['全部', '待资料', '待启动会', '已发货', '30天追踪', '复购判断', '样板沉淀', '暂停']
const riskOptions: Array<'全部' | CollagenProjectRiskLevel> = ['全部', '低', '中', '高']
const archiveOptions: Array<'推进中' | '已归档' | '全部'> = ['推进中', '已归档', '全部']

onMounted(() => {
  collagenProjectsStore.loadProjects()
})

const riskClass = (risk: CollagenProjectRiskLevel) => ({
  'risk-low': risk === '低',
  'risk-medium': risk === '中',
  'risk-high': risk === '高'
})

const handleExportMonthlyReport = () => {
  exportCollagenProjectsMonthlyReport(filteredProjects.value)
}

const handleResetSampleProjects = () => {
  collagenProjectsStore.resetToSampleProjects()
  stageFilter.value = '全部'
  riskFilter.value = '全部'
  archiveFilter.value = '推进中'
}
</script>

<template>
  <div class="collagen-board">
    <section class="summary-band">
      <div>
        <p class="eyebrow">Collagen Project Control</p>
        <h2>胶原针剂多机构项目总看板</h2>
      </div>
      <div class="summary-actions">
        <select v-model="stageFilter" class="filter-select">
          <option v-for="stage in stageOptions" :key="stage" :value="stage">{{ stage }}阶段</option>
        </select>
        <select v-model="riskFilter" class="filter-select">
          <option v-for="risk in riskOptions" :key="risk" :value="risk">{{ risk }}风险</option>
        </select>
        <select v-model="archiveFilter" class="filter-select">
          <option v-for="status in archiveOptions" :key="status" :value="status">{{ status }}</option>
        </select>
        <router-link class="new-link" to="/collagen-projects/new">新增机构</router-link>
        <button class="secondary-button" @click="handleResetSampleProjects">恢复样例</button>
        <button class="export-button" @click="handleExportMonthlyReport">导出月报</button>
      </div>
    </section>

    <section class="metric-grid">
      <div class="metric-tile">
        <span>机构总数</span>
        <strong>{{ metrics.total }}</strong>
        <small>覆盖本月项目池</small>
      </div>
      <div class="metric-tile">
        <span>启动中</span>
        <strong>{{ metrics.active }}</strong>
        <small>签约后进入交付</small>
      </div>
      <div class="metric-tile">
        <span>复购候选</span>
        <strong>{{ metrics.repurchase }}</strong>
        <small>30天后可推进</small>
      </div>
      <div class="metric-tile">
        <span>样板候选</span>
        <strong>{{ metrics.sampleReady }}</strong>
        <small>可沉淀招商资产</small>
      </div>
      <div class="metric-tile danger">
        <span>高风险</span>
        <strong>{{ metrics.highRisk }}</strong>
        <small>需负责人介入</small>
      </div>
      <div class="metric-tile">
        <span>平均评分</span>
        <strong>{{ metrics.avgScore }}</strong>
        <small>综合启动质量</small>
      </div>
    </section>

    <section class="overview-grid">
      <div class="panel">
        <div class="panel-header">
          <h3>阶段分布</h3>
          <span>从线索到样板沉淀</span>
        </div>
        <div class="stage-list">
          <div v-for="item in stageSummary" :key="item.stage" class="stage-row">
            <span class="stage-name">{{ item.stage }}</span>
            <div class="stage-bar">
              <span :style="{ width: `${metrics.total ? Math.max(item.count / metrics.total * 100, item.count ? 8 : 0) : 0}%` }"></span>
            </div>
            <strong>{{ item.count }}</strong>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <h3>风险结构</h3>
          <span>按当前最高风险标记</span>
        </div>
        <div class="risk-grid">
          <div v-for="risk in riskSummary" :key="risk.label" class="risk-card" :class="risk.className">
            <strong>{{ risk.value }}</strong>
            <span>{{ risk.label }}</span>
          </div>
        </div>
        <div class="next-focus">
          <span>本周优先动作</span>
          <p>先处理高风险机构的资质、医生配合和病例授权，再推进复购与样板外显。</p>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h3>机构项目池</h3>
        <span>{{ filteredProjects.length }} 家机构</span>
      </div>

      <div class="table-wrap">
        <table class="project-table">
          <thead>
            <tr>
              <th>机构</th>
              <th>城市</th>
              <th>阶段</th>
              <th>负责人</th>
              <th>决策</th>
              <th>风险</th>
              <th>病例</th>
              <th>内容/GEO</th>
              <th>下一步</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="project in filteredProjects" :key="project.id">
              <td>
                <div class="institution-cell">
                  <strong>{{ project.name }}</strong>
                  <span>{{ project.source }} · 评分 {{ project.score }}<template v-if="project.archivedAt"> · 已归档</template></span>
                </div>
              </td>
              <td>{{ project.city }}</td>
              <td><span class="stage-pill">{{ project.stage }}</span></td>
              <td>{{ project.owner }}</td>
              <td>{{ project.decision }}</td>
              <td><span class="risk-pill" :class="riskClass(project.risk)">{{ project.risk }}</span></td>
              <td>{{ project.authorizedCases }}/{{ project.cases }}</td>
              <td>{{ project.contentCount }}篇 · GEO +{{ project.geoChange }}</td>
              <td class="next-action">{{ project.nextAction }}</td>
              <td>
                <router-link class="detail-link" :to="`/collagen-projects/${project.id}`">详情</router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.collagen-board {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.summary-band {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  background: var(--card);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
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

.export-button {
  min-width: 104px;
  min-height: 38px;
  border: none;
  border-radius: 8px;
  background: var(--primary);
  color: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
}

.secondary-button {
  min-width: 104px;
  min-height: 38px;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  background: white;
  color: var(--primary);
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
}

.new-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 104px;
  min-height: 38px;
  padding: 8px 14px;
  border-radius: 8px;
  background: #eef5ff;
  color: var(--accent);
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

.export-button:hover {
  background: #333336;
}

.new-link:hover {
  background: #e1efff;
}

.secondary-button:hover {
  border-color: var(--primary);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
}

.metric-tile {
  background: var(--card);
  border-radius: var(--radius);
  padding: 18px;
  min-height: 124px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
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

.overview-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 20px;
}

.panel {
  background: var(--card);
  border-radius: var(--radius);
  padding: 22px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
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

.stage-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stage-row {
  display: grid;
  grid-template-columns: 88px 1fr 24px;
  align-items: center;
  gap: 12px;
}

.stage-name {
  font-size: 13px;
  color: var(--primary);
}

.stage-bar {
  height: 10px;
  background: #f1f1f4;
  border-radius: 999px;
  overflow: hidden;
}

.stage-bar span {
  display: block;
  height: 100%;
  background: var(--accent);
  border-radius: inherit;
}

.stage-row strong {
  text-align: right;
  font-size: 14px;
}

.risk-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.risk-card {
  padding: 16px 12px;
  border-radius: 10px;
  background: #f5f5f7;
}

.risk-card strong {
  display: block;
  font-size: 26px;
  line-height: 1;
  margin-bottom: 8px;
}

.risk-card span {
  color: var(--text-secondary);
  font-size: 13px;
}

.risk-card.low strong { color: var(--success); }
.risk-card.medium strong { color: #ff9500; }
.risk-card.high strong { color: var(--danger); }

.next-focus {
  margin-top: 18px;
  padding: 14px;
  background: #f8f8fb;
  border-radius: 10px;
}

.next-focus span {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.next-focus p {
  font-size: 14px;
  color: var(--primary);
}

.table-wrap {
  overflow-x: auto;
}

.project-table {
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
}

.project-table th {
  text-align: left;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  padding: 0 12px 12px 0;
  border-bottom: 1px solid #eee;
}

.project-table td {
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

.stage-pill,
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

.stage-pill {
  background: #eef5ff;
  color: var(--accent);
}

.risk-low {
  background: #e8f8ee;
  color: var(--success);
}

.risk-medium {
  background: #fff4e5;
  color: #cc7700;
}

.risk-high {
  background: #feecec;
  color: var(--danger);
}

.next-action {
  max-width: 220px;
  color: var(--primary);
}

.detail-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 5px 12px;
  border-radius: 8px;
  background: #f5f5f7;
  color: var(--accent);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

.detail-link:hover {
  background: #eef5ff;
}

@media (max-width: 1200px) {
  .metric-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .overview-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .summary-band,
  .panel-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .summary-actions {
    width: 100%;
  }

  .filter-select {
    flex: 1;
    min-width: 0;
  }

  .export-button {
    width: 100%;
  }

  .new-link {
    width: 100%;
  }

  .secondary-button {
    width: 100%;
  }

  .metric-grid,
  .risk-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
