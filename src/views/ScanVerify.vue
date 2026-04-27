<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { useScanVerifyStore } from '@/stores/scanVerify'
import type { InstitutionVerifyRecord } from '@/types/scanVerify'

const store = useScanVerifyStore()

// ========== 标签页 ==========
const activeTab = ref<'scan' | 'institution' | 'history'>('scan')

// ========== 扫码验真 ==========
const scanInput = ref('')
const showResult = ref(false)
const isScanning = computed(() => store.isScanning)
const result = computed(() => store.lastResult)

const handleScan = async () => {
  const code = scanInput.value.trim()
  if (!code) {
    ElMessage.warning('请输入或粘贴扫码内容')
    return
  }

  showResult.value = false
  await nextTick()

  await store.verifyProduct(code)
  showResult.value = true
  scanInput.value = ''
}

const handleMockScan = async () => {
  const mockCode = store.mockProductScan()
  scanInput.value = mockCode
  await handleScan()
}

// ========== 机构查询 ==========
const instSearch = ref('')
const instProvince = ref('')
const instCity = ref('')
const instResults = ref<InstitutionVerifyRecord[]>([])
const showInstResults = ref(false)

const provinces = ['北京市', '上海市', '广东省', '浙江省', '江苏省']
const cities: Record<string, string[]> = {
  '北京市': ['北京市'],
  '上海市': ['上海市'],
  '广东省': ['广州市', '深圳市', '佛山市'],
  '浙江省': ['杭州市', '宁波市'],
  '江苏省': ['南京市', '苏州市']
}

const availableCities = computed(() => {
  return instProvince.value ? (cities[instProvince.value] || []) : []
})

const handleInstSearch = () => {
  if (!instSearch.value.trim()) {
    ElMessage.warning('请输入机构名称')
    return
  }
  instResults.value = store.verifyInstitution(instSearch.value, instProvince.value || undefined, instCity.value || undefined)
  showInstResults.value = true
}

// ========== 快捷入口 ==========
const quickActions = [
  { icon: '📦', label: 'UDI入库', path: '/udi/inbound' },
  { icon: '🔍', label: '追溯查询', path: '/udi/trace' },
  { icon: '⚠️', label: '不良事件', path: '/udi/adverse' }
]
</script>

