import * as XLSX from 'xlsx'
import type {
  Order, Client, Product,
  ImportResult, ImportError, OrderStatus, ClientType, Channel, ClientLevel, ProductCategory
} from '@/types/sales'
import type {
  CollagenProjectDecision,
  CollagenProjectInstitution,
  CollagenProjectRiskLevel,
  CollagenProjectStage
} from '@/types/collagenProject'

// ============ Type-Safe Column Aliases ============
type ColumnAlias = string[]

const ORDER_ALIASES: Record<string, ColumnAlias> = {
  orderNo: ['订单编号', 'orderNo', 'Order No', '订单号'],
  clientId: ['客户ID', 'clientId', 'Client ID'],
  clientName: ['客户名称', 'clientName', 'Client Name', '机构名称', 'Name'],
  distributorId: ['代理商ID', 'distributorId', 'Distributor ID'],
  distributorName: ['代理商名称', 'distributorName', 'Distributor Name', '代理商'],
  salespersonId: ['销售ID', 'salespersonId', 'Salesperson ID'],
  salespersonName: ['销售', 'salesperson', 'Salesperson', '销售人员'],
  productId: ['产品ID', 'productId'],
  productName: ['产品名称', 'productName', 'Product Name', '采购内容'],
  quantity: ['数量', 'quantity', 'Qty', 'Count'],
  unitPrice: ['单价', 'unitPrice', 'Price'],
  totalAmount: ['金额', 'totalAmount', 'Amount', '订单金额', 'Total'],
  orderDate: ['日期', 'orderDate', 'Date', '订单日期'],
  status: ['状态', 'status', 'Status'],
  remark: ['备注', 'remark', 'Remark'],
  channel: ['渠道', 'channel', 'Channel']
}

// ============ Helper Functions ============
const generateId = () => Math.random().toString(36).substring(2, 15)

const getVal = (row: Record<string, unknown>, keys: string[]): number => {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== '') {
      const num = Number(row[k])
      if (!isNaN(num)) return num
    }
    const trimmed = Object.keys(row).find(key => key.trim() === k)
    if (trimmed && row[trimmed] !== undefined) {
      const num = Number(row[trimmed])
      if (!isNaN(num)) return num
    }
  }
  return 0
}

const getStr = (row: Record<string, unknown>, keys: string[]): string => {
  for (const k of keys) {
    if (row[k]) return String(row[k]).trim()
    const trimmed = Object.keys(row).find(key => key.trim() === k)
    if (trimmed && row[trimmed]) return String(row[trimmed]).trim()
  }
  return ''
}

const validateSchema = (row: Record<string, unknown>, requiredKeys: string[], typeName: string) => {
  const rowKeys = Object.keys(row).map(k => k.trim())
  const hasMatch = requiredKeys.some(req => rowKeys.some(rk => rk === req || rk.includes(req)))
  if (!hasMatch) {
    throw new Error(`文件格式不匹配：未找到"${typeName}"相关的列（如：${requiredKeys[0]}）。请检查当前选中的导入标签页是否正确。`)
  }
}

// ============ Status Parsers ============
function parseStatus(status: string): OrderStatus {
  const map: Record<string, OrderStatus> = {
    '待确认': 'pending', '待审核': 'pending', '待财务审': 'pending',
    '已确认': 'confirmed', '已付款': 'completed',
    '已发货': 'shipped', '运输中': 'shipped',
    '已完成': 'completed', '已送达': 'completed',
    '已取消': 'cancelled', '支付失败': 'cancelled'
  }
  return map[status] || (status as OrderStatus) || 'pending'
}

function parseClientType(type: string): ClientType {
  const map: Record<string, ClientType> = {
    '诊所': 'clinic', '医院': 'hospital', '连锁': 'chain'
  }
  return map[type] || (type as ClientType) || 'clinic'
}

function parseChannel(channel: string): Channel {
  const map: Record<string, Channel> = {
    '直营': 'direct', '代理': 'distributor', '代理商': 'distributor', '混合': 'hybrid'
  }
  return map[channel] || (channel as Channel) || 'direct'
}

function parseLevel(level: string): ClientLevel {
  const map: Record<string, ClientLevel> = {
    'VIP': 'vip', '重点': 'key', '普通': 'normal'
  }
  return map[level] || (level as ClientLevel) || 'normal'
}

