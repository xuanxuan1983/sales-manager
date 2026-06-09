<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useCollagenProjectsStore } from '@/stores/collagenProjects'
import type {
  CollagenProjectDecision,
  CollagenProjectInstitution,
  CollagenProjectRiskLevel,
  CollagenProjectStage
} from '@/types/collagenProject'

const route = useRoute()
const collagenProjectsStore = useCollagenProjectsStore()

const project = computed(() => collagenProjectsStore.findProjectById(String(route.params.id)))
const saveMessage = ref('')
const followUpMessage = ref('')

const editForm = reactive({
  stage: '待资料' as CollagenProjectStage,
  decision: '普通维护' as CollagenProjectDecision,
  risk: '中' as CollagenProjectRiskLevel,
  score: 0,
  doctorTraining: '未排期' as CollagenProjectInstitution['doctorTraining'],
  day30Status: '未开始' as CollagenProjectInstitution['day30Status'],
  cases: 0,
  authorizedCases: 0,
  contentCount: 0,
  geoChange: 0,
  nextAction: ''
})

const followUpForm = reactive({
  result: '',
  nextAction: ''
})

const stageOptions: CollagenProjectStage[] = ['线索', '待资料', '待启动会', '已签约', '已发货', '30天追踪', '复购判断', '样板沉淀', '暂停']
const decisionOptions: CollagenProjectDecision[] = ['复购', '续费陪跑', '二次启动', '样板沉淀', '普通维护', '暂停观察']
const riskOptions: CollagenProjectRiskLevel[] = ['低', '中', '高']
const doctorTrainingOptions: Array<CollagenProjectInstitution['doctorTraining']> = ['未排期', '已排期', '已完成']
const day30StatusOptions: Array<CollagenProjectInstitution['day30Status']> = ['未开始', '进行中', '已复盘', '暂停']

watch(project, currentProject => {
  if (!currentProject) return
  editForm.stage = currentProject.stage
  editForm.decision = currentProject.decision
  editForm.risk = currentProject.risk
  editForm.score = currentProject.score
  editForm.doctorTraining = currentProject.doctorTraining
  editForm.day30Status = currentProject.day30Status
  editForm.cases = currentProject.cases
  editForm.authorizedCases = currentProject.authorizedCases
  editForm.contentCount = currentProject.contentCount
  editForm.geoChange = currentProject.geoChange
  editForm.nextAction = currentProject.nextAction
  followUpForm.result = ''
  followUpForm.nextAction = ''
  saveMessage.value = ''
  followUpMessage.value = ''
}, { immediate: true })

const riskClass = (risk: CollagenProjectRiskLevel) => ({
  'risk-low': risk === '低',
  'risk-medium': risk === '中',
  'risk-high': risk === '高'
})

const buildTimeline = (item: CollagenProjectInstitution) => [
  {
    title: '项目启动',
    status: ['待启动会', '已签约', '已发货', '30天追踪', '复购判断', '样板沉淀'].includes(item.stage) ? 'done' : 'pending',
    detail: item.stage === '待资料' ? '资料未齐，暂不建议启动' : '已进入项目推进节奏'
  },
  {
    title: '医生培训',
    status: item.doctorTraining === '已完成' ? 'done' : item.doctorTraining === '已排期' ? 'active' : 'pending',
    detail: item.doctorTraining
  },
  {
    title: '产品发货',
    status: item.shippedAt ? 'done' : 'pending',
    detail: item.shippedAt ? `发货日期 ${item.shippedAt}` : '尚未发货'
  },
  {
    title: '30天追踪',
    status: item.day30Status === '已复盘' ? 'done' : item.day30Status === '进行中' ? 'active' : 'pending',
    detail: item.day30Status
  },
  {
    title: '复购/样板判断',
    status: ['复购', '样板沉淀'].includes(item.decision) ? 'done' : item.decision === '暂停观察' ? 'pending' : 'active',
    detail: item.decision
  }
]

const timeline = computed(() => project.value ? buildTimeline(project.value) : [])

const caseAuthorizationRate = computed(() => {
  if (!project.value?.cases) return 0
  return Math.round((project.value.authorizedCases / project.value.cases) * 100)
})

