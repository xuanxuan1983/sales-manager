<script setup lang="ts">
import { computed } from 'vue'
import { useMedicalSalesStore } from '@/stores/medicalSales'

const store = useMedicalSalesStore()

const categoryLabels: Record<string, string> = {
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
            <th>单位</th>
            <th>考核价</th>
            <th>销量</th>
            <th>销售额</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(p, index) in productStats" :key="p.id">
            <td>{{ index + 1 }}</td>
            <td class="name-cell">{{ p.name }}</td>
            <td>{{ p.categoryLabel }}</td>
            <td>{{ p.unit === 'unit' ? '支' : '盒' }}</td>
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

@media (max-width: 1024px) {
  .product-analysis { grid-template-columns: 1fr; }
}
</style>
