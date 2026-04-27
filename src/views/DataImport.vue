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
const dragOver = ref(false)
const importProgress = ref(0)
const activeTab = ref<'orders' | 'clients' | 'products' | 'salespeople' | 'distributors' | 'indicators' | 'headcount'>('orders')

const fileInputRef = ref<HTMLInputElement | null>(null)

// Recent imports log
const importLog = ref<Array<{ file: string; count: number; time: string; type: string }>>([])

const handleImport = async (file: File) => {
  if (!file) return
  
  uploading.value = true
  importProgress.value = 0
  
  try {
    let count = 0
    const result = await processFile(file)
    
    if (result) {
      count = result.count
      importLog.value.unshift({
        file: file.name,
        count,
        time: new Date().toLocaleTimeString('zh-CN'),
        type: dataStats[activeTab.value].label
      })
      ElMessage.success(`成功导入 ${count} 条数据`)
    }
  } catch (error: any) {
    ElMessage.error(error.message || '导入失败，请检查文件格式')
    console.error(error)
  } finally {
    uploading.value = false
    importProgress.value = 0
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
}

const processFile = async (file: File) => {
  if (activeTab.value === 'orders') {
    const result = await parseOrdersExcel(file)
    return { count: store.importOrders(result.data) }
  } else if (activeTab.value === 'clients') {
    const result = await parseClientsExcel(file)
    return { count: store.importClients(result.data) }
  } else if (activeTab.value === 'products') {
    const result = await parseProductsExcel(file)
    return { count: store.importProducts(result.data) }
  } else if (activeTab.value === 'salespeople') {
    const result = await parseSalespeopleExcel(file)
    return { count: store.importSalespeople(result.data as any) }
  } else if (activeTab.value === 'distributors') {
    const result = await parseDistributorsExcel(file)
    return { count: store.importDistributors(result.data as any) }
  } else if (activeTab.value === 'indicators') {
    const result = await parseIndicatorsExcel(file)
    return { count: store.importIndicators(result.data as any) }
  } else if (activeTab.value === 'headcount') {
    const result = await parseHeadcountExcel(file)
    return { count: store.importHeadcountPlans(result.data as any) }
  }
  return null
}

// Drag & Drop handlers
const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  dragOver.value = true
}

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  dragOver.value = false
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  dragOver.value = false
  
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    const file = files[0]
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      handleImport(file)
    } else {
      ElMessage.error('请上传 Excel 文件 (.xlsx, .xls)')
    }
  }
}

const handleFileInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) handleImport(file)
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
  orders: { label: '订单', count: () => store.orders.length, icon: '📋', color: '#0071E3' },
  clients: { label: '客户', count: () => store.clients.length, icon: '🏥', color: '#34C759' },
  products: { label: '产品', count: () => store.products.length, icon: '📦', color: '#FF9500' },
  salespeople: { label: '销售', count: () => store.salespeople.length, icon: '👔', color: '#AF52DE' },
  distributors: { label: '代理商', count: () => store.distributors.length, icon: '🤝', color: '#5856D6' },
  indicators: { label: '指标', count: () => store.indicators.length, icon: '📈', color: '#FF3B30' },
  headcount: { label: '人员', count: () => store.headcountPlans.length, icon: '👥', color: '#00C7BE' }
}