<template>
  <div class="scan-verify">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1>📱 扫码验真</h1>
        <p class="subtitle">四步核验 · 安心可溯 · 正品保障</p>
      </div>
    </div>

    <!-- 标签页 -->
    <div class="tabs-header">
      <button
        v-for="tab in [{key: 'scan' as const, label: '扫码验真', icon: '📷'}, {key: 'institution' as const, label: '机构查询', icon: '🏥'}, {key: 'history' as const, label: '查询记录', icon: '📋'}]"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        {{ tab.label }}
      </button>
    </div>

    <!-- ========== 扫码验真标签页 ========== -->
    <div v-show="activeTab === 'scan'" class="tab-content">
      <!-- 扫码输入区 -->
      <div class="scan-card" v-if="!showResult">
        <div class="scan-visual">
          <div class="scan-frame">
            <div class="scan-line"></div>
            <div class="scan-corner tl"></div>
            <div class="scan-corner tr"></div>
            <div class="scan-corner bl"></div>
            <div class="scan-corner br"></div>
          </div>
          <p class="scan-tip">请将产品包装盒背面溯源码对准摄像头</p>
        </div>

        <div class="input-section">
          <el-input
            v-model="scanInput"
            placeholder="或手动输入 / 粘贴扫码内容..."
            size="large"
            class="scan-input"
            @keyup.enter="handleScan"
          >
            <template #append>
              <el-button type="primary" @click="handleScan" :loading="isScanning">
                验证
              </el-button>
            </template>
          </el-input>

          <div class="input-actions">
            <el-button text type="primary" @click="handleMockScan">
              🧪 模拟扫码（测试）
            </el-button>
          </div>
        </div>

        <!-- 四步流程说明 -->
        <div class="steps-guide">
          <div class="step-item">
            <div class="step-num">1</div>
            <div class="step-text">扫描产品包装盒背面溯源码</div>
          </div>
          <div class="step-arrow">→</div>
          <div class="step-item">
            <div class="step-num">2</div>
            <div class="step-text">系统自动解析UDI编码</div>
          </div>
          <div class="step-arrow">→</div>
          <div class="step-item">
            <div class="step-num">3</div>
            <div class="step-text">多维度验证产品真伪</div>
          </div>
          <div class="step-arrow">→</div>
          <div class="step-item">
            <div class="step-num">4</div>
            <div class="step-text">显示查询结果与次数</div>
          </div>
        </div>
      </div>

      <!-- 验证结果区 -->
      <div class="result-card" v-else-if="result">
        <!-- 结果头部 -->
        <div class="result-header" :class="result.statusBadge.type">
          <div class="result-badge">
            <span class="badge-icon">{{ result.statusBadge.icon }}</span>
            <span class="badge-text">{{ result.statusBadge.text }}</span>
          </div>
          <div class="result-subtitle">
            <template v-if="result.isAuthentic">
              <span v-if="result.queryCount === 1">为本公司生产经营的正规产品，请放心使用</span>
              <span v-else>该序列号已被查询 {{ result.queryCount }} 次</span>
            </template>
            <template v-else>
              {{ result.checks.find(c => !c.passed)?.message || '验证未通过' }}
            </template>
          </div>
        </div>

        <!-- 产品信息卡片 -->
        <div class="product-info" v-if="result.isAuthentic">
          <div class="info-row">
            <span class="info-label">产品名称</span>
            <span class="info-value">{{ result.productName }}</span>
          </div>
          <div class="info-divider"></div>
          <div class="info-row">
            <span class="info-label">生产批号</span>
            <span class="info-value mono">{{ result.batchNo }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">序列号</span>
            <span class="info-value mono">{{ result.serialNo }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">生产日期</span>
            <span class="info-value">{{ result.productionDate }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">失效日期</span>
            <span class="info-value" :class="{ 'text-danger': result.statusBadge.type === 'warning' }">
              {{ result.expiryDate }}
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">生产企业</span>
            <span class="info-value">{{ result.manufacturer }}</span>
          </div>
        </div>

        <!-- 验证检查列表 -->
        <div class="checks-list">
          <div
            v-for="(check, idx) in result.checks"
            :key="idx"
            class="check-item"
            :class="check.severity"
          >
            <span class="check-icon">{{ check.icon }}</span>
            <div class="check-content">
              <div class="check-name">{{ check.name }}</div>
              <div class="check-message">{{ check.message }}</div>
            </div>
          </div>
        </div>

        <!-- 异常提示 -->
        <div class="alert-box danger" v-if="!result.isAuthentic">
          <div class="alert-title">⚠️ 异常提醒</div>
          <p>该序列号不存在，请核实是否输入有误，或联系销售商家确认。</p>
          <div class="alert-contact">
            <span>客服投诉电话：</span>
            <a href="tel:010-80126996" class="phone">010-69702567</a>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="result-actions">
          <el-button type="primary" size="large" @click="showResult = false; store.lastResult = null">
            🔄 继续扫码
          </el-button>
          <el-button size="large" @click="activeTab = 'history'">
            📋 查看记录
          </el-button>
        </div>
      </div>
    </div>

    <!-- ========== 机构查询标签页 ========== -->
    <div v-show="activeTab === 'institution'" class="tab-content">
      <div class="inst-search-card">
        <h3>🏥 正规合作机构查询</h3>
        <p class="inst-desc">查询官方授权的合作医疗机构，获取专业的诊疗意见</p>

        <div class="inst-form">
          <el-row :gutter="12">
            <el-col :span="8">
              <el-select v-model="instProvince" placeholder="选择省份" clearable @change="instCity = ''">
                <el-option v-for="p in provinces" :key="p" :label="p" :value="p" />
              </el-select>
            </el-col>
            <el-col :span="8">
              <el-select v-model="instCity" placeholder="选择城市" clearable :disabled="!instProvince">
                <el-option v-for="c in availableCities" :key="c" :label="c" :value="c" />
              </el-select>
            </el-col>
            <el-col :span="8">
              <el-input v-model="instSearch" placeholder="输入机构名称" @keyup.enter="handleInstSearch">
                <template #append>
                  <el-button type="primary" @click="handleInstSearch">搜索</el-button>
                </template>
              </el-input>
            </el-col>
          </el-row>
        </div>

        <!-- 搜索结果 -->
        <div class="inst-results" v-if="showInstResults">
          <div v-if="instResults.length === 0" class="inst-empty">
            <div class="empty-icon">🔍</div>
            <p>未找到相关机构，请核实名称或联系客服</p>
          </div>

          <div v-else class="inst-list">
            <div
              v-for="inst in instResults"
              :key="inst.id"
              class="inst-item"
              :class="{ authorized: inst.isAuthorized }"
            >
              <div class="inst-header">
                <span class="inst-name">{{ inst.institutionName }}</span>
                <el-tag :type="inst.isAuthorized ? 'success' : 'danger'" size="small">
                  {{ inst.isAuthorized ? '✓ 官方授权' : '✗ 未授权' }}
                </el-tag>
              </div>
              <div class="inst-meta">
                <span>📍 {{ inst.province }} {{ inst.city }}</span>
                <span v-if="inst.address">{{ inst.address }}</span>
              </div>
              <div class="inst-contact" v-if="inst.contact || inst.phone">
                <span v-if="inst.contact">👤 {{ inst.contact }}</span>
                <span v-if="inst.phone">📞 {{ inst.phone }}</span>
              </div>
              <div class="inst-products" v-if="inst.authorizedProducts.length > 0">
                <span class="product-label">授权产品：</span>
                <el-tag
                  v-for="pid in inst.authorizedProducts"
                  :key="pid"
                  size="small"
                  type="info"
                  class="product-tag"
                >
                  {{ pid === 'P001' ? '胶原蛋白植入剂1ml' : pid === 'P002' ? '胶原蛋白植入剂2ml' : '胶原蛋白水光' }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>

        <!-- 资质说明 -->
        <div class="qualification-notice">
          <h4>📋 资质完备 安全至上</h4>
          <p>天新福产品属于第三类医疗器械，其生产与运输全过程均严格遵守医疗器械相关管理规范。该产品仅限于经国家正式批准的医疗机构内，由具备相应资质的医师进行操作。</p>
          <p>建议您前往品牌官方授权的合作机构进行咨询，以获取专业的诊疗意见。</p>
        </div>
      </div>
    </div>

    <!-- ========== 查询记录标签页 ========== -->
    <div v-show="activeTab === 'history'" class="tab-content">
      <div class="history-card">
        <div class="history-header">
          <h3>📋 扫码验证记录</h3>
          <div class="history-stats">
            <el-tag type="success">正品 {{ store.stats.authentic }} 次</el-tag>
            <el-tag type="danger">异常 {{ store.stats.fake }} 次</el-tag>
            <el-tag type="warning">过期 {{ store.stats.expired }} 次</el-tag>
          </div>
        </div>

        <el-table :data="store.queryHistory" stripe style="width: 100%">
          <el-table-column label="时间" width="160">
            <template #default="{ row }">
              {{ new Date(row.verifiedAt).toLocaleString('zh-CN') }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <el-tag
                :type="row.status === 'authentic' || row.status === 'authentic_repeat' ? 'success' : 'danger'"
                size="small"
              >
                {{ row.isFirstQuery ? '第1次' : `第${row.queryCount}次` }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="产品" width="180">
            <template #default="{ row }">
              {{ row.productName || '未知' }}
            </template>
          </el-table-column>
          <el-table-column label="批号" width="140">
            <template #default="{ row }">
              <span class="mono">{{ row.batchNo || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="序列号" width="120">
            <template #default="{ row }">
              <span class="mono">{{ row.serialNo || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="结果" min-width="200">
            <template #default="{ row }">
              <span :class="{ 'text-success': row.status === 'authentic' || row.status === 'authentic_repeat', 'text-danger': row.status === 'not_found' }">
                {{ row.statusMessage }}
              </span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 快捷入口 -->
    <div class="quick-actions">
      <router-link
        v-for="action in quickActions"
        :key="action.path"
        :to="action.path"
        class="quick-action"
      >
        <span class="quick-icon">{{ action.icon }}</span>
        <span class="quick-label">{{ action.label }}</span>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.scan-verify { padding-bottom: 40px; }

.page-header {
  text-align: center;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #E5E7EB;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 700;
  color: #1F2937;
  margin: 0 0 6px 0;
}

.subtitle { color: #6B7280; font-size: 14px; }

/* 标签页 */
.tabs-header {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 500;
  color: #6B7280;
  background: white;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #1F2937;
  border-color: #0071E3;
}

.tab-btn.active {
  color: white;
  background: #0071E3;
  border-color: #0071E3;
}

.tab-icon { font-size: 16px; }

/* 扫码卡片 */
.scan-card {
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.06);
  max-width: 600px;
  margin: 0 auto;
}

.scan-visual {
  text-align: center;
  margin-bottom: 32px;
}

.scan-frame {
  width: 200px;
  height: 200px;
  margin: 0 auto 16px;
  border: 2px dashed #D1D5DB;
  border-radius: 16px;
  position: relative;
  background: linear-gradient(135deg, #F9FAFB, #F3F4F6);
}

.scan-line {
  position: absolute;
  top: 50%;
  left: 20px;
  right: 20px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #0071E3, transparent);
  animation: scanMove 2s ease-in-out infinite;
}

@keyframes scanMove {
  0%, 100% { opacity: 0; transform: translateY(-60px); }
  50% { opacity: 1; transform: translateY(60px); }
}

.scan-corner {
  position: absolute;
  width: 20px;
  height: 20px;
  border-color: #0071E3;
  border-style: solid;
}

.scan-corner.tl { top: -2px; left: -2px; border-width: 3px 0 0 3px; }
.scan-corner.tr { top: -2px; right: -2px; border-width: 3px 3px 0 0; }
.scan-corner.bl { bottom: -2px; left: -2px; border-width: 0 0 3px 3px; }
.scan-corner.br { bottom: -2px; right: -2px; border-width: 0 3px 3px 0; }

.scan-tip {
  color: #6B7280;
  font-size: 13px;
}

.input-section {
  margin-bottom: 32px;
}

.scan-input :deep(.el-input__wrapper) {
  border-radius: 12px;
}

.input-actions {
  text-align: center;
  margin-top: 12px;
}

/* 四步流程 */
.steps-guide {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding-top: 24px;
  border-top: 1px solid #E5E7EB;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
}

.step-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #0071E3;
  color: white;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-text {
  font-size: 11px;
  color: #6B7280;
  max-width: 80px;
  line-height: 1.3;
}

.step-arrow {
  color: #D1D5DB;
  font-size: 16px;
}

/* 结果卡片 */
.result-card {
  background: white;
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.06);
  max-width: 500px;
  margin: 0 auto;
}

.result-header {
  text-align: center;
  padding: 24px;
  border-radius: 16px;
  margin-bottom: 24px;
}

.result-header.success {
  background: linear-gradient(135deg, #ECFDF5, #D1FAE5);
}

.result-header.danger {
  background: linear-gradient(135deg, #FEF2F2, #FEE2E2);
}

.result-header.warning {
  background: linear-gradient(135deg, #FFFBEB, #FEF3C7);
}

.result-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
}

.badge-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.badge-text {
  font-size: 20px;
  font-weight: 700;
  color: #1F2937;
}

.result-subtitle {
  font-size: 13px;
  color: #4B5563;
}

/* 产品信息 */
.product-info {
  background: #FAFAFC;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.info-divider {
  height: 1px;
  background: #E5E7EB;
  margin: 8px 0;
}

.info-label {
  font-size: 13px;
  color: #6B7280;
}

.info-value {
  font-size: 13px;
  font-weight: 500;
  color: #1F2937;
}

.info-value.mono {
  font-family: monospace;
}

/* 检查列表 */
.checks-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  background: #FAFAFC;
}

.check-item.success { border-left: 3px solid #34C759; }
.check-item.warning { border-left: 3px solid #FF9500; }
.check-item.error { border-left: 3px solid #EF4444; }

.check-icon {
  font-size: 18px;
}

.check-name {
  font-size: 13px;
  font-weight: 600;
  color: #1F2937;
}

.check-message {
  font-size: 12px;
  color: #6B7280;
}

/* 异常提示 */
.alert-box {
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.alert-box.danger {
  background: #FEF2F2;
  border: 1px solid #FECACA;
}

.alert-title {
  font-weight: 600;
  color: #DC2626;
  margin-bottom: 8px;
}

.alert-box p {
  font-size: 13px;
  color: #6B7280;
  margin-bottom: 12px;
}

.alert-contact {
  font-size: 13px;
  color: #4B5563;
}

.phone {
  color: #DC2626;
  font-weight: 600;
  text-decoration: none;
}

/* 结果操作 */
.result-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

/* 机构查询 */
.inst-search-card {
  background: white;
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.06);
}

.inst-search-card h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #1F2937;
}

.inst-desc {
  color: #6B7280;
  font-size: 13px;
  margin-bottom: 24px;
}

.inst-form {
  margin-bottom: 24px;
}

.inst-results {
  margin-bottom: 24px;
}

.inst-empty {
  text-align: center;
  padding: 40px;
  color: #9CA3AF;
}

.inst-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.inst-item {
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #E5E7EB;
  background: #FAFAFC;
}

.inst-item.authorized {
  border-color: #34C759;
  background: linear-gradient(135deg, #fff, #ECFDF5);
}

.inst-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.inst-name {
  font-weight: 600;
  color: #1F2937;
}

.inst-meta {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: #6B7280;
  margin-bottom: 8px;
}

.inst-contact {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #6B7280;
  margin-bottom: 8px;
}

.inst-products {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.product-label {
  font-size: 12px;
  color: #6B7280;
}

.product-tag {
  margin-right: 4px;
}

.qualification-notice {
  padding: 20px;
  background: #EFF6FF;
  border-radius: 12px;
  border-left: 4px solid #0071E3;
}

.qualification-notice h4 {
  font-size: 15px;
  font-weight: 600;
  color: #1F2937;
  margin-bottom: 12px;
}

.qualification-notice p {
  font-size: 13px;
  color: #4B5563;
  line-height: 1.6;
  margin-bottom: 8px;
}

/* 历史记录 */
.history-card {
  background: white;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.06);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.history-header h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.history-stats {
  display: flex;
  gap: 8px;
}

/* 快捷入口 */
.quick-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #E5E7EB;
}

.quick-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 24px;
  background: white;
  border-radius: 12px;
  border: 1px solid #E5E7EB;
  text-decoration: none;
  color: #4B5563;
  transition: all 0.2s;
}

.quick-action:hover {
  border-color: #0071E3;
  box-shadow: 0 2px 8px rgba(0,113,227,0.08);
}

.quick-icon { font-size: 24px; }
.quick-label { font-size: 13px; }

/* 通用 */
.text-success { color: #34C759; }
.text-danger { color: #EF4444; }
.mono { font-family: monospace; }

/* Responsive */
@media (max-width: 768px) {
  .scan-card, .result-card {
    padding: 24px;
    margin: 0 12px;
  }

  .steps-guide {
    flex-wrap: wrap;
  }

  .step-arrow {
    display: none;
  }

  .tabs-header {
    padding: 0 12px;
  }

  .tab-btn {
    padding: 8px 16px;
    font-size: 13px;
  }

  .quick-actions {
    flex-wrap: wrap;
    padding: 0 12px;
  }
}
</style>
