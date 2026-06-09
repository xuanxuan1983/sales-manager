<script setup lang="ts">
import { computed } from 'vue'
import { useCollagenProjectsStore } from '@/stores/collagenProjects'
import { exportCollagenMonthlyReview } from '@/utils/export'
import type { CollagenProjectRiskLevel } from '@/types/collagenProject'

const collagenProjectsStore = useCollagenProjectsStore()

const metrics = computed(() => collagenProjectsStore.metrics)
const stageSummary = computed(() => collagenProjectsStore.stageSummary)
const review = computed(() => collagenProjectsStore.monthlyReview)

const riskClass = (risk: CollagenProjectRiskLevel) => ({
  'risk-low': risk === '低',
  'risk-medium': risk === '中',
  'risk-high': risk === '高'
})

const handleExportReview = () => {
  exportCollagenMonthlyReview(collagenProjectsStore.projects)
}
</script>

<template>
  <div class="review-page">
    <section class="summary-band">
      <div>
        <p class="eyebrow">Monthly Business Review</p>
        <h2>胶原项目月度复盘</h2>
      </div>
      <div class="summary-actions">
        <button class="export-button" @click="handleExportReview">导出复盘</button>
        <router-link class="secondary-link" to="/collagen-projects/follow-ups">查看跟进清单</router-link>
        <router-link class="primary-link" to="/collagen-projects">返回总看板</router-link>
      </div>
    </section>

    <section class="metric-grid">
      <div class="metric-tile">
        <span>推进中机构</span>
        <strong>{{ metrics.total }}</strong>
        <small>不含已归档项目</small>
      </div>
      <div class="metric-tile">
        <span>复购候选</span>
        <strong>{{ metrics.repurchase }}</strong>
        <small>可推进二次成交</small>
      </div>
      <div class="metric-tile">
        <span>样板候选</span>
        <strong>{{ metrics.sampleReady }}</strong>
        <small>可沉淀招商资产</small>
      </div>
      <div class="metric-tile danger">
        <span>高风险机构</span>
        <strong>{{ metrics.highRisk }}</strong>
        <small>需管理者介入</small>
      </div>
      <div class="metric-tile">
        <span>平均评分</span>
        <strong>{{ metrics.avgScore }}</strong>
        <small>项目启动质量</small>
      </div>
    </section>

    <section class="grid-two">
      <div class="panel">
        <div class="panel-header">
          <h3>负责人复盘</h3>
          <span>机会数优先排序</span>
        </div>
        <div class="table-wrap">
          <table class="review-table">
            <thead>
              <tr>
                <th>负责人</th>
                <th>机构</th>
                <th>复购</th>
                <th>样板</th>
                <th>高风险</th>
                <th>跟进</th>
                <th>均分</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="owner in review.ownerSummary" :key="owner.owner">
                <td><strong>{{ owner.owner }}</strong></td>
                <td>{{ owner.total }}</td>
                <td>{{ owner.repurchase }}</td>
                <td>{{ owner.sampleReady }}</td>
                <td>{{ owner.highRisk }}</td>
                <td>{{ owner.followUpLogs }}</td>
                <td>{{ owner.avgScore }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <h3>阶段结构</h3>
          <span>项目池健康度</span>
        </div>
        <div class="stage-list">
          <div v-for="item in stageSummary" :key="item.stage" class="stage-row">
            <span class="stage-name">{{ item.stage }}</span>
            <div class="stage-bar">
              <span :style="{ width: `${Math.max(item.count / metrics.total * 100, item.count ? 8 : 0)}%` }"></span>
            </div>
            <strong>{{ item.count }}</strong>
          </div>
        </div>
      </div>
    </section>

    <section class="grid-two">
      <div class="panel">
        <div class="panel-header">
          <h3>本月卡点项目</h3>
          <span>高风险、低分、早期卡住</span>
        </div>
        <div class="project-list">
          <router-link
            v-for="project in review.blockedProjects"
            :key="project.id"
            class="project-row"
            :to="`/collagen-projects/${project.id}`"
          >
            <div>
              <strong>{{ project.name }}</strong>
              <span>{{ project.owner }} · {{ project.stage }} · 评分 {{ project.score }}</span>
            </div>
            <em :class="riskClass(project.risk)">{{ project.risk }}</em>
          </router-link>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <h3>复购/样板机会池</h3>
          <span>优先转化为收入或案例</span>
        </div>
        <div class="project-list">
          <router-link
            v-for="project in review.opportunityProjects"
            :key="project.id"
            class="project-row"
            :to="`/collagen-projects/${project.id}`"
          >
            <div>
              <strong>{{ project.name }}</strong>
              <span>{{ project.owner }} · {{ project.decision }} · GEO +{{ project.geoChange }}</span>
            </div>
            <em :class="riskClass(project.risk)">{{ project.score }}</em>
          </router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.review-page {
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

.primary-link,
.secondary-link,
.export-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

.primary-link {
  background: var(--primary);
  color: white;
}

.export-button {
  border: none;
  background: var(--primary);
  color: white;
  cursor: pointer;
}

.secondary-link {
  border: 1px solid #d2d2d7;
  color: var(--primary);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
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

.grid-two {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
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

.review-table {
  width: 100%;
  min-width: 620px;
  border-collapse: collapse;
}

.review-table th {
  text-align: left;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  padding: 0 12px 12px 0;
  border-bottom: 1px solid #eee;
}

.review-table td {
  padding: 13px 12px 13px 0;
  border-bottom: 1px solid #f5f5f7;
  font-size: 14px;
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

.project-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.project-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px;
  border-radius: 10px;
  background: #f8f8fb;
  color: var(--primary);
  text-decoration: none;
}

.project-row strong,
.project-row span,
.project-row em {
  display: block;
}

.project-row span {
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 13px;
}

.project-row em {
  min-width: 42px;
  font-style: normal;
  font-weight: 800;
  text-align: right;
}

.risk-low { color: var(--success); }
.risk-medium { color: #cc7700; }
.risk-high { color: var(--danger); }

@media (max-width: 1100px) {
  .metric-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .grid-two {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .summary-band,
  .panel-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .summary-actions {
    width: 100%;
  }

  .primary-link,
  .secondary-link,
  .export-button {
    flex: 1;
  }

  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
