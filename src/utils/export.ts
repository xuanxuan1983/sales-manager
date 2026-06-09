import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import type { Order, OrderStatus, AdverseEvent } from '@/types/sales'
import type { CollagenProjectInstitution } from '@/types/collagenProject'

// ============ Status Mapping ============
const statusMap: Record<OrderStatus, string> = {
  pending: '待确认',
  confirmed: '已确认',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消'
}

// ============ Column Width Presets ============
const columnWidths: Record<string, number> = {
  '订单编号': 15,
  '客户名称': 20,
  '产品名称': 18,
  '数量': 8,
  '单价': 12,
  '总金额': 12,
  '业务员': 10,
  '订单日期': 12,
  '状态': 10,
  '备注': 25,
  '渠道': 10,
  '代理商': 18,
  '大区': 10,
  '城市': 10
}

// ============ Export Config by Entity Type ============
interface ExportConfig<T> {
  headers: string[]
  fields: (keyof T | ((item: T) => string | number))[]
  filename: string
  sheetName: string
}

const orderExportConfig: ExportConfig<Order> = {
  headers: ['订单编号', '客户名称', '渠道', '代理商', '产品名称', '数量', '单价', '总金额', '业务员', '订单日期', '状态', '备注'],
  fields: [
    'orderNo',
    'clientName',
    (o) => o.channel === 'direct' ? '直营' : o.channel === 'distributor' ? '代理' : '混合',
    'distributorName',
    (o) => o.items.map(i => i.productName).join(', '),
    'totalQuantity',
    (o) => o.totalQuantity ? Math.round(o.totalAmount / o.totalQuantity) : 0,
    'totalAmount',
    'salespersonName',
    'orderDate',
    (o) => statusMap[o.status],
    'remark'
  ],
  filename: '销售订单',
  sheetName: '销售订单'
}

// ============ Core Export Function ============
export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  config: ExportConfig<T>,
  customFilename?: string
) {
  const exportData = data.map(item => {
    const row: Record<string, string | number> = {}
    config.headers.forEach((header, index) => {
      const field = config.fields[index]
      if (typeof field === 'function') {
        row[header] = field(item)
      } else {
        const value = item[field as string]
        row[header] = value !== undefined && value !== null ? String(value) : ''
      }
    })
    return row
  })

  const worksheet = XLSX.utils.json_to_sheet(exportData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, config.sheetName)

  // Set column widths
  worksheet['!cols'] = config.headers.map(h => ({
    wch: columnWidths[h] || 15
  }))

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })

  const dateStr = new Date().toISOString().split('T')[0]
  saveAs(blob, `${customFilename || config.filename}_${dateStr}.xlsx`)
}

// ============ Convenience Exports ============
export const exportOrders = (orders: Order[], filename?: string) => {
  exportToExcel(orders as unknown as Record<string, unknown>[], orderExportConfig as unknown as ExportConfig<Record<string, unknown>>, filename)
}

// ============ CSV Export ============
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  config: ExportConfig<T>,
  customFilename?: string
) {
  const exportData = data.map(item => {
    const row: Record<string, string | number> = {}
    config.headers.forEach((header, index) => {
      const field = config.fields[index]
      if (typeof field === 'function') {
        row[header] = field(item)
      } else {
        const value = item[field as string]
        row[header] = value !== undefined && value !== null ? String(value) : ''
      }
    })
    return row
  })

  const worksheet = XLSX.utils.json_to_sheet(exportData)
  const csv = XLSX.utils.sheet_to_csv(worksheet)
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })

  const dateStr = new Date().toISOString().split('T')[0]
  saveAs(blob, `${customFilename || config.filename}_${dateStr}.csv`)
}

export const exportOrdersToCSV = (orders: Order[], filename?: string) => {
  exportToCSV(orders as unknown as Record<string, unknown>[], orderExportConfig as unknown as ExportConfig<Record<string, unknown>>, filename)
}

// ============ 不良事件导出（药监局模板） ============

const eventTypeMap: Record<string, string> = {
  infection: '感染',
  allergy: '过敏反应',
  nodule: '结节/硬结',
  vascular: '血管栓塞',
  asymmetry: '不对称/畸形',
  other: '其他'
}

const severityMap: Record<string, string> = {
  mild: '轻度',
  moderate: '中度',
  severe: '重度',
  life_threatening: '危及生命'
}

const statusMap2: Record<string, string> = {
  reported: '已上报',
  investigating: '调查中',
  confirmed: '已确认',
  closed: '已结案',
  reported_to_nmpa: '已报药监局'
}

const genderMap: Record<string, string> = {
  male: '男',
  female: '女'
}

const institutionMap: Record<string, string> = {
  clinic: '医疗美容门诊部',
  hospital: '医院整形科',
  beauty_salon: '生活美容机构'
}