const handleSave = () => {
  if (!project.value) return

  const normalizedCases = Math.max(0, Math.round(Number(editForm.cases) || 0))
  const normalizedAuthorizedCases = Math.min(
    normalizedCases,
    Math.max(0, Math.round(Number(editForm.authorizedCases) || 0))
  )

  const updated = collagenProjectsStore.updateProject(project.value.id, {
    stage: editForm.stage,
    decision: editForm.decision,
    risk: editForm.risk,
    score: Math.min(100, Math.max(0, Math.round(Number(editForm.score) || 0))),
    doctorTraining: editForm.doctorTraining,
    day30Status: editForm.day30Status,
    cases: normalizedCases,
    authorizedCases: normalizedAuthorizedCases,
    contentCount: Math.max(0, Math.round(Number(editForm.contentCount) || 0)),
    geoChange: Math.round(Number(editForm.geoChange) || 0),
    nextAction: editForm.nextAction.trim() || '待补充下一步动作'
  })

  saveMessage.value = updated ? '已保存到本地' : '保存失败'
}

const handleArchiveToggle = () => {
  if (!project.value) return

  const wasArchived = Boolean(project.value.archivedAt)
  const updated = wasArchived
    ? collagenProjectsStore.restoreProject(project.value.id)
    : collagenProjectsStore.archiveProject(project.value.id)

  saveMessage.value = updated ? (wasArchived ? '已恢复到推进中' : '已归档到历史项目') : '操作失败'
}

const formatLogTime = (value: string) => {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}

const handleCompleteFollowUp = () => {
  if (!project.value) return

  const updated = collagenProjectsStore.completeFollowUp(
    project.value.id,
    followUpForm.result,
    followUpForm.nextAction
  )

  if (updated) {
    followUpForm.result = ''
    followUpForm.nextAction = ''
  }
  followUpMessage.value = updated ? '已写入跟进记录' : '记录失败'
}
</script>

