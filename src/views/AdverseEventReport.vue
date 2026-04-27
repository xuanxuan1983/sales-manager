<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAdverseEventStore } from '@/stores/adverseEvent'
import { useUDITraceStore } from '@/stores/udiTrace'
import { exportAdverseEventsNMPA, exportAdverseEventsSimple } from '@/utils/export'
import type { AdverseEvent, AdverseEventType, AdverseEventSeverity, AdverseEventStatus } from '@/types/sales'

const store = useAdverseEventStore()
const udiStore = useUDITraceStore()

// 标签页
const activeTab = ref<'list' | 'report'>('list')

// 筛选
const filterType = ref<AdverseEventType | ''>('')
const filterSeverity = ref<AdverseEventSeverity | ''>('')
const filterStatus = ref<AdverseEventStatus | ''>('')
const filterBatch = ref('')

const applyFilter = () => {
    store.filter.eventType = filterType.value
    store.filter.severity = filterSeverity.value
    store.filter.status = filterStatus.value
    store.filter.batchNo = filterBatch.value
}

const resetFilter = () => {
    filterType.value = ''
    filterSeverity.value = ''
    filterStatus.value = ''
    filterBatch.value = ''
    applyFilter()
}

// 上报表单
const reportForm = ref({
    reporter: '',
    reporterContact: '',
    patientAge: undefined as number | undefined,
    patientGender: 'female' as 'male' | 'female',

    // UDI 信息
    udiPi: '',
    batchNo: '',
    serialNo: '',

    // 事件
    eventType: 'allergy' as AdverseEventType,
    eventDate: '',
    eventDescription: '',
    treatmentDescription: '',
    severity: 'mild' as AdverseEventSeverity,
    outcome: 'unknown' as 'recovered' | 'recovering' | 'not_recovered' | 'death' | 'unknown',

    // 机构
    institutionName: '',
    institutionType: 'clinic' as 'clinic' | 'hospital' | 'beauty_salon',
    operatorName: '',

    remark: ''
})

// 附件上传
const attachmentList = ref<Array<{ name: string; url: string; type: string }>>([])
const uploadAction = ref('#') // 实际项目中替换为上传接口

const handleFileChange = (file: any) => {
    // 模拟上传：实际项目中调用上传接口
    const reader = new FileReader()
    reader.onload = () => {
        attachmentList.value.push({
            name: file.name,
            url: reader.result as string,
            type: file.raw.type
        })
        ElMessage.success(`附件 ${file.name} 已添加`)
    }
    reader.readAsDataURL(file.raw)
}

const removeAttachment = (index: number) => {
    attachmentList.value.splice(index, 1)
}

// UDI 查询回填
const udiSearchResult = ref<ReturnType<typeof udiStore.getTraceByUDI>>([])
const searchUDI = () => {
    if (!reportForm.value.udiPi) return
    udiSearchResult.value = udiStore.getTraceByUDI(reportForm.value.udiPi)
    if (udiSearchResult.value.length > 0) {
        const latest = udiSearchResult.value[udiSearchResult.value.length - 1]
        reportForm.value.batchNo = latest.batchNo
        reportForm.value.serialNo = latest.serialNo
        reportForm.value.institutionName = latest.to
        reportForm.value.institutionType = latest.toType === 'hospital' ? 'hospital' : 'clinic'
        ElMessage.success('UDI 信息已自动填充')
    } else {
        ElMessage.info('未找到该 UDI 的追溯记录，请手动填写')
    }
}

