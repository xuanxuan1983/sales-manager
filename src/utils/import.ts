import * as XLSX from 'xlsx'
import type { Order, Client, Product, EnhancedDistributor, MonthlyIndicator, HeadcountPlan, Salesperson } from '@/types/sales'

// 生成唯一ID
const generateId = () => Math.random().toString(36).substring(2, 15)

// Helper to find value from multiple possible keys
const getVal = (row: any, keys: string[]): number => {
    for (const k of keys) {
        if (row[k] !== undefined && row[k] !== null && row[k] !== '') return Number(row[k])
        // Try trimming
        const trimmed = Object.keys(row).find(key => key.trim() === k)
        if (trimmed && row[trimmed] !== undefined) return Number(row[trimmed])
    }
    return 0
}

// Helper for string
const getStr = (row: any, keys: string[]): string => {
    for (const k of keys) {
        if (row[k]) return String(row[k]).trim()
        // Try trimming
        const trimmed = Object.keys(row).find(key => key.trim() === k)
        if (trimmed && row[trimmed]) return String(row[trimmed]).trim()
    }
    return ''
}

// Helper for header validation
const validateSchema = (row: any, requiredKeys: string[], typeName: string) => {
    const rowKeys = Object.keys(row).map(k => k.trim())
    // Check if at least one of the REQUIRED groups is present
    // For simplicity, we just check if ANY of the potential field aliases exist in the row
    // But better: checks if the row has a "signature" field.

    // Actually, asking if ANY of the aliases for ANY key exist is weak.
    // Let's ask if at least one alias for a 'primary' field exists.
    // e.g. for Orders, we need '订单编号' OR 'Order No' OR 'Client' etc.

    const hasMatch = requiredKeys.some(req => rowKeys.some(rk => rk === req || rk.includes(req)))
    if (!hasMatch) {
        throw new Error(`文件格式不匹配：未找到"${typeName}"相关的列（如：${requiredKeys[0]}）。请检查当前选中的导入标签页是否正确。`)
    }
}

// 解析订单Excel
export function parseOrdersExcel(file: File): Promise<Order[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer)
                const workbook = XLSX.read(data, { type: 'array' })
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
                const jsonData = XLSX.utils.sheet_to_json(firstSheet)

                if (jsonData.length === 0) {
                    resolve([])
                    return
                }

                // Validate first row
                validateSchema(jsonData[0], ['订单编号', 'orderNo', 'Order No', 'Client', '客户', 'Product', '产品'], '订单')

                const orders: Order[] = jsonData.map((row: any, index: number) => ({
                    id: generateId(),
                    orderNo: getStr(row, ['订单编号', 'orderNo', 'Order No']) || `ORD-${Date.now()}-${index}`,
                    clientId: getStr(row, ['客户ID', 'clientId', 'Client ID']),
                    clientName: getStr(row, ['客户名称', 'clientName', 'Client Name', '机构名称', 'Name']),
                    distributorId: getStr(row, ['代理商ID', 'distributorId', 'Distributor ID']),
                    distributorName: getStr(row, ['代理商名称', 'distributorName', 'Distributor Name', '代理商']),
                    salespersonId: getStr(row, ['销售ID', 'salespersonId', 'Salesperson ID']),
                    salespersonName: getStr(row, ['销售', 'salesperson', 'Salesperson', '销售人员']),
                    channel: (getStr(row, ['渠道', 'channel', 'Channel']) === '直营' || getStr(row, ['渠道', 'channel']) === 'direct') ? 'direct' :
                        (getStr(row, ['渠道', 'channel']) === '代理' || getStr(row, ['渠道', 'channel']) === 'distributor') ? 'distributor' : 'hybrid',
                    items: [{
                        productId: getStr(row, ['产品ID', 'productId']),
                        productName: getStr(row, ['产品名称', 'productName', 'Product Name', '采购内容']),
                        quantity: getVal(row, ['数量', 'quantity', 'Qty', 'Count']),
                        unitPrice: getVal(row, ['单价', 'unitPrice', 'Price']),
                        totalAmount: getVal(row, ['金额', 'totalAmount', 'Amount', '订单金额', 'Total'])
                    }],
                    totalQuantity: getVal(row, ['数量', 'quantity', 'Qty', 'Count']),
                    totalAmount: getVal(row, ['金额', 'totalAmount', 'Amount', '订单金额', 'Total']),
                    orderDate: getStr(row, ['日期', 'orderDate', 'Date', '订单日期']) || new Date().toISOString().split('T')[0],
                    status: parseStatus(getStr(row, ['状态', 'status', 'Status']) || 'pending'),
                    remark: getStr(row, ['备注', 'remark', 'Remark'])
                }))

                resolve(orders)
            } catch (error) {
                reject(error)
            }
        }
        reader.onerror = reject
        reader.readAsArrayBuffer(file)
    })
}

