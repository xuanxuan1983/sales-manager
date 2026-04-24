<script setup lang="ts">
import { computed } from 'vue'
import { useMedicalSalesStore } from '@/stores/medicalSales'
import { ElMessage } from 'element-plus'
import type { EnhancedDistributor } from '@/types/sales'
import { DISTRIBUTOR_TIERS } from '@/types/sales'

const store = useMedicalSalesStore()

const distributors = computed(() => store.distributors as EnhancedDistributor[])

const handleCalculate = () => {
  store.calculateDistributorTiers()
  ElMessage.success('星级与返利计算完成')
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(value)
}
</script>

<template>
  <div class="distributors-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">代理商分级管理</h1>
        <p class="page-subtitle">自动评定代理商星级，计算月度返货与提成</p>
      </div>
      <button class="btn btn-primary" @click="handleCalculate">
        ⚡ 自动计算评级 & 返利
      </button>
    </div>

    <!-- Tier Stats -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon">⭐⭐⭐</div>
        <div class="stat-info">
          <div class="stat-label">三星级代理商</div>
          <div class="stat-value">{{ distributors.filter(d => d.tier === 'three_star').length }} 家</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⭐⭐</div>
        <div class="stat-info">
          <div class="stat-label">二星级代理商</div>
          <div class="stat-value">{{ distributors.filter(d => d.tier === 'two_star').length }} 家</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-info">
          <div class="stat-label">本月预计返货</div>
          <div class="stat-value">{{ formatCurrency(distributors.reduce((sum, d) => sum + (d.rebateAmount || 0), 0)) }}</div>
        </div>
      </div>
    </div>

    <!-- Distributors Table -->
    <div class="table-card">
      <el-table :data="distributors" style="width: 100%">
        <el-table-column prop="name" label="代理商名称" width="200" />
        <el-table-column label="所属区域" width="120">
            <template #default="{ row }">
                {{ store.regions.find(r => r.id === row.regionId)?.name || '-' }}
            </template>
        </el-table-column>
        <el-table-column prop="monthlyPurchase" label="当月进货" width="150">
            <template #default="{ row }">
                {{ formatCurrency(row.monthlyPurchase || 0) }}
            </template>
        </el-table-column>
        <el-table-column label="销售目标 (A/B)" width="200">
            <template #default="{ row }">
                <div>A: {{ formatCurrency(row.salesATarget || 0) }}</div>
                <div class="sub-text">B: {{ formatCurrency(row.salesBTarget || 0) }}</div>
            </template>
        </el-table-column>
        <el-table-column label="当前星级" width="150">
            <template #default="{ row }">
                <span v-if="row.tier === 'three_star'" class="tier-tag three-star">⭐⭐⭐ 三星</span>
                <span v-else-if="row.tier === 'two_star'" class="tier-tag two-star">⭐⭐ 二星</span>
                <span v-else-if="row.tier === 'one_star'" class="tier-tag one-star">⭐ 一星</span>
                <span v-else class="tier-tag normal">未达标</span>
            </template>
        </el-table-column>
        <el-table-column label="返利政策" width="150">
            <template #default="{ row }">
                <div v-if="row.tier">返货: {{ (DISTRIBUTOR_TIERS.find(t => t.tier === row.tier)?.rebateRate) || 0 }}%</div>
                <div v-if="row.tier" class="sub-text">提成: {{ (DISTRIBUTOR_TIERS.find(t => t.tier === row.tier)?.commissionRate) || 0 }}%</div>
            </template>
        </el-table-column>
        <el-table-column label="预计返利" width="180">
            <template #default="{ row }">
                <div class="money-text">+{{ formatCurrency(row.rebateAmount || 0) }} (货)</div>
                <div class="money-text sub-text">+{{ formatCurrency(row.commissionAmount || 0) }} (佣)</div>
            </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.distributors-page {
  animation: fadeIn 0.5s ease;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.page-title { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
.page-subtitle { color: #86868B; font-size: 14px; margin-top: 4px; }

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}

.stat-icon { font-size: 32px; }
.stat-label { font-size: 13px; color: #86868B; }
.stat-value { font-size: 24px; font-weight: 700; }

.table-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}

.btn {
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 14px; font-weight: 600;
  cursor: pointer; transition: all 0.2s;
  border: none;
}
.btn-primary { background: #1D1D1F; color: white; }
.btn-primary:hover { background: #333; }

.sub-text { color: #86868B; font-size: 12px; margin-top: 2px; }
.money-text { font-family: 'JetBrains Mono', monospace; font-weight: 600; color: #10B981; }
.money-text.sub-text { color: #3B82F6; }

.tier-tag {
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
}
.three-star { background: #FEF3C7; color: #D97706; }
.two-star { background: #E0E7FF; color: #4F46E5; }
.one-star { background: #F3F4F6; color: #4B5563; }
.normal { background: #F3F4F6; color: #9CA3AF; }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
