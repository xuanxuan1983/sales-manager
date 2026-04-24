<script setup lang="ts">
import { computed } from 'vue'
import { useSalesStore } from '@/stores/sales'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, PieChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components'
import VChart from 'vue-echarts'

use([CanvasRenderer, BarChart, PieChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent])

const salesStore = useSalesStore()

// 客户统计数据
const customerStats = computed(() => {
  const byCustomer: Record<string, { amount: number, count: number, products: Set<string> }> = {}
  
  salesStore.orders.forEach(o => {
    if (!byCustomer[o.customerName]) {
      byCustomer[o.customerName] = { amount: 0, count: 0, products: new Set() }
    }
    byCustomer[o.customerName].amount += o.totalAmount
    byCustomer[o.customerName].count += 1
    byCustomer[o.customerName].products.add(o.productName)
  })
  
  return Object.entries(byCustomer)
    .map(([name, data]) => ({ 
      name, 
      amount: data.amount,
      count: data.count,
      productCount: data.products.size,
      avgOrder: Math.round(data.amount / data.count)
    }))
    .sort((a, b) => b.amount - a.amount)
})

// 客户贡献排名
const contributionOption = computed(() => {
  const data = customerStats.value.slice(0, 10)
  return {
    title: { text: '客户贡献 TOP 10', left: 'center', textStyle: { fontSize: 16 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', axisLabel: { formatter: (v: number) => `¥${(v/1000).toFixed(0)}k` } },
    yAxis: { type: 'category', data: data.map(d => d.name).reverse(), axisLabel: { fontSize: 12 } },
    series: [{
      type: 'bar',
      data: data.map(d => d.amount).reverse(),
      itemStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [
            { offset: 0, color: '#11998e' },
            { offset: 1, color: '#38ef7d' }
          ]
        },
        borderRadius: [0, 8, 8, 0]
      },
      label: { show: true, position: 'right', formatter: (p: any) => `¥${(p.value/1000).toFixed(1)}k` }
    }],
    grid: { left: 80, right: 80, top: 60, bottom: 20 }
  }
})

// 客户订单分布
const orderDistOption = computed(() => {
  const data = customerStats.value.map(d => ({ name: d.name, value: d.count }))
  return {
    title: { text: '客户订单分布', left: 'center', textStyle: { fontSize: 16 } },
    tooltip: { trigger: 'item', formatter: '{b}<br/>{c} 单 ({d}%)' },
    legend: { bottom: 0, type: 'scroll' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: false }
    }],
    color: ['#11998e', '#38ef7d', '#4facfe', '#00f2fe', '#667eea', '#764ba2', '#f093fb', '#f5576c']
  }
})
</script>

<template>
  <div class="customer-analysis">
    <h2 class="page-title">👤 客户分析</h2>
    
    <!-- Customer Summary Cards -->
    <div class="summary-cards">
      <div class="summary-card" v-for="(customer, index) in customerStats.slice(0, 5)" :key="customer.name">
        <div class="customer-rank">TOP {{ index + 1 }}</div>
        <div class="customer-name">{{ customer.name }}</div>
        <div class="customer-amount">¥{{ customer.amount.toLocaleString() }}</div>
        <div class="customer-meta">
          <span>订单 {{ customer.count }} 单</span>
          <span>产品 {{ customer.productCount }} 款</span>
          <span>单均 ¥{{ customer.avgOrder.toLocaleString() }}</span>
        </div>
      </div>
    </div>

    <!-- Charts -->
    <div class="charts-row">
      <div class="chart-card">
        <v-chart :option="contributionOption" autoresize style="height: 400px" />
      </div>
      <div class="chart-card">
        <v-chart :option="orderDistOption" autoresize style="height: 400px" />
      </div>
    </div>

    <!-- Customer Table -->
    <div class="table-card">
      <h3>客户明细表</h3>
      <el-table :data="customerStats" stripe style="width: 100%">
        <el-table-column type="index" label="排名" width="80" />
        <el-table-column prop="name" label="客户名称" width="150" />
        <el-table-column prop="amount" label="累计销售额" width="150">
          <template #default="{ row }">
            <span style="color: #11998e; font-weight: 600">¥{{ row.amount.toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="count" label="订单数" width="100" align="center" />
        <el-table-column prop="productCount" label="产品数" width="100" align="center" />
        <el-table-column prop="avgOrder" label="平均订单" width="120">
          <template #default="{ row }">
            ¥{{ row.avgOrder.toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="客户等级" width="120">
          <template #default="{ row }">
            <el-tag 
              :type="row.amount >= 100000 ? 'danger' : row.amount >= 50000 ? 'warning' : 'info'"
              size="small"
            >
              {{ row.amount >= 100000 ? 'VIP' : row.amount >= 50000 ? '重点' : '普通' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.customer-analysis {
  padding: 20px;
}

.page-title {
  margin: 0 0 24px;
  font-size: 24px;
  color: #303133;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.summary-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  position: relative;
}

.customer-rank {
  position: absolute;
  top: 12px;
  right: 12px;
  background: linear-gradient(135deg, #11998e, #38ef7d);
  color: white;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}

.customer-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.customer-amount {
  font-size: 22px;
  font-weight: 700;
  color: #11998e;
}

.customer-meta {
  font-size: 11px;
  color: #909399;
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.chart-card, .table-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.table-card h3 {
  margin: 0 0 16px;
  font-size: 16px;
  color: #303133;
}

@media (max-width: 1200px) {
  .summary-cards {
    grid-template-columns: repeat(2, 1fr);
  }
  .charts-row {
    grid-template-columns: 1fr;
  }
}
</style>