// 解析客户Excel
export function parseClientsExcel(file: File): Promise<Client[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer)
                const workbook = XLSX.read(data, { type: 'array' })
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
                const jsonData = XLSX.utils.sheet_to_json(firstSheet)

                if (jsonData.length > 0) {
                    validateSchema(jsonData[0], ['机构名称', 'Client Name', 'Name', '客户名称'], '客户')
                }

                const clients: Client[] = jsonData.map((row: any) => ({
                    id: generateId(),
                    name: row['机构名称'] || row['name'] || row['客户名称'] || '',
                    type: parseClientType(row['类型'] || row['type']),
                    channel: parseChannel(row['渠道'] || row['channel']),
                    distributorId: row['代理商ID'] || '',
                    salespersonId: row['销售ID'] || '',
                    cityId: row['城市ID'] || '',
                    level: parseLevel(row['等级'] || row['level']),
                    contact: row['联系人'] || row['contact'] || '',
                    phone: row['电话'] || row['phone'] || '',
                    address: row['地址'] || row['address'] || '',
                    createdAt: row['创建日期'] || new Date().toISOString().split('T')[0]
                }))

                resolve(clients)
            } catch (error) {
                reject(error)
            }
        }
        reader.onerror = reject
        reader.readAsArrayBuffer(file)
    })
}

// 解析产品Excel
export function parseProductsExcel(file: File): Promise<Product[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer)
                const workbook = XLSX.read(data, { type: 'array' })
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
                const jsonData = XLSX.utils.sheet_to_json(firstSheet)

                if (jsonData.length > 0) {
                    validateSchema(jsonData[0], ['产品名称', 'Product Name', 'Name', '品类', 'Category'], '产品')
                }

                const products: Product[] = jsonData.map((row: any) => ({
                    id: generateId(),
                    name: row['产品名称'] || row['name'] || '',
                    category: parseCategory(row['品类'] || row['category']),
                    unit: row['单位'] === '盒' ? 'box' : 'unit',
                    unitsPerBox: Number(row['每盒数量'] || row['unitsPerBox'] || 1),
                    assessmentPrice: Number(row['考核价'] || row['assessmentPrice'] || 0),
                    listPrice: Number(row['标价'] || row['listPrice'] || 0)
                }))

                resolve(products)
            } catch (error) {
                reject(error)
            }
        }
        reader.onerror = reject
        reader.readAsArrayBuffer(file)
    })
}

