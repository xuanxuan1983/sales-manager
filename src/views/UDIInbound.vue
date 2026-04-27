<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useUDITraceStore } from '@/stores/udiTrace'
import type { ProductBatch } from '@/types/sales'

const store = useUDITraceStore()

// 入库表单
const inboundForm = ref({
  productId: 'P001',
  batchNo: '',
  productionDate: '',
  expiryDate: '',
  quantity: 1,
  storageTemp: '2-8°C',
  udiDi: '6973894820001',
  // 预留：扫码后自动填充
  scannedUDI: ''
})

const productOptions = [
  { value: 'P001', label: '天新福胶原蛋白植入剂 1ml', udiDi: '6973894820001' },
  { value: 'P002', label: '天新福胶原蛋白植入剂 0.5ml', udiDi: '6973894820002' }
]

// 扫码模式切换
const inputMode = ref<'manual' | 'scan'>('manual')
const scanInput = ref('')
const isScanning = ref(false)

// 解析扫码结果（GS1 DataMatrix 格式）
const handleScan = () => {
  const content = scanInput.value.trim()
  if (!content) return

  isScanning.value = true

  try {
    // GS1 应用标识符解析
    // (01)6973894820001(11)260115(17)280114(10)TXF-A(21)001
    const gs1 = parseGS1(content)
    if (gs1) {
      inboundForm.value.udiDi = gs1.di
      inboundForm.value.batchNo = gs1.batchNo
      inboundForm.value.productionDate = gs1.productionDate
      inboundForm.value.expiryDate = gs1.expiryDate

      // 自动匹配产品
      const matched = productOptions.find(p => p.udiDi === gs1.di)
      if (matched) {
        inboundForm.value.productId = matched.value
      }

      ElMessage.success('扫码解析成功，请确认入库信息')
      inputMode.value = 'manual'
    } else {
      ElMessage.warning('无法识别该码，请手动输入')
    }
  } catch (e) {
    ElMessage.error('扫码解析失败')
  } finally {
    isScanning.value = false
    scanInput.value = ''
  }
}

interface GS1ParseResult {
  di: string
  batchNo: string
  productionDate: string
  expiryDate: string
  serialNo: string
}

const parseGS1 = (content: string): GS1ParseResult | null => {
  // 简化版 GS1 解析
  // 实际应该用专门的 GS1 库
  const diMatch = content.match(/\(01\)(\d+)/)
  const batchMatch = content.match(/\(10\)([^)]+)/)
  const prodMatch = content.match(/\(11\)(\d{6})/)
  const expMatch = content.match(/\(17\)(\d{6})/)
  const serialMatch = content.match(/\(21\)([^)]+)/)

  if (!diMatch) return null

  const formatDate = (yyMMdd: string) => {
    const yy = yyMMdd.substring(0, 2)
    const mm = yyMMdd.substring(2, 4)
    const dd = yyMMdd.substring(4, 6)
    const year = parseInt(yy) >= 50 ? `19${yy}` : `20${yy}`
    return `${year}-${mm}-${dd}`
  }

  return {
    di: diMatch[1],
    batchNo: batchMatch?.[1] || '',
    productionDate: prodMatch ? formatDate(prodMatch[1]) : '',
    expiryDate: expMatch ? formatDate(expMatch[1]) : '',
    serialNo: serialMatch?.[1] || ''
  }
}

// 提交入库
const submitting = ref(false)
const handleSubmit = () => {
  if (!inboundForm.value.batchNo || !inboundForm.value.expiryDate) {
    ElMessage.warning('请填写完整信息')
    return
  }

  submitting.value = true

  const batch: ProductBatch = {
    id: `B${Date.now()}`,
    productId: inboundForm.value.productId,
    batchNo: inboundForm.value.batchNo,
    productionDate: inboundForm.value.productionDate,
    expiryDate: inboundForm.value.expiryDate,
    quantity: inboundForm.value.quantity,
    remaining: inboundForm.value.quantity,
    udiList: [],
    storageTemp: inboundForm.value.storageTemp,
    status: 'in_stock'
  }

  store.addBatch(batch)
  ElMessage.success(`批次 ${batch.batchNo} 入库成功，数量: ${batch.quantity}`)

  // 重置表单
  inboundForm.value.batchNo = ''
  inboundForm.value.productionDate = ''
  inboundForm.value.expiryDate = ''
  inboundForm.value.quantity = 1

  submitting.value = false
}

// 批次列表
const batchList = computed(() => store.batches)

const getStatusTag = (status: string) => {
  const map: Record<string, { type: 'success' | 'warning' | 'danger' | 'info', label: string }> = {
    in_stock: { type: 'success', label: '在库' },
    shipping: { type: 'warning', label: '出库中' },
    sold_out: { type: 'info', label: '售罄' },
    expired: { type: 'danger', label: '过期' },
    recalled: { type: 'danger', label: '召回' }
  }
  return map[status] || { type: 'info', label: status }
}

const getProductLabel = (productId: string) => {
  return productOptions.find(p => p.value === productId)?.label || productId
}
</script>