function parseCategory(category: string): ProductCategory {
  const map: Record<string, ProductCategory> = {
    '胶原蛋白': 'collagen',
    '玻尿酸': 'hyaluronic', '肉毒素': 'botox', '设备': 'device', '光电': 'device',
    '耗材': 'consumable', '其他': 'other'
  }
  return map[category] || (category as ProductCategory) || 'other'
}

function parseCollagenStage(stage: string): CollagenProjectStage {
  const allowed: CollagenProjectStage[] = ['线索', '待资料', '待启动会', '已签约', '已发货', '30天追踪', '复购判断', '样板沉淀', '暂停']
  return allowed.includes(stage as CollagenProjectStage) ? stage as CollagenProjectStage : '线索'
}

function parseCollagenRisk(risk: string): CollagenProjectRiskLevel {
  const normalized = risk.replace('风险', '')
  if (normalized === '高' || normalized === '中' || normalized === '低') return normalized
  return '中'
}

function parseCollagenDecision(decision: string): CollagenProjectDecision {
  const allowed: CollagenProjectDecision[] = ['复购', '续费陪跑', '二次启动', '样板沉淀', '普通维护', '暂停观察']
  return allowed.includes(decision as CollagenProjectDecision) ? decision as CollagenProjectDecision : '普通维护'
}

// ============ Row Validation ============
function validateOrderRow(row: Record<string, unknown>, rowIndex: number): ImportError[] {
  const errors: ImportError[] = []
  const clientName = getStr(row, ORDER_ALIASES.clientName)
  if (!clientName) {
    errors.push({ row: rowIndex, field: 'clientName', value: row['客户名称'], message: '客户名称不能为空' })
  }
  const totalAmount = getVal(row, ORDER_ALIASES.totalAmount)
  if (totalAmount <= 0) {
    errors.push({ row: rowIndex, field: 'totalAmount', value: row['金额'], message: '订单金额必须大于0' })
  }
  return errors
}

// ============ Excel Parser Core ============
async function parseExcelFile(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet)
        resolve(jsonData as Record<string, unknown>[])
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// ============ Typed Import Functions ============
export async function parseOrdersExcel(file: File): Promise<ImportResult<Order>> {
  const result: ImportResult<Order> = {
    data: [],
    summary: { total: 0, success: 0, failed: 0 },
    errors: []
  }

  try {
    const jsonData = await parseExcelFile(file)
    if (jsonData.length === 0) return result

    validateSchema(jsonData[0], ['订单编号', 'orderNo', 'Order No', 'Client', '客户', 'Product', '产品'], '订单')
    result.summary.total = jsonData.length

    jsonData.forEach((row, index) => {
      const rowErrors = validateOrderRow(row, index + 1)
      if (rowErrors.length > 0) {
        result.errors.push(...rowErrors)
        result.summary.failed++
        return
      }

      const quantity = getVal(row, ORDER_ALIASES.quantity)
      const unitPrice = getVal(row, ORDER_ALIASES.unitPrice)
      const totalAmount = getVal(row, ORDER_ALIASES.totalAmount) || quantity * unitPrice

      const order: Order = {
        id: generateId(),
        orderNo: getStr(row, ORDER_ALIASES.orderNo) || `ORD-${Date.now()}-${index}`,
        clientId: getStr(row, ORDER_ALIASES.clientId),
        clientName: getStr(row, ORDER_ALIASES.clientName),
        distributorId: getStr(row, ORDER_ALIASES.distributorId) || undefined,
        distributorName: getStr(row, ORDER_ALIASES.distributorName) || undefined,
        salespersonId: getStr(row, ORDER_ALIASES.salespersonId),
        salespersonName: getStr(row, ORDER_ALIASES.salespersonName),
        channel: parseChannel(getStr(row, ORDER_ALIASES.channel)),
        items: [{
          productId: getStr(row, ORDER_ALIASES.productId),
          productName: getStr(row, ORDER_ALIASES.productName),
          quantity,
          unitPrice,
          totalAmount
        }],
        totalQuantity: quantity,
        totalAmount,
        orderDate: getStr(row, ORDER_ALIASES.orderDate) || new Date().toISOString().split('T')[0],
        status: parseStatus(getStr(row, ORDER_ALIASES.status) || 'pending'),
        remark: getStr(row, ORDER_ALIASES.remark)
      }

      result.data.push(order)
      result.summary.success++
    })
  } catch (error) {
    result.errors.push({
      row: 0,
      field: 'file',
      value: file.name,
      message: error instanceof Error ? error.message : '解析失败'
    })
    result.summary.failed = result.summary.total
  }

  return result
}