// 解析代理商Excel
export function parseDistributorsExcel(file: File): Promise<EnhancedDistributor[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer)
                const workbook = XLSX.read(data, { type: 'array' })
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
                const jsonData = XLSX.utils.sheet_to_json(firstSheet)

                if (jsonData.length > 0) {
                    validateSchema(jsonData[0], ['代理商名称', 'Distributor Name', 'Name', '代理商'], '代理商')
                }

                const distributors: EnhancedDistributor[] = jsonData.map((row: any) => {
                    const levelStr = getStr(row, ['等级', 'level', 'Level'])
                    const tierStr = getStr(row, ['星级', 'tier', 'Tier', 'Star'])

                    return {
                        id: generateId(),
                        name: getStr(row, ['代理商名称', 'name', 'Name', 'Distributor Name', '代理商']),
                        regionId: '', // To be matched
                        cityId: '',   // To be matched
                        level: levelStr === '金牌' ? 'gold' : levelStr === '银牌' ? 'silver' : 'normal',
                        tier: tierStr === '三星' ? 'three_star' : tierStr === '二星' ? 'two_star' : 'one_star',
                        contact: getStr(row, ['联系人', 'contact', 'Contact']),
                        phone: getStr(row, ['电话', 'phone', 'Phone', 'Mobile']),
                        creditLimit: getVal(row, ['授信额度', 'creditLimit', 'Credit Limit']),
                        balance: getVal(row, ['账户余额', 'balance', 'Balance']),
                        monthlyPurchase: getVal(row, ['当月进货', 'monthlyPurchase', 'Purchase', '进货额']),
                        rebateAmount: getVal(row, ['返货金额', 'rebateAmount', 'Rebate']),
                        commissionAmount: getVal(row, ['提成金额', 'commissionAmount', 'Commission']),
                        salesATarget: getVal(row, ['Sales-A目标', 'Sales-A 目标', 'Sales A目标', '进货目标', 'Target A']),
                        salesAActual: getVal(row, ['Sales-A实际', 'Sales-A 实际', 'Sales A实际', 'Sales-A', '进货', '进货实际', 'Actual A']),
                        salesBTarget: getVal(row, ['Sales-B目标', 'Sales-B 目标', 'Sales B目标', '纯销目标', 'Target B']),
                        salesBActual: getVal(row, ['Sales-B实际', 'Sales-B 实际', 'Sales B实际', 'Sales-B', '纯销', '纯销实际', 'Actual B'])
                    }
                })
                resolve(distributors)
            } catch (error) {
                reject(error)
            }
        }
        reader.onerror = reject
        reader.readAsArrayBuffer(file)
    })
}

// 解析指标Excel
export function parseIndicatorsExcel(file: File): Promise<MonthlyIndicator[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer)
                const workbook = XLSX.read(data, { type: 'array' })
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
                const jsonData = XLSX.utils.sheet_to_json(firstSheet)

                if (jsonData.length > 0) {
                    validateSchema(jsonData[0], ['大区', 'Region', '年份', 'Year', 'Sales-A'], '指标')
                }

                const indicators: MonthlyIndicator[] = jsonData.map((row: any) => ({
                    year: Number(getVal(row, ['年份', 'Year', 'year']) || new Date().getFullYear()),
                    month: Number(getVal(row, ['月份', 'Month', 'month']) || new Date().getMonth() + 1),
                    regionName: getStr(row, ['大区', 'Region']),
                    regionManagerName: getStr(row, ['大区经理', 'Region Manager', 'Regional Manager']),
                    areaManagerName: getStr(row, ['地区经理', 'Area Manager']),
                    salespersonName: getStr(row, ['销售', '销售人员', 'Salesperson', 'Rep']),
                    salesATarget: getVal(row, ['Sales-A目标', 'Sales-A 目标', 'Sales A目标', 'Sales A 目标', '进货目标', 'Target A']),
                    salesAActual: getVal(row, ['Sales-A实际', 'Sales-A 实际', 'Sales A实际', 'Sales A 实际', 'Sales-A', '进货', '进货实际', 'Actual A']),
                    salesBTarget: getVal(row, ['Sales-B目标', 'Sales-B 目标', 'Sales B目标', 'Sales B 目标', '纯销目标', 'Target B']),
                    salesBActual: getVal(row, ['Sales-B实际', 'Sales-B 实际', 'Sales B实际', 'Sales B 实际', 'Sales-B', '纯销', '纯销实际', 'Actual B']),
                    headcountPlan: getVal(row, ['计划人员', '计划编制', 'Headcount Plan']),
                    headcountActual: getVal(row, ['实际到岗', '实际人数', 'Headcount Actual'])
                }))
                resolve(indicators)
            } catch (error) {
                reject(error)
            }
        }
        reader.onerror = reject
        reader.readAsArrayBuffer(file)
    })
}