<template>
  <div class="detail-page">
    <template v-if="project">
      <section class="detail-hero">
        <div>
          <router-link class="back-link" to="/collagen-projects">返回总看板</router-link>
          <p class="eyebrow">Institution Project File</p>
          <h2>{{ project.name }}</h2>
          <div class="hero-meta">
            <span>{{ project.city }}</span>
            <span>{{ project.source }}</span>
            <span>负责人 {{ project.owner }}</span>
            <span v-if="project.archivedAt" class="archive-meta">已归档</span>
          </div>
        </div>
        <div class="score-card">
          <span>综合评分</span>
          <strong>{{ project.score }}</strong>
          <em :class="riskClass(project.risk)">{{ project.risk }}风险</em>
        </div>
      </section>

      <section class="status-grid">
        <div class="status-tile">
          <span>当前阶段</span>
          <strong>{{ project.stage }}</strong>
        </div>
        <div class="status-tile">
          <span>经营决策</span>
          <strong>{{ project.decision }}</strong>
        </div>
        <div class="status-tile">
          <span>医生培训</span>
          <strong>{{ project.doctorTraining }}</strong>
        </div>
        <div class="status-tile">
          <span>30天状态</span>
          <strong>{{ project.day30Status }}</strong>
        </div>
      </section>

      <section class="content-grid">
        <div class="panel timeline-panel">
          <div class="panel-header">
            <h3>项目推进时间线</h3>
            <span>从启动到复购判断</span>
          </div>
          <div class="timeline">
            <div v-for="item in timeline" :key="item.title" class="timeline-item" :class="item.status">
              <div class="timeline-dot"></div>
              <div>
                <strong>{{ item.title }}</strong>
                <span>{{ item.detail }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <h3>30天追踪</h3>
            <span>病例、内容与GEO</span>
          </div>
          <div class="tracking-list">
            <div>
              <span>病例数</span>
              <strong>{{ project.cases }}</strong>
            </div>
            <div>
              <span>授权病例</span>
              <strong>{{ project.authorizedCases }}</strong>
            </div>
            <div>
              <span>授权率</span>
              <strong>{{ caseAuthorizationRate }}%</strong>
            </div>
            <div>
              <span>内容数</span>
              <strong>{{ project.contentCount }}</strong>
            </div>
            <div>
              <span>GEO变化</span>
              <strong>+{{ project.geoChange }}</strong>
            </div>
          </div>
        </div>
      </section>

      <section class="panel edit-panel">
        <div class="panel-header">
          <h3>更新项目状态</h3>
          <span>{{ saveMessage || '保存后自动同步总看板' }}</span>
        </div>
        <div class="edit-grid">
          <label>
            <span>当前阶段</span>
            <select v-model="editForm.stage">
              <option v-for="stage in stageOptions" :key="stage" :value="stage">{{ stage }}</option>
            </select>
          </label>
          <label>
            <span>经营决策</span>
            <select v-model="editForm.decision">
              <option v-for="decision in decisionOptions" :key="decision" :value="decision">{{ decision }}</option>
            </select>
          </label>
          <label>
            <span>风险等级</span>
            <select v-model="editForm.risk">
              <option v-for="risk in riskOptions" :key="risk" :value="risk">{{ risk }}</option>
            </select>
          </label>
          <label>
            <span>综合评分</span>
            <input v-model.number="editForm.score" type="number" min="0" max="100">
          </label>
          <label>
            <span>医生培训</span>
            <select v-model="editForm.doctorTraining">
              <option v-for="status in doctorTrainingOptions" :key="status" :value="status">{{ status }}</option>
            </select>
          </label>
          <label>
            <span>30天状态</span>
            <select v-model="editForm.day30Status">
              <option v-for="status in day30StatusOptions" :key="status" :value="status">{{ status }}</option>
            </select>
          </label>
          <label>
            <span>病例数</span>
            <input v-model.number="editForm.cases" type="number" min="0">
          </label>
          <label>
            <span>授权病例</span>
            <input v-model.number="editForm.authorizedCases" type="number" min="0">
          </label>
          <label>
            <span>内容数</span>
            <input v-model.number="editForm.contentCount" type="number" min="0">
          </label>
          <label>
            <span>GEO变化</span>
            <input v-model.number="editForm.geoChange" type="number">
          </label>
          <label class="wide-field">
            <span>下一步动作</span>
            <textarea v-model="editForm.nextAction" rows="3"></textarea>
          </label>
        </div>
        <div class="edit-actions">
          <button class="save-button" @click="handleSave">保存更新</button>
        </div>
      </section>

      <section class="action-band">
        <div>
          <span>下一步动作</span>
          <p>{{ project.nextAction }}</p>
        </div>
        <div class="action-buttons">
          <button class="archive-button" @click="handleArchiveToggle">
            {{ project.archivedAt ? '恢复项目' : '归档项目' }}
          </button>
          <router-link class="primary-link" to="/import">导入更新数据</router-link>
        </div>
      </section>

      <section class="panel follow-panel">
        <div class="panel-header">
          <h3>完成本次跟进</h3>
          <span>{{ followUpMessage || '完成后自动生成历史记录' }}</span>
        </div>
        <div class="current-action">
          <span>当前动作</span>
          <p>{{ project.nextAction }}</p>
        </div>
        <div class="follow-form">
          <label>
            <span>本次结果</span>
            <textarea v-model="followUpForm.result" rows="3" placeholder="例如：已联系院长，确认下周二做医生培训"></textarea>
          </label>
          <label>
            <span>新的下一步</span>
            <textarea v-model="followUpForm.nextAction" rows="3" placeholder="例如：下周二培训后收集3个病例授权"></textarea>
          </label>
        </div>
        <div class="edit-actions">
          <button class="save-button" @click="handleCompleteFollowUp">完成本次跟进</button>
        </div>
      </section>

      <section class="panel log-panel">
        <div class="panel-header">
          <h3>跟进历史</h3>
          <span>{{ project.followUpLogs?.length || 0 }} 条记录</span>
        </div>
        <div v-if="!project.followUpLogs?.length" class="empty-log">
          暂无跟进记录
        </div>
        <div v-else class="log-list">
          <div v-for="log in project.followUpLogs" :key="log.id" class="log-item">
            <div class="log-meta">
              <strong>{{ formatLogTime(log.completedAt) }}</strong>
              <span>{{ log.owner }}</span>
            </div>
            <div class="log-body">
              <span>完成：{{ log.completedAction }}</span>
              <p>{{ log.result }}</p>
              <em>下一步：{{ log.nextAction }}</em>
            </div>
          </div>
        </div>
      </section>
    </template>

    <section v-else class="empty-state">
      <h2>没有找到这家机构</h2>
      <p>可能是数据被清空，或链接里的项目 ID 已不存在。</p>
      <router-link class="primary-link" to="/collagen-projects">返回总看板</router-link>
    </section>
  </div>
</template>

<style scoped>
.detail-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-hero {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 20px;
  background: var(--card);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

.back-link {
  display: inline-flex;
  margin-bottom: 18px;
  color: var(--accent);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}

.eyebrow {
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
}

.detail-hero h2 {
  font-size: 28px;
  font-weight: 700;
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.hero-meta span {
  display: inline-flex;
  padding: 6px 10px;
  border-radius: 8px;
  background: #f5f5f7;
  color: var(--primary);
  font-size: 13px;
  font-weight: 700;
}

.hero-meta .archive-meta {
  background: #fff4e5;
  color: #cc7700;
}

.score-card {
  display: grid;
  place-items: center;
  min-width: 150px;
  padding: 18px;
  border-radius: 10px;
  background: #f8f8fb;
  text-align: center;
}

.score-card span,
.score-card em {
  color: var(--text-secondary);
  font-size: 13px;
  font-style: normal;
  font-weight: 700;
}

.score-card strong {
  font-size: 44px;
  line-height: 1;
}

.score-card em.risk-low { color: var(--success); }
.score-card em.risk-medium { color: #cc7700; }
.score-card em.risk-high { color: var(--danger); }

.status-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.status-tile,
.panel,
.action-band,
.empty-state {
  background: var(--card);
  border-radius: var(--radius);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

.status-tile {
  min-height: 112px;
  padding: 18px;
}

.status-tile span {
  display: block;
  color: var(--text-secondary);
  font-size: 13px;
  margin-bottom: 10px;
}

.status-tile strong {
  font-size: 22px;
}

.content-grid {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
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

.timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.timeline-item {
  display: grid;
  grid-template-columns: 16px 1fr;
  gap: 12px;
  align-items: start;
}

.timeline-dot {
  width: 12px;
  height: 12px;
  margin-top: 5px;
  border-radius: 999px;
  background: #d2d2d7;
}

.timeline-item.done .timeline-dot { background: var(--success); }
.timeline-item.active .timeline-dot { background: var(--accent); }

.timeline-item strong,
.timeline-item span {
  display: block;
}

.timeline-item span {
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 13px;
}

.tracking-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.tracking-list div {
  padding: 14px;
  border-radius: 10px;
  background: #f8f8fb;
}

.tracking-list span,
.action-band span {
  display: block;
  color: var(--text-secondary);
  font-size: 13px;
  margin-bottom: 6px;
}

.tracking-list strong {
  font-size: 24px;
}

.edit-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.edit-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.edit-grid label {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.edit-grid label span {
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 700;
}

.edit-grid select,
.edit-grid input,
.edit-grid textarea {
  width: 100%;
  min-height: 38px;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  background: white;
  color: var(--primary);
  font: inherit;
  font-size: 14px;
  padding: 8px 10px;
}

.edit-grid textarea {
  min-height: 86px;
  resize: vertical;
}

.wide-field {
  grid-column: span 4;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
}

.save-button {
  min-height: 38px;
  min-width: 112px;
  border: none;
  border-radius: 8px;
  background: var(--primary);
  color: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
}

.save-button:hover {
  background: #333336;
}

.action-band {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 22px;
}

.action-band p {
  color: var(--primary);
  font-size: 16px;
  font-weight: 700;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.archive-button {
  min-height: 38px;
  min-width: 100px;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  background: white;
  color: var(--primary);
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
}

.archive-button:hover {
  border-color: var(--primary);
}

.follow-panel,
.log-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.current-action {
  padding: 14px;
  border-radius: 10px;
  background: #f8f8fb;
}

.current-action span,
.follow-form label span {
  display: block;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 6px;
}

.current-action p {
  color: var(--primary);
  font-weight: 700;
}

.follow-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.follow-form label {
  display: flex;
  flex-direction: column;
}

.follow-form textarea {
  width: 100%;
  min-height: 92px;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  background: white;
  color: var(--primary);
  font: inherit;
  font-size: 14px;
  padding: 9px 10px;
  resize: vertical;
}

.empty-log {
  padding: 16px;
  border-radius: 10px;
  background: #f8f8fb;
  color: var(--text-secondary);
  font-size: 14px;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.log-item {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 14px;
  padding: 14px;
  border-radius: 10px;
  background: #f8f8fb;
}

.log-meta strong,
.log-meta span,
.log-body span,
.log-body em {
  display: block;
}

.log-meta strong {
  font-size: 14px;
}

.log-meta span,
.log-body span,
.log-body em {
  color: var(--text-secondary);
  font-size: 13px;
  font-style: normal;
}

.log-body p {
  margin: 4px 0;
  color: var(--primary);
  font-weight: 700;
}

.primary-link {
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

.empty-state {
  padding: 32px;
}

.empty-state p {
  margin: 8px 0 18px;
  color: var(--text-secondary);
}

@media (max-width: 980px) {
  .status-grid,
  .content-grid,
  .edit-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .wide-field {
    grid-column: span 2;
  }
}

@media (max-width: 720px) {
  .detail-hero,
  .action-band {
    flex-direction: column;
  }

  .score-card {
    min-width: 0;
  }

  .status-grid,
  .content-grid,
  .edit-grid,
  .tracking-list {
    grid-template-columns: 1fr;
  }

  .wide-field {
    grid-column: span 1;
  }

  .edit-actions {
    justify-content: stretch;
  }

  .save-button {
    width: 100%;
  }

  .follow-form,
  .log-item {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
  }

  .archive-button,
  .primary-link {
    width: 100%;
  }
}
</style>
