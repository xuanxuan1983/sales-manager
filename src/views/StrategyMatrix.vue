<script setup lang="ts">
import { computed } from 'vue'
import { useMedicalSalesStore } from '@/stores/medicalSales'

const store = useMedicalSalesStore()

// Product strategy data with BCG matrix positioning
const productStrategy = computed(() => {
  return store.products.map(p => {
    const orderItems = store.orders.flatMap(o => o.items).filter(i => i.productId === p.id)
    const totalAmount = orderItems.reduce((sum, i) => sum + i.totalAmount, 0)
    const totalQuantity = orderItems.reduce((sum, i) => sum + i.quantity, 0)
    
    // Simulate growth and profit metrics
    const growthRate = Math.random() * 100 // Simulated YoY growth
    const profitContribution = (totalAmount / (store.overallStats.totalAmount || 1)) * 100
    
    // Determine quadrant
    let quadrant: 'star' | 'cow' | 'question' | 'dog'
    if (growthRate >= 50 && profitContribution >= 15) quadrant = 'star'
    else if (growthRate < 50 && profitContribution >= 15) quadrant = 'cow'
    else if (growthRate >= 50 && profitContribution < 15) quadrant = 'question'
    else quadrant = 'dog'
    
    return {
      ...p,
      totalAmount,
      totalQuantity,
      growthRate: Math.round(growthRate),
      profitContribution: Math.round(profitContribution * 10) / 10,
      quadrant,
      // Position for bubble chart (bottom % and left %)
      bottom: Math.min(90, Math.max(10, growthRate)),
      left: Math.min(90, Math.max(10, profitContribution * 5)),
      size: Math.max(50, Math.min(120, totalQuantity / 2))
    }
  })
})

const stars = computed(() => productStrategy.value.filter(p => p.quadrant === 'star'))
const cows = computed(() => productStrategy.value.filter(p => p.quadrant === 'cow'))
const questions = computed(() => productStrategy.value.filter(p => p.quadrant === 'question'))
const dogs = computed(() => productStrategy.value.filter(p => p.quadrant === 'dog'))

// Simulated insights
const insights = {
  lostOpportunity: 342000,
  lowStockProduct: '少女针',
  promoProduct: '旧款面膜'
}
</script>

<template>
  <div class="strategy-page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">SKU 战略矩阵</h1>
        <p class="page-subtitle">基于 "增长率 vs 利润贡献" 的四象限分析</p>
      </div>
      <div class="tag-row">
        <span class="tag">🔵 现金牛 (高利低增)</span>
        <span class="tag">🟢 明星 (高利高增)</span>
        <span class="tag">🟠 问题 (低利高增)</span>
      </div>
    </div>

    <!-- Board Grid -->
    <div class="board-grid">
      <!-- Left: BCG Matrix -->
      <div class="matrix-card">
        <h3>产品分布全景</h3>
        <div class="chart-area">
          <div class="axis-y">← 销售增长率 (YoY)</div>
          <div class="mid-line-x"></div>
          <div class="mid-line-y"></div>
          
          <!-- Product Bubbles -->
          <div 
            v-for="p in productStrategy" 
            :key="p.id"
            class="bubble"
            :class="'b-' + p.quadrant"
            :style="{
              bottom: p.bottom + '%',
              left: p.left + '%',
              width: p.size + 'px',
              height: p.size + 'px'
            }"
          >
            {{ p.name.substring(0, 4) }}
          </div>
          
          <div class="axis-x">利润贡献率 →</div>
        </div>
      </div>

      <!-- Right: Insight Panel -->
      <div class="insight-panel">
        <div class="insight-card">
          <div class="insight-header">
            <span class="insight-icon">⚡</span>
            <span class="insight-title">连带率机会点</span>
          </div>
          <p class="insight-text">
            监测到 <strong>12家机构</strong> 采购了"水光机二代"但在过去 30 天内未采购配套针头。
          </p>
          <div class="alert-row">
            <div class="alert-content">
              <div class="alert-label">潜在流失额</div>
              <div class="alert-value">¥{{ insights.lostOpportunity.toLocaleString() }}</div>
            </div>
            <button class="alert-btn">生成跟进名单</button>
          </div>
        </div>

        <div class="insight-card">
          <div class="insight-header">
            <span class="insight-icon">📈</span>
            <span class="insight-title">库存周转建议</span>
          </div>
          <ul class="suggestion-list">
            <li>建议对 <strong>{{ insights.promoProduct }}</strong> 开启 85折 促销</li>
            <li><strong>{{ insights.lowStockProduct }}</strong> 库存不足 2周，建议补货</li>
          </ul>
        </div>

        <div class="insight-card">
          <div class="insight-header">
            <span class="insight-icon">📊</span>
            <span class="insight-title">象限统计</span>
          </div>
          <div class="quadrant-stats">
            <div class="qs-item">
              <span class="qs-dot star"></span>
              <span class="qs-label">明星产品</span>
              <span class="qs-value">{{ stars.length }}</span>
            </div>
            <div class="qs-item">
              <span class="qs-dot cow"></span>
              <span class="qs-label">现金牛</span>
              <span class="qs-value">{{ cows.length }}</span>
            </div>
            <div class="qs-item">
              <span class="qs-dot question"></span>
              <span class="qs-label">问题产品</span>
              <span class="qs-value">{{ questions.length }}</span>
            </div>
            <div class="qs-item">
              <span class="qs-dot dog"></span>
              <span class="qs-label">瘦狗</span>
              <span class="qs-value">{{ dogs.length }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.strategy-page {}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.page-subtitle {
  color: #86868B;
  font-size: 14px;
  margin-top: 4px;
}

.tag-row {
  display: flex;
  gap: 8px;
}

.tag {
  padding: 4px 8px;
  border-radius: 4px;
  background: #F2F2F7;
  font-size: 11px;
  color: #636366;
}

/* Board Grid */
.board-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}