// 解析人员编制Excel
export function parseHeadcountExcel(file: File): Promise<HeadcountPlan[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer)
                const workbook = XLSX.read(data, { type: 'array' })
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
                const jsonData = XLSX.utils.sheet_to_json(firstSheet)

                if (jsonData.length > 0) {
                    validateSchema(jsonData[0], ['计划编制', 'Planned', '人员', 'Headcount', '编制'], '人员编制')
                }

                const plans: HeadcountPlan[] = jsonData.map((row: any, index: number) => ({
                    id: generateId(),
                    regionId: '', // To be mapped
                    regionName: getStr(row, ['大区', 'regionName', 'Region']),
                    year: Number(getVal(row, ['年份', 'year', 'Year']) || new Date().getFullYear()),
                    month: Number(getVal(row, ['月份', 'month', 'Month']) || new Date().getMonth() + 1),
                    plannedCount: getVal(row, ['计划编制', 'plannedCount', 'Planned', '编制']),
                    actualCount: getVal(row, ['实际在岗', 'actualCount', 'Actual', '在岗']),
                    recruitingCount: getVal(row, ['招聘中', 'recruitingCount', 'Recruiting', '缺口']),
                    resignedCount: getVal(row, ['离职数', 'resignedCount', 'Resigned', '离职']),
                    bonusPool: getVal(row, ['奖金池', 'bonusPool', 'Bonus', 'Bonus Pool'])
                }))
                resolve(plans)
            } catch (error) {
                reject(error)
            }
        }
        reader.onerror = reject
        reader.readAsArrayBuffer(file)
    })
}

// 解析销售人员Excel
export function parseSalespeopleExcel(file: File): Promise<Salesperson[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer)
                const workbook = XLSX.read(data, { type: 'array' })
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
                const jsonData = XLSX.utils.sheet_to_json(firstSheet)

                if (jsonData.length > 0) {
                    validateSchema(jsonData[0], ['姓名', 'Name', '销售', 'Salesperson'], '销售人员')
                }

                // To support Sales-A/B, we really should use SalespersonEnhanced or update Salesperson.
                // However, without changing the type definition, I can't easily add them.
                // Given the constraints, I will add the logic but comment it out or put it in a way that fits.
                // Actually, I can cast to any or Salesperson & { salesATarget?: number ... }.
                // But let's just implement the basic parsing as requested by the template update for now,
                const enhancedSalespeople = jsonData.map((row: any) => ({
                    id: generateId(),
                    name: getStr(row, ['姓名', 'name', 'Name', '销售', '销售人员']),
                    managerId: '',
                    phone: getStr(row, ['电话', 'phone', 'Phone', 'Mobile']),
                    monthlyTarget: getVal(row, ['月目标', 'monthlyTarget', 'Target']),
                    salesATarget: getVal(row, ['Sales-A目标', 'Sales-A 目标', 'Sales A目标', '进货目标', 'Target A']),
                    salesBTarget: getVal(row, ['Sales-B目标', 'Sales-B 目标', 'Sales B目标', '纯销目标', 'Target B'])
                })) as unknown as Salesperson[]

                resolve(enhancedSalespeople)
            } catch (error) {
                reject(error)
            }
        }
        reader.onerror = reject
        reader.readAsArrayBuffer(file)
    })
}