// NMPA 医疗器械不良事件报告表模板
const adverseEventNMPAConfig: ExportConfig<AdverseEvent> = {
  headers: [
    '报告编号',
    '报告日期',
    '上报人',
    '联系方式',
    '患者年龄',
    '患者性别',
    '产品名称',
    'UDI-DI',
    'UDI-PI',
    '生产批号',
    '序列号',
    '事件类型',
    '事件发生日期',
    '事件描述',
    '处理措施',
    '严重程度',
    '转归情况',
    '发生机构',
    '机构类型',
    '操作医师',
    '处理状态',
    '药监局上报编号',
    '结案日期',
    '备注'
  ],
  fields: [
    'reportNo',
    'reportDate',
    'reporter',
    'reporterContact',
    (e) => e.patientAge || '',
    (e) => e.patientGender ? genderMap[e.patientGender] : '',
    'productName',
    'udiDi',
    'udiPi',
    'batchNo',
    'serialNo',
    (e) => eventTypeMap[e.eventType] || e.eventType,
    'eventDate',
    'eventDescription',
    (e) => e.treatmentDescription || '',
    (e) => severityMap[e.severity] || e.severity,
    (e) => {
      const map: Record<string, string> = { recovered: '痊愈', recovering: '好转中', not_recovered: '未痊愈', death: '死亡', unknown: '未知' }
      return e.outcome ? map[e.outcome] : ''
    },
    'institutionName',
    (e) => institutionMap[e.institutionType] || e.institutionType,
    (e) => e.operatorName || '',
    (e) => statusMap2[e.status] || e.status,
    (e) => e.nmpaReportNo || '',
    (e) => e.closedDate || '',
    (e) => e.remark || ''
  ],
  filename: '医疗器械不良事件报告表_NMPA',
  sheetName: '不良事件报告'
}

export const exportAdverseEventsNMPA = (events: AdverseEvent[], filename?: string) => {
  exportToExcel(events as unknown as Record<string, unknown>[], adverseEventNMPAConfig as unknown as ExportConfig<Record<string, unknown>>, filename)
}

// 简版导出（内部使用）
const adverseEventSimpleConfig: ExportConfig<AdverseEvent> = {
  headers: ['报告编号', '上报日期', '事件类型', '严重程度', '发生机构', '批号', 'UDI-PI', '状态', '事件描述'],
  fields: [
    'reportNo',
    'reportDate',
    (e) => eventTypeMap[e.eventType] || e.eventType,
    (e) => severityMap[e.severity] || e.severity,
    'institutionName',
    'batchNo',
    'udiPi',
    (e) => statusMap2[e.status] || e.status,
    'eventDescription'
  ],
  filename: '不良事件清单',
  sheetName: '不良事件'
}

export const exportAdverseEventsSimple = (events: AdverseEvent[], filename?: string) => {
  exportToExcel(events as unknown as Record<string, unknown>[], adverseEventSimpleConfig as unknown as ExportConfig<Record<string, unknown>>, filename)
}

// ============ 胶原项目经营月报导出 ============
export function exportCollagenProjectsMonthlyReport(projects: CollagenProjectInstitution[], filename?: string) {
  const total = projects.length
  const active = projects.filter(project => !['线索', '待资料', '暂停'].includes(project.stage)).length
  const repurchase = projects.filter(project => project.decision === '复购').length
  const renewal = projects.filter(project => project.decision === '续费陪跑').length
  const restart = projects.filter(project => project.decision === '二次启动').length
  const sampleReady = projects.filter(project => project.decision === '样板沉淀').length
  const highRisk = projects.filter(project => project.risk === '高').length
  const avgScore = total ? Math.round(projects.reduce((sum, project) => sum + project.score, 0) / total) : 0

  const summaryRows = [
    { 指标: '机构总数', 数值: total, 备注: '当前导出范围内机构总数' },
    { 指标: '启动中机构', 数值: active, 备注: '已进入签约后交付或30天追踪' },
    { 指标: '复购候选', 数值: repurchase, 备注: '后续决策为复购' },
    { 指标: '续费陪跑', 数值: renewal, 备注: '后续决策为续费陪跑' },
    { 指标: '二次启动', 数值: restart, 备注: '需重新锁定角色、病例和内容节奏' },
    { 指标: '样板沉淀', 数值: sampleReady, 备注: '可进入招商/培训/GEO资产沉淀' },
    { 指标: '高风险机构', 数值: highRisk, 备注: '需要负责人介入处理' },
    { 指标: '平均评分', 数值: avgScore, 备注: '综合启动或复购评分' }
  ]

  const projectRows = projects.map(project => ({
    机构名称: project.name,
    城市: project.city,
    来源: project.source,
    阶段: project.stage,
    负责人: project.owner,
    决策: project.decision,
    风险: project.risk,
    评分: project.score,
    发货日期: project.shippedAt || '',
    '30天状态': project.day30Status,
    医生培训: project.doctorTraining,
    病例数: project.cases,
    授权病例数: project.authorizedCases,
    内容数: project.contentCount,
    GEO变化: project.geoChange,
    下一步: project.nextAction
  }))

  const workbook = XLSX.utils.book_new()
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows)
  const projectSheet = XLSX.utils.json_to_sheet(projectRows)

  summarySheet['!cols'] = [{ wch: 18 }, { wch: 10 }, { wch: 36 }]
  projectSheet['!cols'] = [
    { wch: 24 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 8 },
    { wch: 8 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 8 },
    { wch: 12 },
    { wch: 8 },
    { wch: 10 },
    { wch: 28 }
  ]

  XLSX.utils.book_append_sheet(workbook, summarySheet, '月度总览')
  XLSX.utils.book_append_sheet(workbook, projectSheet, '机构项目池')

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const dateStr = new Date().toISOString().split('T')[0]
  saveAs(blob, `${filename || '胶原项目经营数据月报'}_${dateStr}.xlsx`)
}