// 提交上报
const submitting = ref(false)
const handleSubmit = async () => {
    if (!reportForm.value.eventDescription || !reportForm.value.institutionName) {
        ElMessage.warning('请填写事件描述和机构信息')
        return
    }

    submitting.value = true

    const event: AdverseEvent = {
        id: `AE${Date.now()}`,
        reportNo: store.generateReportNo(),
        reportDate: new Date().toISOString().split('T')[0],
        reporter: reportForm.value.reporter || '匿名',
        reporterContact: reportForm.value.reporterContact || '',
        patientAge: reportForm.value.patientAge,
        patientGender: reportForm.value.patientGender,
        productId: 'P001',
        productName: '天新福胶原蛋白植入剂 1ml',
        udiDi: '6973894820001',
        udiPi: reportForm.value.udiPi || '',
        batchNo: reportForm.value.batchNo || '',
        serialNo: reportForm.value.serialNo || '',
        eventType: reportForm.value.eventType,
        eventDate: reportForm.value.eventDate || new Date().toISOString().split('T')[0],
        eventDescription: reportForm.value.eventDescription,
        treatmentDescription: reportForm.value.treatmentDescription,
        severity: reportForm.value.severity,
        outcome: reportForm.value.outcome,
        institutionName: reportForm.value.institutionName,
        institutionType: reportForm.value.institutionType,
        operatorName: reportForm.value.operatorName,
        status: 'reported',
        remark: reportForm.value.remark,
        attachments: attachmentList.value.map(a => a.url)
    }

    store.addEvent(event)
    ElMessage.success(`不良事件已上报，编号: ${event.reportNo}`)

    // 重置
    reportForm.value = {
        reporter: '', reporterContact: '', patientAge: undefined, patientGender: 'female',
        udiPi: '', batchNo: '', serialNo: '',
        eventType: 'allergy', eventDate: '', eventDescription: '', treatmentDescription: '',
        severity: 'mild', outcome: 'unknown',
        institutionName: '', institutionType: 'clinic', operatorName: '', remark: ''
    }
    udiSearchResult.value = []
    attachmentList.value = []
    submitting.value = false
    activeTab.value = 'list'
}

// 状态操作
const handleStatusChange = async (row: AdverseEvent) => {
    const options = [
        { label: '调查中', value: 'investigating' },
        { label: '已确认', value: 'confirmed' },
        { label: '已结案', value: 'closed' },
        { label: '已上报药监局', value: 'reported_to_nmpa' }
    ]

    try {
        const result = await (ElMessageBox as any).prompt(
            `修改事件 ${row.reportNo} 的状态`,
            '状态更新',
            {
                confirmButtonText: '确认',
                cancelButtonText: '取消',
                inputType: 'select',
                inputOptions: options,
                inputValue: row.status
            }
        )
        if (result.value) {
            store.updateStatus(row.id, result.value as AdverseEventStatus)
            ElMessage.success('状态已更新')
        }
    } catch {
        // cancelled
    }
}

// 导出
const handleExportNMPA = () => {
    exportAdverseEventsNMPA(store.filteredEvents, '医疗器械不良事件报告表')
    ElMessage.success('药监局模板已导出')
}

const handleExportSimple = () => {
    exportAdverseEventsSimple(store.filteredEvents, '不良事件清单')
    ElMessage.success('清单已导出')
}

// 常量
const eventTypeOptions = [
    { value: 'infection', label: '感染' },
    { value: 'allergy', label: '过敏反应' },
    { value: 'nodule', label: '结节/硬结' },
    { value: 'vascular', label: '血管栓塞' },
    { value: 'asymmetry', label: '不对称/畸形' },
    { value: 'other', label: '其他' }
]

const severityOptions = [
    { value: 'mild', label: '轻度', color: 'info' },
    { value: 'moderate', label: '中度', color: 'warning' },
    { value: 'severe', label: '重度', color: 'danger' },
    { value: 'life_threatening', label: '危及生命', color: 'danger' }
]

const statusOptions = [
    { value: 'reported', label: '已上报', color: 'info' },
    { value: 'investigating', label: '调查中', color: 'warning' },
    { value: 'confirmed', label: '已确认', color: 'danger' },
    { value: 'closed', label: '已结案', color: 'success' },
    { value: 'reported_to_nmpa', label: '已报药监局', color: 'primary' }
]

const getEventTypeLabel = (type: string) => eventTypeOptions.find(o => o.value === type)?.label || type
const getSeverityTag = (sev: string) => severityOptions.find(o => o.value === sev) || { label: sev, color: 'info' }
const getStatusTag = (status: string) => statusOptions.find(o => o.value === status) || { label: status, color: 'info' }

// 统计数据
const stats = computed(() => store.stats)
</script>