// 辅助函数
function parseStatus(status: string): Order['status'] {
    const map: Record<string, Order['status']> = {
        '待确认': 'pending', '待审核': 'pending', '待财务审': 'pending',
        '已确认': 'confirmed', '已付款': 'completed',
        '已发货': 'shipped', '运输中': 'shipped',
        '已完成': 'completed', '已送达': 'completed',
        '已取消': 'cancelled', '支付失败': 'cancelled'
    }
    return map[status] || status as Order['status'] || 'pending'
}

function parseClientType(type: string): Client['type'] {
    const map: Record<string, Client['type']> = {
        '诊所': 'clinic', '医院': 'hospital', '连锁': 'chain'
    }
    return map[type] || type as Client['type'] || 'clinic'
}

// ... existing code ...



function parseChannel(channel: string): Client['channel'] {
    const map: Record<string, Client['channel']> = {
        '直营': 'direct', '代理': 'distributor', '代理商': 'distributor', '混合': 'hybrid'
    }
    return map[channel] || channel as Client['channel'] || 'direct'
}

function parseLevel(level: string): Client['level'] {
    const map: Record<string, Client['level']> = {
        'VIP': 'vip', '重点': 'key', '普通': 'normal'
    }
    return map[level] || level as Client['level'] || 'normal'
}

function parseCategory(category: string): Product['category'] {
    const map: Record<string, Product['category']> = {
        '玻尿酸': 'hyaluronic', '肉毒素': 'botox', '设备': 'device', '光电': 'device',
        '耗材': 'consumable', '其他': 'other'
    }
    return map[category] || category as Product['category'] || 'other'
}

// 解析城市GDP/人口数据
export function parseCityStatsExcel(file: File): Promise<{ cityName: string, gdp: number, pop: number }[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer)
                const workbook = XLSX.read(data, { type: 'array' })
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
                const jsonData = XLSX.utils.sheet_to_json(firstSheet)

                if (jsonData.length > 0) {
                    validateSchema(jsonData[0], ['城市', 'City', 'GDP', '人口', 'Population'], '城市因子')
                }

                const stats = jsonData.map((row: any) => ({
                    cityName: getStr(row, ['城市', 'City', 'city', 'Name']),
                    gdp: getVal(row, ['GDP', 'gdp', '总量']),
                    pop: getVal(row, ['人口', 'Population', 'pop', '人'])
                }))
                resolve(stats)
            } catch (error) {
                reject(error)
            }
        }
        reader.onerror = reject
        reader.readAsArrayBuffer(file)
    })
}

