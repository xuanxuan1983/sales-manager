<script setup lang="ts">
import { ref } from 'vue'
import { useMedicalSalesStore } from '@/stores/medicalSales'
import { 
  parseOrdersExcel, parseClientsExcel, parseProductsExcel, parseSalespeopleExcel,
  parseDistributorsExcel, parseIndicatorsExcel, parseHeadcountExcel,
  generateTemplate 
} from '@/utils/import'
import { ElMessage, ElMessageBox } from 'element-plus'

const store = useMedicalSalesStore()
const uploading = ref(false)
const activeTab = ref<'orders' | 'clients' | 'products' | 'salespeople' | 'distributors' | 'indicators' | 'headcount'>('orders')

const fileInputRef = ref<HTMLInputElement | null>(null)

const handleImport = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  uploading.value = true
  try {
    let count = 0
    if (activeTab.value === 'orders') {
      const orders = await parseOrdersExcel(file)
      count = store.importOrders(orders)
    } else if (activeTab.value === 'clients') {
      const clients = await parseClientsExcel(file)
      count = store.importClients(clients)
    } else if (activeTab.value === 'products') {
      const products = await parseProductsExcel(file)
      count = store.importProducts(products)
    } else if (activeTab.value === 'salespeople') {
      const salespeople = await parseSalespeopleExcel(file)
      count = store.importSalespeople(salespeople)
    } else if (activeTab.value === 'distributors') {
        const distributors = await parseDistributorsExcel(file)
        count = store.importDistributors(distributors)
    } else if (activeTab.value === 'indicators') {
        const indicators = await parseIndicatorsExcel(file)
        count = store.importIndicators(indicators)
    } else if (activeTab.value === 'headcount') {
        const plans = await parseHeadcountExcel(file)
        count = store.importHeadcountPlans(plans)
    }
    ElMessage.success(`成功导入 ${count} 条数据`)
  } catch (error: any) {
    ElMessage.error(error.message || '导入失败，请检查文件格式')
    console.error(error)
  } finally {
    uploading.value = false
    target.value = ''
  }
}

const handleDownloadTemplate = () => {
  generateTemplate(activeTab.value)
  ElMessage.success('模板已下载')
}