<template>
  <div class="udi-inbound">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1>📦 UDI 扫码入库</h1>
        <p class="subtitle">三类医疗器械批次入库 · 支持 DataMatrix 扫码</p>
      </div>
      <div class="header-actions">
        <el-button type="danger" plain @click="$router.push('/udi/adverse')">
          ⚠️ 不良事件
        </el-button>
        <el-button type="primary" @click="$router.push('/udi/trace')">
          🔍 追溯查询
        </el-button>
      </div>
    </div>

    <div class="main-grid">
      <!-- 左侧：入库操作 -->
      <div class="left-panel">
        <!-- 输入模式切换 -->
        <div class="mode-switch">
          <el-radio-group v-model="inputMode" size="default">
            <el-radio-button label="manual">📝 手动录入</el-radio-button>
            <el-radio-button label="scan">📷 扫码录入</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 扫码区域 -->
        <div v-if="inputMode === 'scan'" class="scan-area">
          <div class="scan-box">
            <div class="scan-icon">📷</div>
            <p class="scan-text">请将 DataMatrix 码对准摄像头</p>
            <p class="scan-hint">或手动输入扫码内容</p>
            <el-input
              v-model="scanInput"
              placeholder="粘贴扫码内容..."
              size="large"
              @keyup.enter="handleScan"
            >
              <template #append>
                <el-button @click="handleScan" :loading="isScanning">解析</el-button>
              </template>
            </el-input>
          </div>
        </div>

        <!-- 手动录入表单 -->
        <div v-else class="form-card">
          <h3>入库信息</h3>
          <el-form :model="inboundForm" label-position="top" class="inbound-form">
            <el-form-item label="产品">
              <el-select v-model="inboundForm.productId" style="width: 100%">
                <el-option
                  v-for="opt in productOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="UDI-DI">
              <el-input v-model="inboundForm.udiDi" disabled />
            </el-form-item>

            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="生产批号">
                  <el-input v-model="inboundForm.batchNo" placeholder="如: TXF-20260115-A" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="入库数量">
                  <el-input-number v-model="inboundForm.quantity" :min="1" style="width: 100%" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="生产日期">
                  <el-date-picker v-model="inboundForm.productionDate" type="date" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="有效期至">
                  <el-date-picker v-model="inboundForm.expiryDate" type="date" style="width: 100%" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="储存温度">
              <el-select v-model="inboundForm.storageTemp" style="width: 100%">
                <el-option label="2-8°C" value="2-8°C" />
                <el-option label="常温" value="常温" />
                <el-option label="-20°C" value="-20°C" />
              </el-select>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" size="large" style="width: 100%" @click="handleSubmit" :loading="submitting">
                ✅ 确认入库
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>

      <!-- 右侧：批次列表 -->
      <div class="right-panel">
        <div class="list-card">
          <div class="list-header">
            <h3>📋 在库批次</h3>
            <el-tag type="info">共 {{ batchList.length }} 批</el-tag>
          </div>

          <div class="batch-list">
            <div
              v-for="batch in batchList"
              :key="batch.id"
              class="batch-item"
              :class="{ expired: batch.status === 'expired', low: batch.remaining < 50 }"
            >
              <div class="batch-top">
                <span class="batch-no">{{ batch.batchNo }}</span>
                <el-tag :type="getStatusTag(batch.status).type" size="small">
                  {{ getStatusTag(batch.status).label }}
                </el-tag>
              </div>
              <div class="batch-product">{{ getProductLabel(batch.productId) }}</div>
              <div class="batch-meta">
                <span>📦 库存: <strong>{{ batch.remaining }}</strong> / {{ batch.quantity }}</span>
                <span>🌡️ {{ batch.storageTemp }}</span>
              </div>
              <div class="batch-dates">
                <span class="date-item">
                  <span class="label">生产:</span> {{ batch.productionDate }}
                </span>
                <span class="date-item" :class="{ warning: new Date(batch.expiryDate) < new Date('2026-10-23') }">
                  <span class="label">效期:</span> {{ batch.expiryDate }}
                </span>
              </div>
              <el-progress
                :percentage="Math.round(batch.remaining / batch.quantity * 100)"
                :stroke-width="6"
                :show-text="false"
                :color="batch.remaining < 50 ? '#F56C6C' : '#67C23A'"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.udi-inbound { padding-bottom: 40px; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
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

.main-grid {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 24px;
}

/* 左侧 */
.mode-switch {
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
}

.scan-area {
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.04);
}

.scan-box {
  text-align: center;
}

.scan-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.scan-text {
  font-size: 16px;
  font-weight: 600;
  color: #1F2937;
  margin-bottom: 8px;
}

.scan-hint {
  font-size: 13px;
  color: #9CA3AF;
  margin-bottom: 24px;
}

.form-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.04);
}

.form-card h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 20px;
  color: #1F2937;
}

.inbound-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: #4B5563;
}

/* 右侧 */
.list-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.04);
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.list-header h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: #1F2937;
}

.batch-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 600px;
  overflow-y: auto;
}

.batch-item {
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s;
}

.batch-item:hover {
  border-color: #0071E3;
  box-shadow: 0 2px 8px rgba(0,113,227,0.08);
}

.batch-item.expired {
  border-color: #F56C6C;
  background: #FEF2F2;
}

.batch-item.low {
  border-color: #FF9500;
}

.batch-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.batch-no {
  font-family: monospace;
  font-weight: 600;
  font-size: 14px;
  color: #1F2937;
}

.batch-product {
  font-size: 13px;
  color: #6B7280;
  margin-bottom: 10px;
}

.batch-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #6B7280;
  margin-bottom: 8px;
}

.batch-dates {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #9CA3AF;
  margin-bottom: 10px;
}

.date-item .label { color: #6B7280; }

.date-item.warning {
  color: #F56C6C;
  font-weight: 600;
}

/* Responsive */
@media (max-width: 1024px) {
  .main-grid { grid-template-columns: 1fr; }
}
</style>