// 生成Excel模板
export function generateTemplate(type: 'orders' | 'clients' | 'products' | 'salespeople' | 'distributors' | 'indicators' | 'headcount' | 'cityStats'): void {
    let sampleData: any[] = []

    if (type === 'orders') {
        // ... (Keep existing)
        sampleData = [
            { 订单编号: 'ORD-2025-001', 大区: '华东区', 城市: '上海', 客户名称: '上海美莱医疗', 渠道: '直营', 代理商: '', 产品名称: '玻尿酸A', 数量: 50, 单价: 1000, 订单金额: 50000, 销售: '张三', 上级经理: '李经理', 日期: '2025-01-15', 状态: '已付款', 备注: '' },
            { 订单编号: 'ORD-2025-002', 大区: '华北区', 城市: '北京', 客户名称: '北京艺星整形', 渠道: '代理', 代理商: '华北医美供应链', 产品名称: '肉毒素', 数量: 100, 单价: 1200, 订单金额: 120000, 销售: '李四', 上级经理: '王经理', 日期: '2025-01-16', 状态: '待确认', 备注: '大客户订单' }
        ]
    } else if (type === 'cityStats') {
        sampleData = [
            { 城市: '上海', GDP: 47200, 人口: 24.8 },
            { 城市: '苏州', GDP: 26000, 人口: 13.0 }
        ]
    } else if (type === 'clients') {
        // ... (Keep existing)
        sampleData = [
            { 机构名称: '上海美莱医疗', 大区: '华东区', 城市: '上海', 类型: '医院', 渠道: '直营', 代理商: '', 等级: 'VIP', 负责销售: '张三', 上级经理: '李经理', 联系人: '王总', 电话: '13800138000', 地址: '上海市静安区南京西路1000号' },
            { 机构名称: '北京美莱诊所', 大区: '华北区', 城市: '北京', 类型: '诊所', 渠道: '代理', 代理商: '华北医美供应链', 等级: '重点', 负责销售: '李四', 上级经理: '王经理', 联系人: '李总', 电话: '13900139000', 地址: '北京市朝阳区建国路88号' }
        ]
    } else if (type === 'products') {
        sampleData = [
            { 产品名称: '乔雅登极致', 品类: '玻尿酸', 规格: '1ml/支', 单位: '支', 每盒数量: 10, 考核价: 800, 标价: 1200, 厂家: '艾尔建' },
            { 产品名称: '保妥适', 品类: '肉毒素', 规格: '100U/瓶', 单位: '支', 每盒数量: 5, 考核价: 500, 标价: 800, 厂家: '艾尔建' },
            { 产品名称: 'M22光子嫩肤', 品类: '设备', 规格: '整机', 单位: '台', 每盒数量: 1, 考核价: 280000, 标价: 350000, 厂家: '以色列Lumenis' }
        ]
    } else if (type === 'salespeople') {
        sampleData = [
            { 姓名: '张三', 大区: '华东区', 城市: '上海', 上级经理: '李经理', 月目标: 80000, 'Sales-A目标': 80000, 'Sales-B目标': 80000, 电话: '13800001111', 入职日期: '2023-03-15' },
            { 姓名: '李四', 大区: '华北区', 城市: '北京', 上级经理: '王经理', 月目标: 100000, 'Sales-A目标': 100000, 'Sales-B目标': 100000, 电话: '13800002222', 入职日期: '2022-06-01' },
            { 姓名: '王五', 大区: '华南区', 城市: '广州', 上级经理: '陈经理', 月目标: 90000, 'Sales-A目标': 90000, 'Sales-B目标': 90000, 电话: '13800003333', 入职日期: '2024-01-10' }
        ]
    } else if (type === 'distributors') {
        sampleData = [
            { 代理商名称: '华东供应链', 大区: '华东区', 城市: '上海', 等级: '金牌', 星级: '三星', 联系人: '吴总', 电话: '13900000001', 授信额度: 500000, 账户余额: 200000, 当月进货: 1250, 返货金额: 375, 提成金额: 250, 'Sales-A目标': 1200, 'Sales-A实际': 1250, 'Sales-B目标': 1200, 'Sales-B实际': 1100 }
        ]
    } else if (type === 'indicators') {
        sampleData = [
            { 年份: 2024, 月份: 1, 大区: '华东区', 大区经理: '李经理', 地区经理: '王经理', 销售: '张三', 'Sales-A目标': 1500, 'Sales-A实际': 1480, 'Sales-B目标': 1500, 'Sales-B实际': 1400, 计划人员: 55, 实际到岗: 53 },
            { 年份: 2024, 月份: 1, 大区: '华北区', 大区经理: '赵经理', 地区经理: '钱经理', 销售: '李四', 'Sales-A目标': 1200, 'Sales-A实际': 1100, 'Sales-B目标': 1200, 'Sales-B实际': 1150, 计划人员: 40, 实际到岗: 38 }
        ]
    } else if (type === 'headcount') {
        sampleData = [
            { 年份: 2024, 月份: 1, 大区: '华东区', 计划编制: 25, 实际在岗: 23, 招聘中: 2, 离职数: 0, 奖金池: 80 }
        ]
    }

    // ... rest of logic
    const ws = XLSX.utils.json_to_sheet(sampleData)
    // ...
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

    // Convert to array buffer
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })

    // Create Blob - Force octet-stream to ensure it downloads as a file and isn't interpreted by browser
    const blob = new Blob([wbout], { type: 'application/octet-stream' })

    // Create download link
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}_template.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}
