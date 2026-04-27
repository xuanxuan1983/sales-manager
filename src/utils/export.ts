import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import type { Order, OrderStatus, AdverseEvent } from '@/types/sales'

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