export async function parseClientsExcel(file: File): Promise<ImportResult<Client>> {
  const result: ImportResult<Client> = {
    data: [],
    summary: { total: 0, success: 0, failed: 0 },
    errors: []
  }

  try {
    const jsonData = await parseExcelFile(file)
    if (jsonData.length === 0) return result

    validateSchema(jsonData[0], ['机构名称', 'Client Name', 'Name', '客户名称'], '客户')
    result.summary.total = jsonData.length

    jsonData.forEach((row, index) => {
      const client: Client = {
        id: generateId(),
        name: getStr(row, ['机构名称', 'name', '客户名称']) || '',
        type: parseClientType(getStr(row, ['类型', 'type'])),
        channel: parseChannel(getStr(row, ['渠道', 'channel'])),
        distributorId: getStr(row, ['代理商ID', 'distributorId']) || undefined,
        salespersonId: getStr(row, ['销售ID', 'salespersonId']) || '',
        cityId: getStr(row, ['城市ID', 'cityId']) || '',
        level: parseLevel(getStr(row, ['等级', 'level'])),
        contact: getStr(row, ['联系人', 'contact']) || undefined,
        phone: getStr(row, ['电话', 'phone']) || undefined,
        address: getStr(row, ['地址', 'address']) || undefined
      }

      if (!client.name) {
        result.errors.push({ row: index + 1, field: 'name', value: '', message: '客户名称不能为空' })
        result.summary.failed++
        return
      }

      result.data.push(client)
      result.summary.success++
    })
  } catch (error) {
    result.errors.push({ row: 0, field: 'file', value: file.name, message: String(error) })
  }

  return result
}

export async function parseSalespeopleExcel(file: File): Promise<ImportResult<Record<string, unknown>>> {
  const result: ImportResult<Record<string, unknown>> = {
    data: [],
    summary: { total: 0, success: 0, failed: 0 },
    errors: []
  }
  try {
    const jsonData = await parseExcelFile(file)
    if (jsonData.length === 0) return result
    result.summary.total = jsonData.length
    // Stub: just pass through raw data
    result.data = jsonData
    result.summary.success = jsonData.length
  } catch (error) {
    result.errors.push({ row: 0, field: 'file', value: file.name, message: String(error) })
  }
  return result
}

export async function parseDistributorsExcel(file: File): Promise<ImportResult<Record<string, unknown>>> {
  const result: ImportResult<Record<string, unknown>> = {
    data: [],
    summary: { total: 0, success: 0, failed: 0 },
    errors: []
  }
  try {
    const jsonData = await parseExcelFile(file)
    if (jsonData.length === 0) return result
    result.summary.total = jsonData.length
    result.data = jsonData
    result.summary.success = jsonData.length
  } catch (error) {
    result.errors.push({ row: 0, field: 'file', value: file.name, message: String(error) })
  }
  return result
}

export async function parseIndicatorsExcel(file: File): Promise<ImportResult<Record<string, unknown>>> {
  const result: ImportResult<Record<string, unknown>> = {
    data: [],
    summary: { total: 0, success: 0, failed: 0 },
    errors: []
  }
  try {
    const jsonData = await parseExcelFile(file)
    if (jsonData.length === 0) return result
    result.summary.total = jsonData.length
    result.data = jsonData
    result.summary.success = jsonData.length
  } catch (error) {
    result.errors.push({ row: 0, field: 'file', value: file.name, message: String(error) })
  }
  return result
}

export async function parseHeadcountExcel(file: File): Promise<ImportResult<Record<string, unknown>>> {
  const result: ImportResult<Record<string, unknown>> = {
    data: [],
    summary: { total: 0, success: 0, failed: 0 },
    errors: []
  }
  try {
    const jsonData = await parseExcelFile(file)
    if (jsonData.length === 0) return result
    result.summary.total = jsonData.length
    result.data = jsonData
    result.summary.success = jsonData.length
  } catch (error) {
    result.errors.push({ row: 0, field: 'file', value: file.name, message: String(error) })
  }
  return result
}

