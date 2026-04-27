<script setup lang="ts">
import { computed } from 'vue'
import { useMedicalSalesStore } from '@/stores/medicalSales'

const store = useMedicalSalesStore()

const categoryLabels: Record<string, string> = {
  collagen: '胶原蛋白系列',
  hyaluronic: '玻尿酸系列',
  botox: '肉毒素系列',
  device: '光电/射频设备',
  consumable: '耗材',
  other: '其他'
}

const productStats = computed(() => {
  return store.products.map(p => {
    const orderItems = store.orders.flatMap(o => o.items).filter(i => i.productId === p.id)
    const totalQuantity = orderItems.reduce((sum, i) => sum + i.quantity, 0)
    const totalAmount = orderItems.reduce((sum, i) => sum + i.totalAmount, 0)
    return {
      ...p,
      categoryLabel: categoryLabels[p.category] || p.category,
      totalQuantity,
      totalAmount,
      orderCount: orderItems.length
    }
  }).sort((a, b) => b.totalAmount - a.totalAmount)
})

const categoryStats = computed(() => {
  const byCategory: Record<string, { amount: number, quantity: number }> = {}
  productStats.value.forEach(p => {
    if (!byCategory[p.category]) byCategory[p.category] = { amount: 0, quantity: 0 }
    byCategory[p.category].amount += p.totalAmount
    byCategory[p.category].quantity += p.totalQuantity
  })
  const total = Object.values(byCategory).reduce((sum, c) => sum + c.amount, 0)
  return Object.entries(byCategory).map(([category, data]) => ({
    category,
    label: categoryLabels[category] || category,
    ...data,
    percent: Math.round(data.amount / total * 100)
  })).sort((a, b) => b.amount - a.amount)
})
</script>

<template>
  <div class="product-analysis">
    <!-- Category Overview -->
    <section class="section-box category-section">
      <h3>品类销售构成</h3>
      <div class="category-list">
        <div v-for="cat in categoryStats" :key="cat.category" class="category-item">
          <div class="category-header">
            <span>{{ cat.label }}</span>
            <span>{{ cat.percent }}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: cat.percent + '%' }"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Product Table -->
    <section class="section-box">
      <div class="section-header">
        <h3>产品明细表</h3>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>产品名称</th>
            <th>品类</th>
            <th>UDI-DI</th>
            <th>储存条件</th>
            <th>考核价</th>
            <th>销量</th>
            <th>销售额</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(p, index) in productStats" :key="p.id">
            <td>{{ index + 1 }}</td>
            <td class="name-cell">
              {{ p.name }}
              <span v-if="p.isUDIRequired" class="udi-badge">UDI</span>
            </td>
            <td>{{ p.categoryLabel }}</td>
            <td>
              <code v-if="p.udiDi" class="udi-code">{{ p.udiDi }}</code>
              <span v-else class="text-muted">待注册</span>
            </td>
            <td>
              <span class="temp-badge" v-if="p.storageTemp">{{ p.storageTemp }}</span>
              <span v-else>-</span>
            </td>
            <td>¥{{ p.assessmentPrice }}</td>
            <td>{{ p.totalQuantity }}</td>
            <td class="amount">¥{{ (p.totalAmount / 10000).toFixed(2) }}万</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.product-analysis {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 24px;
}

.section-box {
  background: var(--card);
  padding: 24px;
  border-radius: var(--radius);
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}

.section-box h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 20px;
}

.section-header {
  margin-bottom: 16px;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.category-item {}

.category-header {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  margin-bottom: 8px;
}

.progress-bar {
  height: 8px;
  background: #eee;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 4px;
}

.data-table { width: 100%; border-collapse: collapse; }
.data-table th {
  text-align: left;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}
.data-table td {
  padding: 14px 0;
  border-bottom: 1px solid #f5f5f7;
  font-size: 14px;
}
.name-cell { font-weight: 500; }
.amount { font-weight: 600; }

.udi-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  background: #0071E3;
  color: white;
  font-size: 11px;
  border-radius: 4px;
  font-weight: 600;
}

.udi-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  background: #F5F5F7;
  padding: 4px 8px;
  border-radius: 6px;
  color: #1D1D1F;
}

.temp-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #E5F0FF;
  color: #0040DD;
  font-size: 12px;
  border-radius: 20px;
  font-weight: 500;
}

.text-muted {
  color: #86868B;
  font-size: 13px;
}

@media (max-width: 1024px) {
  .product-analysis { grid-template-columns: 1fr; }
}
</style>