const acceptedFormats = '.xlsx,.xls'
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
        :style="{ '--card-color': stat.color }"
        @click="activeTab = key as any"
      >
        <div class="stat-icon" :style="{ background: stat.color + '15', color: stat.color }">{{ stat.icon }}</div>
        <div class="stat-info">
          <div class="stat-label">{{ stat.label }}数据</div>
          <div class="stat-value">{{ stat.count() }} <span class="unit">条</span></div>
        </div>
        <div v-if="activeTab === key" class="active-indicator"></div>
      </div>
    </div>

    <!-- Import Section -->
    <div class="import-section">
      <!-- Drag & Drop Zone -->
      <div class="import-card">
        <h3>📥 导入 {{ dataStats[activeTab].label }}数据</h3>
        <p class="import-desc">
          拖拽 Excel 文件到下方区域，或点击上传按钮。支持 .xlsx, .xls 格式。
        </p>

        <!-- Drag Zone -->
        <div
          class="drag-zone"
          :class="{ 'drag-over': dragOver, 'uploading': uploading }"
          @dragover="handleDragOver"
          @dragleave="handleDragLeave"
          @drop="handleDrop"
          @click="triggerFileInput"
        >
          <input 
            ref="fileInputRef"
            type="file" 
            :accept="acceptedFormats"
            style="display: none"
            @change="handleFileInput"
          />
          
          <div v-if="uploading" class="upload-progress">
            <div class="spinner"></div>
            <p class="upload-text">正在解析数据...</p>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: importProgress + '%' }"></div>
            </div>
          </div>
          
          <div v-else class="drag-content">
            <div class="drag-icon" :class="{ bounce: dragOver }">📁</div>
            <p class="drag-title">
              {{ dragOver ? '松开即可上传' : '拖拽文件到此处' }}
            </p>
            <p class="drag-subtitle">或点击选择文件</p>
            <p class="drag-formats">支持 Excel (.xlsx, .xls)</p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="action-row">
          <button class="btn btn-outline" @click.stop="handleDownloadTemplate">
            📄 下载模板
          </button>
          <button class="btn btn-danger" @click.stop="handleClear">
            🗑️ 清空数据
          </button>
        </div>

        <!-- Import Log -->
        <div v-if="importLog.length > 0" class="import-log">
          <h4>📋 最近导入记录</h4>
          <div class="log-list">
            <div v-for="(log, idx) in importLog.slice(0, 5)" :key="idx" class="log-item">
              <span class="log-time">{{ log.time }}</span>
              <span class="log-type">{{ log.type }}</span>
              <span class="log-file">{{ log.file }}</span>
              <span class="log-count">+{{ log.count }} 条</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Column Mapping -->
      <div class="mapping-card">
        <h3>📊 字段对照表</h3>
        <div class="mapping-content">
          <table class="mapping-table" v-if="activeTab === 'orders'">
            <thead><tr><th>Excel 列名</th><th>说明</th></tr></thead>
            <tbody>
              <tr><td><code>订单编号</code></td><td>唯一订单号</td></tr>
              <tr><td><code>大区</code></td><td>华东区/华北区等</td></tr>
              <tr><td><code>城市</code></td><td>客户所在城市</td></tr>
              <tr><td><code>客户名称</code></td><td>医美机构名称</td></tr>
              <tr><td><code>渠道</code></td><td>直营/代理</td></tr>
              <tr><td><code>产品名称</code></td><td>采购产品</td></tr>
              <tr><td><code>数量</code></td><td>采购数量</td></tr>
              <tr><td><code>订单金额</code></td><td>订单总金额</td></tr>
              <tr><td><code>日期</code></td><td>YYYY-MM-DD</td></tr>
              <tr><td><code>状态</code></td><td>待确认/已付款等</td></tr>
            </tbody>
          </table>
          <table class="mapping-table" v-else-if="activeTab === 'clients'">
            <thead><tr><th>Excel 列名</th><th>说明</th></tr></thead>
            <tbody>
              <tr><td><code>机构名称</code></td><td>医美机构全称</td></tr>
              <tr><td><code>大区</code></td><td>所属大区</td></tr>
              <tr><td><code>城市</code></td><td>所在城市</td></tr>
              <tr><td><code>类型</code></td><td>诊所/医院/连锁</td></tr>
              <tr><td><code>渠道</code></td><td>直营/代理</td></tr>
              <tr><td><code>等级</code></td><td>VIP/重点/普通</td></tr>
              <tr><td><code>联系人</code></td><td>机构联系人</td></tr>
              <tr><td><code>电话</code></td><td>联系电话</td></tr>
            </tbody>
          </table>
          <table class="mapping-table" v-else-if="activeTab === 'products'">
            <thead><tr><th>Excel 列名</th><th>说明</th></tr></thead>
            <tbody>
              <tr><td><code>产品名称</code></td><td>产品全称</td></tr>
              <tr><td><code>品类</code></td><td>玻尿酸/肉毒素等</td></tr>
              <tr><td><code>单位</code></td><td>支/盒/台</td></tr>
              <tr><td><code>考核价</code></td><td>销售考核单价</td></tr>
              <tr><td><code>标价</code></td><td>对外销售价</td></tr>
            </tbody>
          </table>
          <table class="mapping-table" v-else-if="activeTab === 'distributors'">
            <thead><tr><th>Excel 列名</th><th>说明</th></tr></thead>
            <tbody>
              <tr><td><code>代理商名称</code></td><td>公司全称</td></tr>
              <tr><td><code>等级</code></td><td>金牌/银牌</td></tr>
              <tr><td><code>星级</code></td><td>三星/二星/一星</td></tr>
              <tr><td><code>授信额度</code></td><td>信用额度</td></tr>
              <tr><td><code>Sales-A目标</code></td><td>进货目标</td></tr>
            </tbody>
          </table>
          <table class="mapping-table" v-else-if="activeTab === 'indicators'">
            <thead><tr><th>Excel 列名</th><th>说明</th></tr></thead>
            <tbody>
              <tr><td><code>年份</code></td><td>2024</td></tr>
              <tr><td><code>月份</code></td><td>1-12</td></tr>
              <tr><td><code>大区</code></td><td>所属大区</td></tr>
              <tr><td><code>Sales-A目标</code></td><td>进货目标</td></tr>
              <tr><td><code>Sales-A实际</code></td><td>进货实际</td></tr>
              <tr><td><code>Sales-B目标</code></td><td>纯销目标</td></tr>
              <tr><td><code>Sales-B实际</code></td><td>纯销实际</td></tr>
            </tbody>
          </table>
          <table class="mapping-table" v-else-if="activeTab === 'headcount'">
            <thead><tr><th>Excel 列名</th><th>说明</th></tr></thead>
            <tbody>
              <tr><td><code>年份</code></td><td>2024</td></tr>
              <tr><td><code>月份</code></td><td>1-12</td></tr>
              <tr><td><code>大区</code></td><td>所在大区</td></tr>
              <tr><td><code>计划编制</code></td><td>计划人数</td></tr>
              <tr><td><code>实际在岗</code></td><td>实际人数</td></tr>
            </tbody>
          </table>
          <table class="mapping-table" v-else>
            <thead><tr><th>Excel 列名</th><th>说明</th></tr></thead>
            <tbody>
              <tr><td><code>姓名</code></td><td>销售人员姓名</td></tr>
              <tr><td><code>大区</code></td><td>所属大区</td></tr>
              <tr><td><code>城市</code></td><td>所在城市</td></tr>
              <tr><td><code>上级经理</code></td><td>直属经理</td></tr>
              <tr><td><code>月目标</code></td><td>月度销售目标</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap');