const handleClear = async () => {
  try {
    await ElMessageBox.confirm('确定要清空当前数据吗？此操作不可恢复。', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    if (activeTab.value === 'orders') store.clearOrders()
    else if (activeTab.value === 'clients') store.clearClients()
    else if (activeTab.value === 'products') store.clearProducts()
    else if (activeTab.value === 'distributors') store.clearDistributors()
    else if (activeTab.value === 'indicators') store.clearIndicators()
    else if (activeTab.value === 'headcount') store.clearHeadcountPlans()
    ElMessage.success('数据已清空')
  } catch { /* cancelled */ }
}

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const dataStats = {
  orders: { label: '订单', count: () => store.orders.length, icon: '📋' },
  clients: { label: '客户', count: () => store.clients.length, icon: '🏥' },
  products: { label: '产品', count: () => store.products.length, icon: '📦' },
  salespeople: { label: '销售', count: () => store.salespeople.length, icon: '👔' },
  distributors: { label: '代理商', count: () => store.distributors.length, icon: '🤝' },
  indicators: { label: '指标', count: () => store.indicators.length, icon: '📈' },
  headcount: { label: '人员', count: () => store.headcountPlans.length, icon: '👥' }
}
</script>

<template>
  <div class="data-management">
    <div class="page-header">
      <div>
        <h1 class="page-title">数据导入中心</h1>
        <p class="page-subtitle">通过 Excel 文件批量导入订单、客户、产品及运营数据</p>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-row">
      <div 
        v-for="(stat, key) in dataStats" 
        :key="key" 
        class="stat-card" 
        :class="{ active: activeTab === key }"
        @click="activeTab = key as any"
      >
        <div class="stat-icon">{{ stat.icon }}</div>
        <div class="stat-info">
          <div class="stat-label">{{ stat.label }}数据</div>
          <div class="stat-value">{{ stat.count() }} 条</div>
        </div>
      </div>
    </div>

    <!-- Import Section -->
    <div class="import-section">
      <div class="import-card">
        <h3>📥 导入 {{ dataStats[activeTab].label }}数据</h3>
        <p class="import-desc">
          上传 Excel 文件 (.xlsx, .xls) 自动解析并导入系统。支持中文列名。
        </p>

        <div class="import-steps">
          <div class="step">
            <span class="step-num">1</span>
            <span>下载模板填写数据</span>
          </div>
          <div class="step">
            <span class="step-num">2</span>
            <span>上传 Excel 文件</span>
          </div>
          <div class="step">
            <span class="step-num">3</span>
            <span>数据自动解析入库</span>
          </div>
        </div>

        <div class="action-row">
          <button class="btn btn-outline" @click="handleDownloadTemplate">
            📄 下载模板
          </button>
          <button class="btn btn-primary" :disabled="uploading" @click="triggerFileInput">
            {{ uploading ? '导入中...' : '📤 上传 Excel' }}
          </button>
          <button class="btn btn-danger" @click="handleClear">
            🗑️ 清空数据
          </button>
        </div>

        <input 
          ref="fileInputRef"
          type="file" 
          accept=".xlsx,.xls" 
          style="display: none"
          @change="handleImport"
        />
      </div>

      <!-- Column Mapping -->
      <div class="mapping-card">
        <h3>📊 字段对照表</h3>
        <table class="mapping-table" v-if="activeTab === 'orders'">
          <thead><tr><th>Excel 列名</th><th>说明</th></tr></thead>
          <tbody>
            <tr><td>订单编号</td><td>唯一订单号</td></tr>
            <tr><td>大区</td><td>华东区/华北区/华南区等</td></tr>
            <tr><td>城市</td><td>客户所在城市</td></tr>
            <tr><td>客户名称</td><td>医美机构名称</td></tr>
            <tr><td>渠道</td><td>直营/代理</td></tr>
            <tr><td>代理商</td><td>若代理渠道,填代理商名称</td></tr>
            <tr><td>产品名称</td><td>采购产品</td></tr>
            <tr><td>数量</td><td>采购数量</td></tr>
            <tr><td>单价</td><td>产品单价</td></tr>
            <tr><td>订单金额</td><td>订单总金额</td></tr>
            <tr><td>销售</td><td>负责销售人员</td></tr>
            <tr><td>上级经理</td><td>销售的上级经理</td></tr>
            <tr><td>日期</td><td>订单日期 YYYY-MM-DD</td></tr>
            <tr><td>状态</td><td>待确认/已付款/运输中</td></tr>
          </tbody>
        </table>
        <table class="mapping-table" v-else-if="activeTab === 'clients'">
          <thead><tr><th>Excel 列名</th><th>说明</th></tr></thead>
          <tbody>
            <tr><td>机构名称</td><td>医美机构全称</td></tr>
            <tr><td>大区</td><td>华东区/华北区/华南区等</td></tr>
            <tr><td>城市</td><td>所在城市</td></tr>
            <tr><td>类型</td><td>诊所/医院/连锁</td></tr>
            <tr><td>渠道</td><td>直营/代理</td></tr>
            <tr><td>代理商</td><td>若代理渠道,填代理商名称</td></tr>
            <tr><td>等级</td><td>VIP/重点/普通</td></tr>
            <tr><td>负责销售</td><td>对接的销售人员</td></tr>
            <tr><td>上级经理</td><td>销售的上级经理</td></tr>
            <tr><td>联系人</td><td>机构联系人</td></tr>
            <tr><td>电话</td><td>联系电话</td></tr>
            <tr><td>地址</td><td>机构地址</td></tr>
          </tbody>
        </table>
        <table class="mapping-table" v-else-if="activeTab === 'products'">
          <thead><tr><th>Excel 列名</th><th>说明</th></tr></thead>
          <tbody>
            <tr><td>产品名称</td><td>产品全称</td></tr>
            <tr><td>品类</td><td>玻尿酸/肉毒素/设备/耗材</td></tr>
            <tr><td>规格</td><td>如 1ml/支</td></tr>
            <tr><td>单位</td><td>支/盒/台</td></tr>
            <tr><td>每盒数量</td><td>每盒包含数量</td></tr>
            <tr><td>考核价</td><td>销售考核单价</td></tr>
            <tr><td>标价</td><td>对外销售价</td></tr>
            <tr><td>厂家</td><td>生产厂家</td></tr>
          </tbody>
        </table>
        <table class="mapping-table" v-else-if="activeTab === 'distributors'">
            <thead><tr><th>Excel 列名</th><th>说明</th></tr></thead>
            <tbody>
                <tr><td>代理商名称</td><td>公司全称</td></tr>
                <tr><td>等级</td><td>金牌/银牌</td></tr>
                <tr><td>星级</td><td>三星/二星/一星</td></tr>
                <tr><td>授信额度</td><td>信用额度限制</td></tr>
                <tr><td>当月进货</td><td>本月实际进货额</td></tr>
                <tr><td>Sales-A目标</td><td>进货目标</td></tr>
                <tr><td>Sales-B目标</td><td>纯销目标</td></tr>
            </tbody>
        </table>
        <table class="mapping-table" v-else-if="activeTab === 'indicators'">
            <thead><tr><th>Excel 列名</th><th>说明</th></tr></thead>
            <tbody>
                <tr><td>年份</td><td>2024</td></tr>
                <tr><td>月份</td><td>1-12</td></tr>
                <tr><td>大区</td><td>所属大区</td></tr>
                <tr><td>大区经理</td><td>大区负责人姓名</td></tr>
                <tr><td>地区经理</td><td>地区/城市经理姓名</td></tr>
                <tr><td>销售</td><td>销售代表姓名</td></tr>
                <tr><td>Sales-A目标</td><td>进货目标</td></tr>
                <tr><td>Sales-A实际</td><td>进货实际</td></tr>
                <tr><td>Sales-B目标</td><td>纯销目标</td></tr>
                <tr><td>Sales-B实际</td><td>纯销实际</td></tr>
                <tr><td>计划人员</td><td>编制人数</td></tr>
            </tbody>
        </table>
        <table class="mapping-table" v-else-if="activeTab === 'headcount'">
            <thead><tr><th>Excel 列名</th><th>说明</th></tr></thead>
            <tbody>
                <tr><td>年份</td><td>2024</td></tr>
                <tr><td>月份</td><td>1-12</td></tr>
                <tr><td>大区</td><td>所在大区</td></tr>
                <tr><td>计划编制</td><td>计划人数</td></tr>
                <tr><td>实际在岗</td><td>实际人数</td></tr>
                <tr><td>奖金池</td><td>奖金总额(万)</td></tr>
            </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.data-management {}

.page-header { margin-bottom: 32px; }
.page-title { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
.page-subtitle { color: #86868B; font-size: 14px; margin-top: 4px; }

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: var(--card);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}

.stat-card:hover { transform: translateY(-2px); }
.stat-card.active { border-color: #1D1D1F; }

.stat-icon { font-size: 32px; }
.stat-label { font-size: 13px; color: #86868B; }
.stat-value { font-size: 24px; font-weight: 700; }

.import-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}

.import-card, .mapping-card {
  background: var(--card);
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}

.import-card h3, .mapping-card h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
}

.import-desc {
  color: #86868B;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 24px;
}

.import-steps {
  display: flex;
  gap: 24px;
  margin-bottom: 32px;
}

.step {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}

.step-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #1D1D1F;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 13px;
}

.action-row {
  display: flex;
  gap: 12px;
}

.btn {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 14px; font-weight: 600;
  cursor: pointer; transition: all 0.2s;
  border: 1px solid #D2D2D7; background: white; color: #1D1D1F;
}
.btn:hover { background: #F5F5F7; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: #1D1D1F; color: white; border: none; }
.btn-primary:hover { background: #333; }
.btn-danger { background: #FF3B30; color: white; border: none; }
.btn-danger:hover { background: #e0342a; }
.btn-outline { background: transparent; }

.mapping-table {
  width: 100%;
  border-collapse: collapse;
}

.mapping-table th {
  text-align: left;
  font-size: 12px;
  color: #86868B;
  padding: 8px 0;
  border-bottom: 1px solid #E5E5EA;
}

.mapping-table td {
  padding: 10px 0;
  font-size: 13px;
  border-bottom: 1px solid #F5F5F7;
}

.mapping-table td:first-child {
  font-family: 'JetBrains Mono', monospace;
  background: #F9F9FB;
  padding: 8px;
  border-radius: 4px;
}

@media (max-width: 1024px) {
  .import-section { grid-template-columns: 1fr; }
}
</style>