<template>
  <div class="adverse-event">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1>⚠️ 不良事件上报</h1>
        <p class="subtitle">医疗器械不良事件监测 · UDI 精准定位 · 药监局对接预备</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="activeTab = 'report'">➕ 新增上报</el-button>
        <el-button @click="$router.push('/udi/trace')">🔍 追溯查询</el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value">{{ stats.total }}</div>
        <div class="stat-label">累计事件</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-value">{{ stats.investigating }}</div>
        <div class="stat-label">调查中</div>
      </div>
      <div class="stat-card info">
        <div class="stat-value">{{ stats.reported }}</div>
        <div class="stat-label">待处理</div>
      </div>
      <div class="stat-card success">
        <div class="stat-value">{{ stats.closed }}</div>
        <div class="stat-label">已结案</div>
      </div>
      <div class="stat-card danger">
        <div class="stat-value">{{ stats.severe }}</div>
        <div class="stat-label">重度/危及生命</div>
      </div>
    </div>

    <!-- 标签页 -->
    <div class="tabs-section">
      <div class="tabs-header">
        <button
          v-for="tab in ([{key: 'list' as const, label: '事件列表'}, {key: 'report' as const, label: '新增上报'}])"
          :key="tab.key"
          class="tab-btn"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- 事件列表 -->
      <div v-show="activeTab === 'list'" class="tab-content">
        <!-- 筛选 -->
        <div class="filter-bar">
          <el-select v-model="filterType" placeholder="事件类型" clearable style="width: 140px" @change="applyFilter">
            <el-option v-for="opt in eventTypeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
          <el-select v-model="filterSeverity" placeholder="严重程度" clearable style="width: 140px" @change="applyFilter">
            <el-option v-for="opt in severityOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
          <el-select v-model="filterStatus" placeholder="处理状态" clearable style="width: 140px" @change="applyFilter">
            <el-option v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
          <el-input v-model="filterBatch" placeholder="批号筛选" style="width: 160px" @keyup.enter="applyFilter" />
          <el-button @click="resetFilter">重置</el-button>
          <el-divider direction="vertical" />
          <el-dropdown>
            <el-button type="primary" plain>📥 导出</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleExportNMPA">药监局报告表</el-dropdown-item>
                <el-dropdown-item @click="handleExportSimple">内部清单</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>

        <!-- Desktop: 表格 -->
        <el-table :data="store.filteredEvents" style="width: 100%" stripe class="desktop-only">
          <el-table-column prop="reportNo" label="上报编号" width="140">
            <template #default="{ row }">
              <span class="mono">{{ row.reportNo }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="reportDate" label="上报日期" width="100" />
          <el-table-column label="事件类型" width="100">
            <template #default="{ row }">
              {{ getEventTypeLabel(row.eventType) }}
            </template>
          </el-table-column>
          <el-table-column label="严重程度" width="100">
            <template #default="{ row }">
              <el-tag :type="getSeverityTag(row.severity).color as any" size="small">
                {{ getSeverityTag(row.severity).label }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="institutionName" label="发生机构" min-width="180" show-overflow-tooltip />
          <el-table-column label="UDI-PI / 批号" min-width="200">
            <template #default="{ row }">
              <div class="udi-cell">
                <span class="mono">{{ row.udiPi }}</span>
                <span class="batch-tag">{{ row.batchNo }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="getStatusTag(row.status).color as any" size="small" effect="dark">
                {{ getStatusTag(row.status).label }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="handleStatusChange(row)">更新状态</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- Mobile: 卡片列表 -->
        <div class="mobile-card-list">
          <div
            v-for="row in store.filteredEvents"
            :key="row.id"
            class="event-card"
            :class="row.severity"
            @click="handleStatusChange(row)"
          >
            <div class="event-card-header">
              <span class="event-card-no">{{ row.reportNo }}</span>
              <el-tag :type="getSeverityTag(row.severity).color as any" size="small">
                {{ getSeverityTag(row.severity).label }}
              </el-tag>
            </div>
            <div class="event-card-body">
              <div class="event-card-row">
                <span class="label">机构</span>
                <span class="value">{{ row.institutionName }}</span>
              </div>
              <div class="event-card-row">
                <span class="label">类型</span>
                <span class="value">{{ getEventTypeLabel(row.eventType) }}</span>
              </div>
              <div class="event-card-row">
                <span class="label">批号</span>
                <span class="value mono">{{ row.batchNo }}</span>
              </div>
              <div class="event-card-row">
                <span class="label">日期</span>
                <span class="value">{{ row.reportDate }}</span>
              </div>
            </div>
            <div class="event-card-footer">
              <el-tag :type="getStatusTag(row.status).color as any" size="small" effect="dark">
                {{ getStatusTag(row.status).label }}
              </el-tag>
              <span class="tap-hint">点击更新状态 →</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 新增上报 -->
      <div v-show="activeTab === 'report'" class="tab-content">
        <div class="report-form-wrapper">
          <h3>📝 不良事件上报表</h3>

          <!-- UDI 快速定位 -->
          <div class="udi-section">
            <h4>🔍 UDI 精准定位（可选）</h4>
            <el-input
              v-model="reportForm.udiPi"
              placeholder="输入 UDI-PI 码，自动填充产品信息..."
              style="width: 400px"
              @keyup.enter="searchUDI"
            >
              <template #append>
                <el-button @click="searchUDI">查询</el-button>
              </template>
            </el-input>
            <p class="hint">输入 UDI-PI 可自动关联产品、批号、使用机构信息</p>
          </div>

          <el-form :model="reportForm" label-position="top" class="report-form">
            <el-row :gutter="24">
              <!-- 上报人 -->
              <el-col :span="8">
                <el-form-item label="上报人">
                  <el-input v-model="reportForm.reporter" placeholder="姓名" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="联系方式">
                  <el-input v-model="reportForm.reporterContact" placeholder="电话" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="上报日期">
                  <el-date-picker v-model="reportForm.eventDate" type="date" style="width: 100%" />
                </el-form-item>
              </el-col>
            </el-row>

            <!-- 患者信息 -->
            <el-divider>患者信息（脱敏）</el-divider>
            <el-row :gutter="24">
              <el-col :span="6">
                <el-form-item label="年龄">
                  <el-input-number v-model="reportForm.patientAge" :min="18" :max="100" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="性别">
                  <el-radio-group v-model="reportForm.patientGender">
                    <el-radio-button label="female">女</el-radio-button>
                    <el-radio-button label="male">男</el-radio-button>
                  </el-radio-group>
                </el-form-item>
              </el-col>
            </el-row>

            <!-- 产品信息 -->
            <el-divider>产品信息</el-divider>
            <el-row :gutter="24">
              <el-col :span="8">
                <el-form-item label="批号">
                  <el-input v-model="reportForm.batchNo" placeholder="生产批号" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="序列号">
                  <el-input v-model="reportForm.serialNo" placeholder="产品序列号" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="UDI-DI">
                  <el-input value="6973894820001" disabled />
                </el-form-item>
              </el-col>
            </el-row>

            <!-- 事件信息 -->
            <el-divider>事件详情</el-divider>
            <el-row :gutter="24">
              <el-col :span="8">
                <el-form-item label="事件类型">
                  <el-select v-model="reportForm.eventType" style="width: 100%">
                    <el-option v-for="opt in eventTypeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="严重程度">
                  <el-select v-model="reportForm.severity" style="width: 100%">
                    <el-option v-for="opt in severityOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="事件日期">
                  <el-date-picker v-model="reportForm.eventDate" type="date" style="width: 100%" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="事件描述">
              <el-input
                v-model="reportForm.eventDescription"
                type="textarea"
                :rows="3"
                placeholder="请详细描述事件发生的时间、症状、部位、发展过程..."
              />
            </el-form-item>

            <el-form-item label="处理措施">
              <el-input
                v-model="reportForm.treatmentDescription"
                type="textarea"
                :rows="2"
                placeholder="已采取的治疗措施、用药情况、转归..."
              />
            </el-form-item>

            <!-- 机构信息 -->
            <el-divider>机构信息</el-divider>
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="发生机构">
                  <el-input v-model="reportForm.institutionName" placeholder="机构全称" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="机构类型">
                  <el-select v-model="reportForm.institutionType" style="width: 100%">
                    <el-option label="医疗美容门诊部" value="clinic" />
                    <el-option label="医院整形科" value="hospital" />
                    <el-option label="生活美容机构" value="beauty_salon" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="操作医师">
                  <el-input v-model="reportForm.operatorName" placeholder="医师姓名" />
                </el-form-item>
              </el-col>
            </el-row>

            <!-- 附件上传 -->
            <el-divider>附件上传（事件照片、病历截图等）</el-divider>
            <el-form-item>
              <el-upload
                :action="uploadAction"
                :auto-upload="false"
                :on-change="handleFileChange"
                :show-file-list="false"
                accept="image/*,.pdf,.doc,.docx"
                multiple
              >
                <el-button type="primary" plain>📎 选择附件</el-button>
                <template #tip>
                  <p class="upload-tip">支持图片、PDF、Word 文档，单个文件不超过 10MB</p>
                </template>
              </el-upload>

              <!-- 已上传文件列表 -->
              <div v-if="attachmentList.length > 0" class="attachment-list">
                <div
                  v-for="(file, index) in attachmentList"
                  :key="index"
                  class="attachment-item"
                >
                  <span class="attachment-icon">{{ file.type.startsWith('image/') ? '🖼️' : '📄' }}</span>
                  <span class="attachment-name">{{ file.name }}</span>
                  <el-button link type="danger" size="small" @click="removeAttachment(index)">删除</el-button>
                </div>
              </div>
            </el-form-item>

            <el-form-item label="备注">
              <el-input v-model="reportForm.remark" type="textarea" :rows="2" placeholder="其他需要说明的信息..." />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" size="large" @click="handleSubmit" :loading="submitting" style="width: 200px">
                ✅ 提交上报
              </el-button>
              <el-button size="large" @click="activeTab = 'list'">取消</el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.adverse-event { padding-bottom: 40px; }

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

.header-actions { display: flex; gap: 12px; }

/* 统计卡片 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 4px 16px rgba(0,0,0,0.04);
  border-top: 3px solid #E5E7EB;
}

.stat-card.warning { border-top-color: #FF9500; }
.stat-card.info { border-top-color: #0071E3; }
.stat-card.success { border-top-color: #34C759; }
.stat-card.danger { border-top-color: #EF4444; }

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #1F2937;
  letter-spacing: -1px;
}

.stat-label {
  font-size: 13px;
  color: #6B7280;
  margin-top: 4px;
}

/* 标签页 */
.tabs-section {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.04);
  overflow: hidden;
}

.tabs-header {
  display: flex;
  border-bottom: 1px solid #E5E7EB;
  background: #FAFAFC;
}

.tab-btn {
  padding: 14px 24px;
  font-size: 14px;
  font-weight: 500;
  color: #6B7280;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.tab-btn:hover { color: #1F2937; background: rgba(0,0,0,0.02); }
.tab-btn.active { color: #0071E3; font-weight: 600; }
.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 16px;
  right: 16px;
  height: 2px;
  background: #0071E3;
  border-radius: 2px;
}

.tab-content { padding: 24px; }

/* 筛选 */
.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

/* UDI 单元格 */
.udi-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.udi-cell .mono {
  font-family: monospace;
  font-size: 12px;
  color: #4B5563;
}

.batch-tag {
  font-size: 11px;
  color: #9CA3AF;
}

/* 上报表单 */
.report-form-wrapper {
  max-width: 900px;
}

.report-form-wrapper h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 24px;
  color: #1F2937;
}

.udi-section {
  background: #EFF6FF;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.udi-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: #1E40AF;
  margin-bottom: 12px;
}

.hint {
  font-size: 12px;
  color: #6B7280;
  margin-top: 8px;
}

.attachment-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #F9FAFB;
  border-radius: 8px;
  font-size: 13px;
}

.attachment-icon { font-size: 16px; }
.attachment-name { flex: 1; color: #374151; }

.report-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: #374151;
}

.mono { font-family: monospace; }

/* ============ Mobile Card List ============ */
.desktop-only {
  display: block;
}

.mobile-card-list {
  display: none;
  flex-direction: column;
  gap: 12px;
}

.event-card {
  background: white;
  border-radius: 16px;
  padding: 16px;
  border-left: 4px solid #E5E7EB;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  cursor: pointer;
  transition: all 0.2s;
}

.event-card:active {
  transform: scale(0.98);
}

.event-card.severe,
.event-card.life_threatening {
  border-left-color: #EF4444;
  background: linear-gradient(135deg, #fff, #FEF2F2);
}

.event-card.moderate {
  border-left-color: #FF9500;
  background: linear-gradient(135deg, #fff, #FFFBEB);
}

.event-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.event-card-no {
  font-family: monospace;
  font-weight: 600;
  font-size: 15px;
  color: #1F2937;
}

.event-card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.event-card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.event-card-row .label {
  color: #9CA3AF;
  font-size: 13px;
}

.event-card-row .value {
  color: #374151;
  font-weight: 500;
  text-align: right;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px solid #F3F4F6;
}

.tap-hint {
  font-size: 12px;
  color: #9CA3AF;
}

/* ============ Responsive ============ */
@media (max-width: 1024px) {
  .stats-row { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 768px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
  .filter-bar { flex-direction: column; }
  .filter-bar .el-select, .filter-bar .el-input { width: 100% !important; }

  /* Switch table to cards */
  .desktop-only { display: none !important; }
  .mobile-card-list { display: flex; }

  /* Larger tap targets */
  .tab-btn {
    padding: 16px 20px;
    font-size: 15px;
  }

  .event-card {
    padding: 20px;
  }

  /* Form larger on mobile */
  :deep(.el-input__inner),
  :deep(.el-textarea__inner) {
    font-size: 16px !important; /* Prevent iOS zoom */
  }

  :deep(.el-button) {
    min-height: 44px;
  }

  :deep(.el-select .el-input__inner) {
    height: 44px;
  }
}
</style>