export async function parseCityStatsExcel(file: File): Promise<{ cityName: string; gdp: number; pop: number }[]> {
  const jsonData = await parseExcelFile(file)
  return jsonData.map(row => ({
    cityName: String(row['城市'] || row['cityName'] || ''),
    gdp: Number(row['GDP'] || row['gdp'] || 0),
    pop: Number(row['人口'] || row['pop'] || row['population'] || 0)
  }))
}

export async function parseProductsExcel(file: File): Promise<ImportResult<Product>> {
  const result: ImportResult<Product> = {
    data: [],
    summary: { total: 0, success: 0, failed: 0 },
    errors: []
  }

  try {
    const jsonData = await parseExcelFile(file)
    if (jsonData.length === 0) return result

    validateSchema(jsonData[0], ['产品名称', 'Product Name', 'Name', '品类', 'Category'], '产品')
    result.summary.total = jsonData.length

    jsonData.forEach((row, index) => {
      const product: Product = {
        id: generateId(),
        name: getStr(row, ['产品名称', 'name']) || '',
        category: parseCategory(getStr(row, ['品类', 'category'])),
        unit: getStr(row, ['单位', 'unit']) === '盒' ? 'box' : 'unit',
        unitsPerBox: getVal(row, ['每盒数量', 'unitsPerBox']) || 1,
        assessmentPrice: getVal(row, ['考核价', 'assessmentPrice']) || 0,
        retailPrice: getVal(row, ['标价', 'listPrice']) || undefined,
        isUDIRequired: false,
        shelfLifeMonths: 24
      }

      if (!product.name) {
        result.errors.push({ row: index + 1, field: 'name', value: '', message: '产品名称不能为空' })
        result.summary.failed++
        return
      }

      result.data.push(product)
      result.summary.success++
    })
  } catch (error) {
    result.errors.push({ row: 0, field: 'file', value: file.name, message: String(error) })
  }

  return result
}

export async function parseCollagenProjectsExcel(file: File): Promise<ImportResult<CollagenProjectInstitution>> {
  const result: ImportResult<CollagenProjectInstitution> = {
    data: [],
    summary: { total: 0, success: 0, failed: 0 },
    errors: []
  }

  try {
    const jsonData = await parseExcelFile(file)
    if (jsonData.length === 0) return result

    validateSchema(jsonData[0], ['机构名称', '阶段', '风险', '负责人'], '胶原项目')
    result.summary.total = jsonData.length

    jsonData.forEach((row, index) => {
      const name = getStr(row, ['机构名称', '客户名称', 'name'])
      if (!name) {
        result.errors.push({ row: index + 1, field: 'name', value: '', message: '机构名称不能为空' })
        result.summary.failed++
        return
      }

      const project: CollagenProjectInstitution = {
        id: getStr(row, ['项目ID', 'id']) || `cp-${generateId()}`,
        name,
        city: getStr(row, ['城市', 'city']) || '',
        owner: getStr(row, ['负责人', 'owner', '销售']) || '',
        source: getStr(row, ['来源', 'source', '线索来源']) || '导入',
        stage: parseCollagenStage(getStr(row, ['阶段', 'stage', '当前阶段'])),
        decision: parseCollagenDecision(getStr(row, ['决策', 'decision', '后续动作'])),
        risk: parseCollagenRisk(getStr(row, ['风险', 'risk', '风险等级'])),
        score: getVal(row, ['评分', 'score', '复购分']) || 0,
        shippedAt: getStr(row, ['发货日期', 'shippedAt']) || undefined,
        day30Status: (getStr(row, ['30天状态', 'day30Status']) as CollagenProjectInstitution['day30Status']) || '未开始',
        doctorTraining: (getStr(row, ['医生培训', 'doctorTraining']) as CollagenProjectInstitution['doctorTraining']) || '未排期',
        cases: getVal(row, ['病例数', 'cases']),
        authorizedCases: getVal(row, ['授权病例数', 'authorizedCases']),
        contentCount: getVal(row, ['内容数', 'contentCount']),
        geoChange: getVal(row, ['GEO变化', 'geoChange']),
        nextAction: getStr(row, ['下一步', 'nextAction']) || ''
      }

      result.data.push(project)
      result.summary.success++
    })
  } catch (error) {
    result.errors.push({ row: 0, field: 'file', value: file.name, message: String(error) })
  }

  return result
}