/* Matrix Card */
.matrix-card {
  background: var(--card);
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.04);
}

.matrix-card h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 20px;
}

.chart-area {
  position: relative;
  height: 400px;
  border-left: 2px solid #E5E5EA;
  border-bottom: 2px solid #E5E5EA;
  margin-left: 40px;
}

.axis-y {
  position: absolute;
  left: -50px;
  top: 50%;
  transform: rotate(-90deg) translateX(50%);
  font-size: 12px;
  color: #86868B;
  font-weight: 600;
  white-space: nowrap;
}

.axis-x {
  position: absolute;
  bottom: -30px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: #86868B;
  font-weight: 600;
}

.mid-line-x {
  position: absolute;
  top: 50%;
  width: 100%;
  height: 1px;
  border-top: 1px dashed #C7C7CC;
}

.mid-line-y {
  position: absolute;
  left: 50%;
  height: 100%;
  width: 1px;
  border-left: 1px dashed #C7C7CC;
}

/* Product Bubbles */
.bubble {
  position: absolute;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  backdrop-filter: blur(4px);
  transform: translate(-50%, 50%);
}

.bubble:hover {
  transform: translate(-50%, 50%) scale(1.1);
  box-shadow: 0 8px 16px rgba(0,0,0,0.15);
  z-index: 10;
}

.b-star { background: rgba(52, 199, 89, 0.9); }
.b-cow { background: rgba(0, 113, 227, 0.9); }
.b-question { background: rgba(255, 149, 0, 0.9); }
.b-dog { background: rgba(255, 59, 48, 0.9); }

/* Insight Panel */
.insight-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.insight-card {
  background: var(--card);
  padding: 24px;
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.05);
}

.insight-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.insight-icon {
  font-size: 16px;
}

.insight-title {
  font-weight: 600;
}

.insight-text {
  font-size: 13px;
  color: #3A3A3C;
  line-height: 1.6;
}

.alert-row {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 16px;
  padding: 12px;
  background: #FFF4F4;
  border-radius: 8px;
  border-left: 4px solid #FF3B30;
}

.alert-content { flex: 1; }
.alert-label { font-size: 12px; font-weight: 700; color: #FF3B30; }
.alert-value { font-size: 16px; font-weight: 600; }

.alert-btn {
  border: none;
  background: white;
  color: #FF3B30;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
}

.suggestion-list {
  padding-left: 20px;
  font-size: 13px;
  color: #3A3A3C;
  line-height: 2;
}

.quadrant-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.qs-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.qs-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.qs-dot.star { background: rgba(52, 199, 89, 0.9); }
.qs-dot.cow { background: rgba(0, 113, 227, 0.9); }
.qs-dot.question { background: rgba(255, 149, 0, 0.9); }
.qs-dot.dog { background: rgba(255, 59, 48, 0.9); }

.qs-label { flex: 1; font-size: 13px; }
.qs-value { font-weight: 600; }

@media (max-width: 1024px) {
  .board-grid { grid-template-columns: 1fr; }
}
</style>
