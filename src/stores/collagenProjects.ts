import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  archiveCollagenProject,
  clearCollagenProjects,
  completeCollagenFollowUp,
  createCollagenProject,
  getCollagenProjects,
  importCollagenProjects,
  restoreCollagenProject,
  updateCollagenProject,
  type CreateCollagenProjectPayload,
  type ImportCollagenProjectPayloadItem,
  type UpdateCollagenProjectPayload
} from '@/api/collagenProjects'
import type {
  CollagenProjectFollowUpLog,
  CollagenProjectInstitution,
  CollagenProjectMetrics,
  CollagenProjectRiskLevel,
  CollagenProjectStage
} from '@/types/collagenProject'

const mockProjects: CollagenProjectInstitution[] = [
  {
    id: 'cp-001',
    name: '北京颜研所',
    city: '北京',
    owner: '小赵',
    source: '直营',
    stage: '样板沉淀',
    decision: '样板沉淀',
    risk: '低',
    score: 92,
    shippedAt: '2026-05-08',
    day30Status: '已复盘',
    doctorTraining: '已完成',
    cases: 8,
    authorizedCases: 5,
    contentCount: 18,
    geoChange: 31,
    nextAction: '输出招商案例一页纸'
  },
  {
    id: 'cp-002',
    name: '上海华美医疗美容',
    city: '上海',
    owner: '小张',
    source: '渠道',
    stage: '复购判断',
    decision: '复购',
    risk: '低',
    score: 84,
    shippedAt: '2026-05-16',
    day30Status: '已复盘',
    doctorTraining: '已完成',
    cases: 6,
    authorizedCases: 3,
    contentCount: 12,
    geoChange: 18,
    nextAction: '确认第二批进货计划'
  },
  {
    id: 'cp-003',
    name: '杭州美颜连锁',
    city: '杭州',
    owner: '小李',
    source: '经销商',
    stage: '30天追踪',
    decision: '续费陪跑',
    risk: '中',
    score: 73,
    shippedAt: '2026-05-25',
    day30Status: '进行中',
    doctorTraining: '已完成',
    cases: 4,
    authorizedCases: 1,
    contentCount: 7,
    geoChange: 9,
    nextAction: '补病例授权和内容审核'
  },
  {
    id: 'cp-004',
    name: '广州丽人诊所',
    city: '广州',
    owner: '小王',
    source: '直营',
    stage: '已发货',
    decision: '二次启动',
    risk: '高',
    score: 58,
    shippedAt: '2026-06-01',
    day30Status: '未开始',
    doctorTraining: '已排期',
    cases: 1,
    authorizedCases: 0,
    contentCount: 0,
    geoChange: 0,
    nextAction: '重开老板和医生启动会'
  },
  {
    id: 'cp-005',
    name: '深圳美肤医院',
    city: '深圳',
    owner: '小刘',
    source: '渠道',
    stage: '待启动会',
    decision: '普通维护',
    risk: '中',
    score: 66,
    day30Status: '未开始',
    doctorTraining: '未排期',
    cases: 0,
    authorizedCases: 0,
    contentCount: 0,
    geoChange: 0,
    nextAction: '补注册证和主诊医生资料'
  },
  {
    id: 'cp-006',
    name: '成都美丽坊',
    city: '成都',
    owner: '小陈',
    source: '转介绍',
    stage: '待资料',
    decision: '暂停观察',
    risk: '高',
    score: 42,
    day30Status: '暂停',
    doctorTraining: '未排期',
    cases: 0,
    authorizedCases: 0,
    contentCount: 0,
    geoChange: 0,
    nextAction: '先核验机构资质和医生配合'
  }
]

const STORAGE_KEY = 'sales-manager-collagen-projects-v1'

const cloneMockProjects = () => mockProjects.map(project => ({ ...project }))

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

const readStoredProjects = () => {
  if (!isBrowser()) return null

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as CollagenProjectInstitution[] : null
  } catch (error) {
    console.error('Failed to load collagen projects from storage', error)
    return null
  }
}

