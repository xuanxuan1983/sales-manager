export type CollagenProjectStage =
  | '线索'
  | '待资料'
  | '待启动会'
  | '已签约'
  | '已发货'
  | '30天追踪'
  | '复购判断'
  | '样板沉淀'
  | '暂停'

export type CollagenProjectRiskLevel = '低' | '中' | '高'

export type CollagenProjectDecision =
  | '复购'
  | '续费陪跑'
  | '二次启动'
  | '样板沉淀'
  | '普通维护'
  | '暂停观察'

export interface CollagenProjectFollowUpLog {
  id: string
  completedAt: string
  owner: string
  completedAction: string
  result: string
  nextAction: string
}

export interface CollagenProjectInstitution {
  id: string
  archivedAt?: string
  name: string
  city: string
  owner: string
  source: string
  stage: CollagenProjectStage
  decision: CollagenProjectDecision
  risk: CollagenProjectRiskLevel
  score: number
  shippedAt?: string
  day30Status: '未开始' | '进行中' | '已复盘' | '暂停'
  doctorTraining: '未排期' | '已排期' | '已完成'
  cases: number
  authorizedCases: number
  contentCount: number
  geoChange: number
  nextAction: string
  followUpLogs?: CollagenProjectFollowUpLog[]
}

export interface CollagenProjectMetrics {
  total: number
  active: number
  sampleReady: number
  repurchase: number
  highRisk: number
  avgScore: number
}