// ============ Template Generator ============
export function generateTemplate(type: 'orders' | 'clients' | 'products' | 'salespeople' | 'distributors' | 'indicators' | 'headcount' | 'cityStats' | 'collagenProjects'): void {
  let sampleData: Record<string, string | number>[] = []

  const templates: Record<string, Record<string, string | number>[]> = {
    orders: [
      { 订单编号: 'ORD-2025-001', 大区: '华东区', 城市: '上海', 客户名称: '上海美莱医疗', 渠道: '直营', 代理商: '', 产品名称: '玻尿酸A', 数量: 50, 单价: 1000, 订单金额: 50000, 销售: '张三', 上级经理: '李经理', 日期: '2025-01-15', 状态: '已付款', 备注: '' },
      { 订单编号: 'ORD-2025-002', 大区: '华北区', 城市: '北京', 客户名称: '北京艺星整形', 渠道: '代理', 代理商: '华北医美供应链', 产品名称: '肉毒素', 数量: 100, 单价: 1200, 订单金额: 120000, 销售: '李四', 上级经理: '王经理', 日期: '2025-01-16', 状态: '待确认', 备注: '大客户订单' }
    ],
    clients: [
      { 机构名称: '上海美莱医疗', 大区: '华东区', 城市: '上海', 类型: '医院', 渠道: '直营', 代理商: '', 等级: 'VIP', 负责销售: '张三', 上级经理: '李经理', 联系人: '王总', 电话: '13800138000', 地址: '上海市静安区南京西路1000号' }
    ],
    products: [
      { 产品名称: '乔雅登极致', 品类: '玻尿酸', 规格: '1ml/支', 单位: '支', 每盒数量: 10, 考核价: 800, 标价: 1200, 厂家: '艾尔建' }
    ],
    salespeople: [
      { 姓名: '张三', 大区: '华东区', 城市: '上海', 上级经理: '李经理', 月目标: 80000, 'Sales-A目标': 80000, 'Sales-B目标': 80000, 电话: '13800001111', 入职日期: '2023-03-15' }
    ],
    distributors: [
      { 代理商名称: '华东供应链', 大区: '华东区', 城市: '上海', 等级: '金牌', 星级: '三星', 联系人: '吴总', 电话: '13900000001', 授信额度: 500000, 账户余额: 200000, 当月进货: 1250, 返货金额: 375, 提成金额: 250, 'Sales-A目标': 1200, 'Sales-A实际': 1250, 'Sales-B目标': 1200, 'Sales-B实际': 1100 }
    ],
    indicators: [
      { 年份: 2024, 月份: 1, 大区: '华东区', 大区经理: '李经理', 地区经理: '王经理', 销售: '张三', 'Sales-A目标': 1500, 'Sales-A实际': 1480, 'Sales-B目标': 1500, 'Sales-B实际': 1400, 计划人员: 55, 实际到岗: 53 }
    ],
    headcount: [
      { 年份: 2024, 月份: 1, 大区: '华东区', 计划编制: 25, 实际在岗: 23, 招聘中: 2, 离职数: 0, 奖金池: 80 }
    ],
    collagenProjects: [
      { 机构名称: '北京颜研所', 城市: '北京', 来源: '直营', 阶段: '样板沉淀', 负责人: '小赵', 决策: '样板沉淀', 风险: '低', 评分: 92, 发货日期: '2026-05-08', '30天状态': '已复盘', 医生培训: '已完成', 病例数: 8, 授权病例数: 5, 内容数: 18, GEO变化: 31, 下一步: '输出招商案例一页纸' },
      { 机构名称: '广州丽人诊所', 城市: '广州', 来源: '直营', 阶段: '已发货', 负责人: '小王', 决策: '二次启动', 风险: '高', 评分: 58, 发货日期: '2026-06-01', '30天状态': '未开始', 医生培训: '已排期', 病例数: 1, 授权病例数: 0, 内容数: 0, GEO变化: 0, 下一步: '重开老板和医生启动会' }
    ],
    cityStats: [
      { 城市: '上海', GDP: 47200, 人口: 24.8 }
    ]
  }

  sampleData = templates[type] || []

  const ws = XLSX.utils.json_to_sheet(sampleData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/octet-stream' })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${type}_template.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