.data-management {
  font-family: 'Inter', -apple-system, sans-serif;
}

.page-header { margin-bottom: 28px; }
.page-title { font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
.page-subtitle { color: #86868B; font-size: 14px; margin-top: 4px; }

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 28px;
}

.stat-card {
  background: var(--card);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid transparent;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  position: relative;
  overflow: hidden;
}

.stat-card:hover { 
  transform: translateY(-3px); 
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
}

.stat-card.active { 
  border-color: var(--card-color, #1D1D1F);
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
}

.active-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--card-color, #1D1D1F);
  border-radius: 3px 3px 0 0;
}

.stat-icon { 
  font-size: 28px; 
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
}

.stat-card:hover .stat-icon {
  transform: scale(1.1);
}

.stat-label { font-size: 12px; color: #86868B; font-weight: 500; }
.stat-value { font-size: 22px; font-weight: 700; color: #1D1D1F; }
.stat-value .unit { font-size: 13px; color: #86868B; font-weight: 500; }

/* Import Section */
.import-section {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 24px;
}

.import-card, .mapping-card {
  background: var(--card);
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.04);
}

.import-card h3, .mapping-card h3 {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 8px;
}

.import-desc {
  color: #86868B;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 24px;
}

/* Drag Zone */
.drag-zone {
  border: 2px dashed #D2D2D7;
  border-radius: 16px;
  padding: 48px 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: #FAFAFC;
  margin-bottom: 20px;
}

.drag-zone:hover {
  border-color: var(--accent);
  background: rgba(0,113,227,0.02);
}

.drag-zone.drag-over {
  border-color: var(--accent);
  background: rgba(0,113,227,0.06);
  transform: scale(1.01);
}

.drag-zone.uploading {
  border-color: #34C759;
  background: rgba(52,199,89,0.04);
  cursor: default;
}

.drag-icon {
  font-size: 48px;
  margin-bottom: 12px;
  transition: transform 0.3s;
}

.drag-icon.bounce {
  animation: bounce 0.6s ease infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.drag-title {
  font-size: 16px;
  font-weight: 600;
  color: #1D1D1F;
  margin-bottom: 4px;
}

.drag-subtitle {
  font-size: 14px;
  color: #86868B;
  margin-bottom: 8px;
}

.drag-formats {
  font-size: 12px;
  color: #B0B0B5;
  font-family: 'JetBrains Mono', monospace;
}

/* Upload Progress */
.upload-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #E5E5EA;
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.upload-text {
  font-size: 14px;
  color: #1D1D1F;
  font-weight: 500;
}

.progress-bar {
  width: 200px;
  height: 4px;
  background: #E5E5EA;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.3s;
}

/* Action Buttons */
.action-row {
  display: flex;
  gap: 12px;
}

.btn {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all 0.2s;
  border: 1px solid #D2D2D7; background: white; color: #1D1D1F;
}
.btn:hover { background: #F5F5F7; transform: translateY(-1px); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: #1D1D1F; color: white; border: none; }
.btn-primary:hover { background: #333; }
.btn-danger { background: #FF3B30; color: white; border: none; }
.btn-danger:hover { background: #e0342a; }
.btn-outline { background: transparent; }

/* Import Log */
.import-log {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #F0F0F0;
}

.import-log h4 {
  font-size: 13px;
  font-weight: 600;
  color: #86868B;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #FAFAFC;
  border-radius: 10px;
  font-size: 13px;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}

.log-time { color: #86868B; font-family: 'JetBrains Mono', monospace; font-size: 11px; }
.log-type { font-weight: 600; color: #1D1D1F; min-width: 50px; }
.log-file { color: #86868B; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.log-count { color: #34C759; font-weight: 600; }

/* Mapping Table */
.mapping-content {
  max-height: 500px;
  overflow-y: auto;
}

.mapping-table {
  width: 100%;
  border-collapse: collapse;
}

.mapping-table th {
  text-align: left;
  font-size: 11px;
  color: #86868B;
  padding: 10px 0;
  border-bottom: 1px solid #E5E5EA;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: sticky;
  top: 0;
  background: white;
}

.mapping-table td {
  padding: 10px 0;
  font-size: 13px;
  border-bottom: 1px solid #F5F5F7;
}

.mapping-table code {
  font-family: 'JetBrains Mono', monospace;
  background: #F5F5F7;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  color: #1D1D1F;
}

/* Scrollbar */
.mapping-content::-webkit-scrollbar {
  width: 6px;
}
.mapping-content::-webkit-scrollbar-track {
  background: transparent;
}
.mapping-content::-webkit-scrollbar-thumb {
  background: #D2D2D7;
  border-radius: 3px;
}

/* ===== MOBILE RESPONSIVE ===== */
@media (max-width: 1024px) {
  .import-section { grid-template-columns: 1fr; }
  .stats-row { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 768px) {
  .stats-row { 
    grid-template-columns: repeat(2, 1fr); 
    gap: 12px;
  }
  
  .stat-card {
    padding: 16px;
    flex-direction: column;
    text-align: center;
    gap: 8px;
  }
  
  .stat-icon {
    width: 44px;
    height: 44px;
    font-size: 22px;
  }
  
  .stat-value { font-size: 18px; }
  
  .drag-zone {
    padding: 32px 20px;
  }
  
  .drag-icon { font-size: 36px; }
  .drag-title { font-size: 14px; }
  
  .action-row {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
    justify-content: center;
  }
  
  .log-item {
    flex-wrap: wrap;
    gap: 4px;
  }
  
  .log-file {
    width: 100%;
    order: 3;
  }
}

@media (max-width: 480px) {
  .stats-row { 
    grid-template-columns: 1fr; 
  }
  
  .stat-card {
    flex-direction: row;
    text-align: left;
  }
  
  .import-card, .mapping-card {
    padding: 20px;
  }
  
  .page-title { font-size: 22px; }
}
</style>