const createProjectId = () => `cp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
const createFollowUpLogId = () => `ful-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  return '后端暂不可用，已使用本地缓存'
}

const toCreatePayload = (
  project: Omit<CollagenProjectInstitution, 'id'> | CollagenProjectInstitution
): CreateCollagenProjectPayload => {
  const payload = { ...project } as Partial<CollagenProjectInstitution>
  delete payload.id
  delete payload.archivedAt
  delete payload.followUpLogs
  return payload as CreateCollagenProjectPayload
}

const toUpdatePayload = (patch: Partial<CollagenProjectInstitution>): UpdateCollagenProjectPayload => {
  const payload = { ...patch }
  delete payload.id
  delete payload.archivedAt
  delete payload.followUpLogs
  return payload
}

const toImportPayload = (project: CollagenProjectInstitution): ImportCollagenProjectPayloadItem => {
  const payload = { ...project } as Partial<CollagenProjectInstitution>
  delete payload.followUpLogs
  return payload as ImportCollagenProjectPayloadItem
}

export const useCollagenProjectsStore = defineStore('collagenProjects', () => {
  const projects = ref<CollagenProjectInstitution[]>(readStoredProjects() ?? cloneMockProjects())
  const isLoading = ref(false)
  const apiAvailable = ref(false)
  const lastError = ref<string | null>(null)
  const activeProjects = computed(() => projects.value.filter(project => !project.archivedAt))
  const archivedProjects = computed(() => projects.value.filter(project => project.archivedAt))

  const saveProjects = () => {
    if (!isBrowser()) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects.value))
  }

  const applyProjects = (nextProjects: CollagenProjectInstitution[]) => {
    projects.value = nextProjects
    saveProjects()
  }

  const markApiSuccess = () => {
    apiAvailable.value = true
    lastError.value = null
  }

  const markApiFailure = (error: unknown) => {
    apiAvailable.value = false
    lastError.value = getErrorMessage(error)
  }

  const replaceProject = (nextProject: CollagenProjectInstitution) => {
    const index = projects.value.findIndex(project => project.id === nextProject.id)
    if (index === -1) {
      applyProjects([nextProject, ...projects.value])
      return
    }

    const nextProjects = [...projects.value]
    nextProjects[index] = nextProject
    applyProjects(nextProjects)
  }

  const metrics = computed<CollagenProjectMetrics>(() => {
    const total = activeProjects.value.length
    const active = activeProjects.value.filter(project => !['线索', '待资料', '暂停'].includes(project.stage)).length
    const sampleReady = activeProjects.value.filter(project => project.decision === '样板沉淀').length
    const repurchase = activeProjects.value.filter(project => project.decision === '复购').length
    const highRisk = activeProjects.value.filter(project => project.risk === '高').length
    const avgScore = total ? Math.round(activeProjects.value.reduce((sum, project) => sum + project.score, 0) / total) : 0

    return { total, active, sampleReady, repurchase, highRisk, avgScore }
  })

  const stageSummary = computed(() => {
    const stages: CollagenProjectStage[] = ['线索', '待资料', '待启动会', '已签约', '已发货', '30天追踪', '复购判断', '样板沉淀', '暂停']
    return stages.map(stage => ({
      stage,
      count: activeProjects.value.filter(project => project.stage === stage).length
    }))
  })

  const riskSummary = computed(() => [
    { label: '低风险', value: activeProjects.value.filter(project => project.risk === '低').length, className: 'low' },
    { label: '中风险', value: activeProjects.value.filter(project => project.risk === '中').length, className: 'medium' },
    { label: '高风险', value: activeProjects.value.filter(project => project.risk === '高').length, className: 'high' }
  ])

  const followUps = computed(() => {
    const riskWeight: Record<CollagenProjectRiskLevel, number> = { 高: 3, 中: 2, 低: 1 }
    const decisionWeight: Record<string, number> = {
      复购: 3,
      样板沉淀: 3,
      续费陪跑: 2,
      二次启动: 2,
      普通维护: 1,
      暂停观察: 0
    }

    return activeProjects.value
      .filter(project => project.nextAction.trim())
      .map(project => {
        const priorityScore = riskWeight[project.risk] * 30 + decisionWeight[project.decision] * 10 + Math.max(0, 100 - project.score)
        const priority = priorityScore >= 95 ? '高' : priorityScore >= 70 ? '中' : '低'
        return {
          project,
          priority,
          priorityScore
        }
      })
      .sort((first, second) => second.priorityScore - first.priorityScore)
  })

  const monthlyReview = computed(() => {
    const ownerMap = new Map<string, {
      owner: string
      total: number
      highRisk: number
      repurchase: number
      sampleReady: number
      followUpLogs: number
      avgScore: number
      scoreSum: number
    }>()

    activeProjects.value.forEach(project => {
      const current = ownerMap.get(project.owner) ?? {
        owner: project.owner,
        total: 0,
        highRisk: 0,
        repurchase: 0,
        sampleReady: 0,
        followUpLogs: 0,
        avgScore: 0,
        scoreSum: 0
      }

      current.total += 1
      current.highRisk += project.risk === '高' ? 1 : 0
      current.repurchase += project.decision === '复购' ? 1 : 0
      current.sampleReady += project.decision === '样板沉淀' ? 1 : 0
      current.followUpLogs += project.followUpLogs?.length ?? 0
      current.scoreSum += project.score
      current.avgScore = Math.round(current.scoreSum / current.total)
      ownerMap.set(project.owner, current)
    })

    const ownerSummary = Array.from(ownerMap.values())
      .map(({ scoreSum, ...owner }) => owner)
      .sort((first, second) => {
        const firstOpportunity = first.repurchase + first.sampleReady
        const secondOpportunity = second.repurchase + second.sampleReady
        return secondOpportunity - firstOpportunity || second.avgScore - first.avgScore || second.total - first.total
      })

    const blockedProjects = activeProjects.value
      .filter(project => project.risk === '高' || project.score < 65 || ['待资料', '待启动会', '暂停'].includes(project.stage))
      .sort((first, second) => {
        const riskDiff = (second.risk === '高' ? 1 : 0) - (first.risk === '高' ? 1 : 0)
        return riskDiff || first.score - second.score
      })

    const opportunityProjects = activeProjects.value
      .filter(project => ['复购', '样板沉淀', '续费陪跑'].includes(project.decision))
      .sort((first, second) => second.score - first.score)

    return {
      ownerSummary,
      blockedProjects,
      opportunityProjects
    }
  })

  const loadProjects = async () => {
    isLoading.value = true

    try {
      const result = await getCollagenProjects({
        archiveStatus: 'all',
        page: 1,
        pageSize: 200
      })

      applyProjects(result.list)
      markApiSuccess()
      return result.list.length
    } catch (error) {
      markApiFailure(error)
      return projects.value.length
    } finally {
      isLoading.value = false
    }
  }

  const setProjects = async (nextProjects: CollagenProjectInstitution[]) => {
    if (!nextProjects.length) {
      try {
        const result = await clearCollagenProjects()
        applyProjects(result.list)
        markApiSuccess()
        return result.total
      } catch (error) {
        markApiFailure(error)
      }
    }

    applyProjects(nextProjects)
    return nextProjects.length
  }

  const importProjects = async (nextProjects: CollagenProjectInstitution[]) => {
    try {
      const result = await importCollagenProjects({
        projects: nextProjects.map(project => toImportPayload(project)),
        mode: 'replace'
      })
      applyProjects(result.list)
      markApiSuccess()
      return result.imported
    } catch (error) {
      markApiFailure(error)
      applyProjects(nextProjects)
      return nextProjects.length
    }
  }

  const findProjectById = (id: string) => {
    return projects.value.find(project => project.id === id)
  }

  const createProject = async (project: Omit<CollagenProjectInstitution, 'id'>) => {
    try {
      const createdProject = await createCollagenProject(toCreatePayload(project))
      replaceProject(createdProject)
      markApiSuccess()
      return createdProject
    } catch (error) {
      markApiFailure(error)
    }

    const nextProject: CollagenProjectInstitution = {
      ...project,
      id: createProjectId()
    }

    applyProjects([nextProject, ...projects.value])
    return nextProject
  }

  const updateProject = async (id: string, patch: Partial<CollagenProjectInstitution>) => {
    const index = projects.value.findIndex(project => project.id === id)
    if (index === -1) return false

    try {
      const updatedProject = await updateCollagenProject(id, toUpdatePayload(patch))
      replaceProject(updatedProject)
      markApiSuccess()
      return true
    } catch (error) {
      markApiFailure(error)
    }

    const nextProjects = [...projects.value]
    nextProjects[index] = {
      ...projects.value[index],
      ...patch,
      id: projects.value[index].id
    }
    applyProjects(nextProjects)
    return true
  }

  const archiveProject = async (id: string) => {
    try {
      const archivedProject = await archiveCollagenProject(id)
      replaceProject(archivedProject)
      markApiSuccess()
      return true
    } catch (error) {
      markApiFailure(error)
    }

    return await updateProject(id, {
      archivedAt: new Date().toISOString(),
      stage: '暂停',
      decision: '暂停观察'
    })
  }

  const restoreProject = async (id: string) => {
    try {
      const restoredProject = await restoreCollagenProject(id)
      replaceProject(restoredProject)
      markApiSuccess()
      return true
    } catch (error) {
      markApiFailure(error)
    }

    return await updateProject(id, { archivedAt: undefined })
  }

  const completeFollowUp = async (id: string, result: string, nextAction: string) => {
    const project = findProjectById(id)
    if (!project) return false

    const fallbackResult = result.trim() || '已完成本次跟进'
    const fallbackNextAction = nextAction.trim() || '待补充下一步动作'

    try {
      const updatedProject = await completeCollagenFollowUp(id, {
        result: fallbackResult,
        nextAction: fallbackNextAction
      })
      replaceProject(updatedProject)
      markApiSuccess()
      return true
    } catch (error) {
      markApiFailure(error)
    }

    const log: CollagenProjectFollowUpLog = {
      id: createFollowUpLogId(),
      completedAt: new Date().toISOString(),
      owner: project.owner,
      completedAction: project.nextAction,
      result: fallbackResult,
      nextAction: fallbackNextAction
    }

    return await updateProject(id, {
      nextAction: log.nextAction,
      followUpLogs: [log, ...(project.followUpLogs ?? [])]
    })
  }

  const resetToSampleProjects = async () => {
    const sampleProjects = cloneMockProjects()

    try {
      const result = await importCollagenProjects({
        projects: sampleProjects.map(project => toImportPayload(project)),
        mode: 'replace'
      })
      applyProjects(result.list)
      markApiSuccess()
      return result.imported
    } catch (error) {
      markApiFailure(error)
      applyProjects(sampleProjects)
      return sampleProjects.length
    }
  }

  const filterProjects = (
    stageFilter: '全部' | CollagenProjectStage,
    riskFilter: '全部' | CollagenProjectRiskLevel,
    archiveFilter: '推进中' | '已归档' | '全部' = '推进中'
  ) => {
    return projects.value.filter(project => {
      const stageMatched = stageFilter === '全部' || project.stage === stageFilter
      const riskMatched = riskFilter === '全部' || project.risk === riskFilter
      const archiveMatched =
        archiveFilter === '全部' ||
        (archiveFilter === '推进中' && !project.archivedAt) ||
        (archiveFilter === '已归档' && Boolean(project.archivedAt))
      return stageMatched && riskMatched && archiveMatched
    })
  }

  return {
    projects,
    isLoading,
    apiAvailable,
    lastError,
    activeProjects,
    archivedProjects,
    metrics,
    stageSummary,
    riskSummary,
    followUps,
    monthlyReview,
    loadProjects,
    setProjects,
    importProjects,
    findProjectById,
    createProject,
    updateProject,
    archiveProject,
    restoreProject,
    completeFollowUp,
    resetToSampleProjects,
    filterProjects
  }
})
