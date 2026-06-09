<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCollagenProjectsStore } from '@/stores/collagenProjects'
import type {
  CollagenProjectDecision,
  CollagenProjectInstitution,
  CollagenProjectRiskLevel,
  CollagenProjectStage
} from '@/types/collagenProject'

const router = useRouter()
const collagenProjectsStore = useCollagenProjectsStore()
const errorMessage = ref('')

const form = reactive({
  name: '',
  city: '',
  owner: '',
  source: '直营',
  stage: '线索' as CollagenProjectStage,
  decision: '普通维护' as CollagenProjectDecision,
  risk: '中' as CollagenProjectRiskLevel,
  score: 60,
  doctorTraining: '未排期' as CollagenProjectInstitution['doctorTraining'],
  day30Status: '未开始' as CollagenProjectInstitution['day30Status'],
  cases: 0,
  authorizedCases: 0,
  contentCount: 0,
  geoChange: 0,
  nextAction: '补齐机构资料并确认启动会时间'
})

const stageOptions: CollagenProjectStage[] = ['线索', '待资料', '待启动会', '已签约', '已发货', '30天追踪', '复购判断', '样板沉淀', '暂停']
const decisionOptions: CollagenProjectDecision[] = ['复购', '续费陪跑', '二次启动', '样板沉淀', '普通维护', '暂停观察']
const riskOptions: CollagenProjectRiskLevel[] = ['低', '中', '高']
const doctorTrainingOptions: Array<CollagenProjectInstitution['doctorTraining']> = ['未排期', '已排期', '已完成']
const day30StatusOptions: Array<CollagenProjectInstitution['day30Status']> = ['未开始', '进行中', '已复盘', '暂停']

const normalizeNonNegativeInteger = (value: number) => Math.max(0, Math.round(Number(value) || 0))

const handleCreate = () => {
  errorMessage.value = ''

  if (!form.name.trim()) {
    errorMessage.value = '请填写机构名称'
    return
  }

  if (!form.owner.trim()) {
    errorMessage.value = '请填写负责人'
    return
  }

  const cases = normalizeNonNegativeInteger(form.cases)
  const authorizedCases = Math.min(cases, normalizeNonNegativeInteger(form.authorizedCases))
  const project = collagenProjectsStore.createProject({
    name: form.name.trim(),
    city: form.city.trim() || '未填写',
    owner: form.owner.trim(),
    source: form.source.trim() || '未填写',
    stage: form.stage,
    decision: form.decision,
    risk: form.risk,
    score: Math.min(100, Math.max(0, Math.round(Number(form.score) || 0))),
    doctorTraining: form.doctorTraining,
    day30Status: form.day30Status,
    cases,
    authorizedCases,
    contentCount: normalizeNonNegativeInteger(form.contentCount),
    geoChange: Math.round(Number(form.geoChange) || 0),
    nextAction: form.nextAction.trim() || '待补充下一步动作'
  })

  router.push(`/collagen-projects/${project.id}`)
}
</script>

<template>
  <div class="new-page">
    <section class="form-hero">
      <div>
        <router-link class="back-link" to="/collagen-projects">返回总看板</router-link>
        <p class="eyebrow">New Institution Project</p>
        <h2>新增胶原针剂机构项目</h2>
      </div>
      <button class="save-button" @click="handleCreate">创建项目</button>
    </section>

    <section class="form-panel">
      <div class="panel-header">
        <h3>建档信息</h3>
        <span>{{ errorMessage || '创建后自动保存到本地' }}</span>
      </div>
      <div class="form-grid">
        <label>
          <span>机构名称</span>
          <input v-model="form.name" placeholder="例如：南京丽颜医疗美容">
        </label>
        <label>
          <span>城市</span>
          <input v-model="form.city" placeholder="例如：南京">
        </label>
        <label>
          <span>负责人</span>
          <input v-model="form.owner" placeholder="例如：小周">
        </label>
        <label>
          <span>来源</span>
          <input v-model="form.source" placeholder="直营 / 渠道 / 转介绍">
        </label>
        <label>
          <span>当前阶段</span>
          <select v-model="form.stage">
            <option v-for="stage in stageOptions" :key="stage" :value="stage">{{ stage }}</option>
          </select>
        </label>
        <label>
          <span>经营决策</span>
          <select v-model="form.decision">
            <option v-for="decision in decisionOptions" :key="decision" :value="decision">{{ decision }}</option>
          </select>
        </label>
        <label>
          <span>风险等级</span>
          <select v-model="form.risk">
            <option v-for="risk in riskOptions" :key="risk" :value="risk">{{ risk }}</option>
          </select>
        </label>
        <label>
          <span>综合评分</span>
          <input v-model.number="form.score" type="number" min="0" max="100">
        </label>
        <label>
          <span>医生培训</span>
          <select v-model="form.doctorTraining">
            <option v-for="status in doctorTrainingOptions" :key="status" :value="status">{{ status }}</option>
          </select>
        </label>
        <label>
          <span>30天状态</span>
          <select v-model="form.day30Status">
            <option v-for="status in day30StatusOptions" :key="status" :value="status">{{ status }}</option>
          </select>
        </label>
        <label>
          <span>病例数</span>
          <input v-model.number="form.cases" type="number" min="0">
        </label>
        <label>
          <span>授权病例</span>
          <input v-model.number="form.authorizedCases" type="number" min="0">
        </label>
        <label>
          <span>内容数</span>
          <input v-model.number="form.contentCount" type="number" min="0">
        </label>
        <label>
          <span>GEO变化</span>
          <input v-model.number="form.geoChange" type="number">
        </label>
        <label class="wide-field">
          <span>下一步动作</span>
          <textarea v-model="form.nextAction" rows="3"></textarea>
        </label>
      </div>
    </section>
  </div>
</template>

<style scoped>
.new-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-hero,
.form-panel {
  background: var(--card);
  border-radius: var(--radius);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

.form-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 24px;
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

.form-hero h2 {
  font-size: 28px;
  font-weight: 700;
}

.form-panel {
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

.form-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.form-grid label {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.form-grid label span {
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 700;
}

.form-grid select,
.form-grid input,
.form-grid textarea {
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

.form-grid textarea {
  min-height: 86px;
  resize: vertical;
}

.wide-field {
  grid-column: span 4;
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

@media (max-width: 980px) {
  .form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .wide-field {
    grid-column: span 2;
  }
}

@media (max-width: 720px) {
  .form-hero {
    align-items: stretch;
    flex-direction: column;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .wide-field {
    grid-column: span 1;
  }

  .save-button {
    width: 100%;
  }
}
</style>