export function exportCollagenMonthlyReview(
  projects: CollagenProjectInstitution[],
  filename?: string
) {
  const activeProjects = projects.filter(project => !project.archivedAt)
  const total = activeProjects.length
  const active = activeProjects.filter(project => !['线索', '待资料', '暂停'].includes(project.stage)).length
  const repurchase = activeProjects.filter(project => project.decision === '复购').length
  const sampleReady = activeProjects.filter(project => project.decision === '样板沉淀').length
  const highRisk = activeProjects.filter(project => project.risk === '高').length
  const avgScore = total ? Math.round(activeProjects.reduce((sum, project) => sum + project.score, 0) / total) : 0

  const summaryRows = [
    { 指标: '推进中机构', 数值: total, 备注: '不含已归档项目' },
    { 指标: '启动中机构', 数值: active, 备注: '已进入签约后交付或30天追踪' },
    { 指标: '复购候选', 数值: repurchase, 备注: '后续决策为复购' },
    { 指标: '样板候选', 数值: sampleReady, 备注: '可沉淀招商、培训或GEO资产' },
    { 指标: '高风险机构', 数值: highRisk, 备注: '需要负责人或管理者介入' },
    { 指标: '平均评分', 数值: avgScore, 备注: '推进中机构综合评分' }
  ]

  const ownerMap = new Map<string, {
    负责人: string
    机构数: number
    复购候选: number
    样板候选: number
    高风险: number
    跟进记录: number
    平均分: number
    scoreSum: number
  }>()

  activeProjects.forEach(project => {
    const current = ownerMap.get(project.owner) ?? {
      负责人: project.owner,
      机构数: 0,
      复购候选: 0,
      样板候选: 0,
      高风险: 0,
      跟进记录: 0,
      平均分: 0,
      scoreSum: 0
    }
    current.机构数 += 1
    current.复购候选 += project.decision === '复购' ? 1 : 0
    current.样板候选 += project.decision === '样板沉淀' ? 1 : 0
    current.高风险 += project.risk === '高' ? 1 : 0
    current.跟进记录 += project.followUpLogs?.length ?? 0
    current.scoreSum += project.score
    current.平均分 = Math.round(current.scoreSum / current.机构数)
    ownerMap.set(project.owner, current)
  })

  const ownerRows = Array.from(ownerMap.values()).map(({ scoreSum, ...row }) => row)
  const stageRows = ['线索', '待资料', '待启动会', '已签约', '已发货', '30天追踪', '复购判断', '样板沉淀', '暂停']
    .map(stage => ({
      阶段: stage,
      机构数: activeProjects.filter(project => project.stage === stage).length
    }))

  const blockedRows = activeProjects
    .filter(project => project.risk === '高' || project.score < 65 || ['待资料', '待启动会', '暂停'].includes(project.stage))
    .map(project => ({
      机构名称: project.name,
      城市: project.city,
      负责人: project.owner,
      阶段: project.stage,
      风险: project.risk,
      评分: project.score,
      下一步: project.nextAction
    }))

  const opportunityRows = activeProjects
    .filter(project => ['复购', '样板沉淀', '续费陪跑'].includes(project.decision))
    .map(project => ({
      机构名称: project.name,
      城市: project.city,
      负责人: project.owner,
      决策: project.decision,
      风险: project.risk,
      评分: project.score,
      GEO变化: project.geoChange,
      内容数: project.contentCount,
      下一步: project.nextAction
    }))

  const workbook = XLSX.utils.book_new()
  const sheets = [
    { name: '月度总览', data: summaryRows, widths: [18, 10, 36] },
    { name: '负责人复盘', data: ownerRows, widths: [12, 10, 10, 10, 10, 10, 10] },
    { name: '阶段结构', data: stageRows, widths: [16, 10] },
    { name: '卡点项目', data: blockedRows, widths: [24, 10, 10, 12, 8, 8, 32] },
    { name: '机会池', data: opportunityRows, widths: [24, 10, 10, 12, 8, 8, 10, 8, 32] }
  ]

  sheets.forEach(sheetConfig => {
    const worksheet = XLSX.utils.json_to_sheet(sheetConfig.data)
    worksheet['!cols'] = sheetConfig.widths.map(width => ({ wch: width }))
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetConfig.name)
  })

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const dateStr = new Date().toISOString().split('T')[0]
  saveAs(blob, `${filename || '胶原项目月度复盘'}_${dateStr}.xlsx`)
}
