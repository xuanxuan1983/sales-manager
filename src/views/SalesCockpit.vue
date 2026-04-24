<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useMedicalSalesStore } from '@/stores/medicalSales'

const store = useMedicalSalesStore()

// 1. Get Unique Sales Reps
const salesReps = computed(() => {
    return store.salespeople.map(s => s.name)
})

const selectedRep = ref('')

// 2. Personal Metrics
const myData = computed(() => {
    if (!selectedRep.value) return null
    
    // Aggregate data for this person
    const records = store.indicators.filter(i => i.salespersonName === selectedRep.value)
    
    let salesA = 0, targetA = 0
    let salesB = 0, targetB = 0
    let region = ''
    
    records.forEach(r => {
        salesA += r.salesAActual || 0
        targetA += r.salesATarget || 0
        salesB += r.salesBActual || 0
        targetB += r.salesBTarget || 0
        if(r.regionName) region = r.regionName
    })
    
    return {
        name: selectedRep.value,
        region,
        salesA, targetA,
        salesB, targetB,
        gapA: Math.max(0, targetA - salesA),
        gapB: Math.max(0, targetB - salesB)
    }
})

// 3. Time Logic for "Run Rate"
const today = new Date()
const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24)
const remainingDays = Math.max(1, 365 - dayOfYear)

const dailyRequiredA = computed(() => {
    if (!myData.value) return 0
    return Math.round((myData.value.gapA || 0) / remainingDays)
})

// Animation Composable
function useCountUp(target: () => number, duration = 1000) {
    const current = ref(0)
    
    watch(target, (newVal) => {
        const start = current.value
        const startTime = performance.now()
        
        const animate = (time: number) => {
            const timeFraction = Math.min((time - startTime) / duration, 1)
            const progress = 1 - Math.pow(1 - timeFraction, 3) // Cubic ease out
            
            current.value = Math.floor(start + (newVal - start) * progress)
            
            if (timeFraction < 1) {
                requestAnimationFrame(animate)
            }
        }
        requestAnimationFrame(animate)
    }, { immediate: true })
    
    return current
}

const animatedGap = useCountUp(() => myData.value?.gapA || 0)
const animatedRequired = useCountUp(() => dailyRequiredA.value)

</script>

<template>
  <div class="sales-cockpit">
    <transition name="fade-slide" mode="out-in">
        <!-- Login Simulation -->
        <div class="login-card" v-if="!selectedRep" key="login">
            <h2>👋 Welcome, Warrior!</h2>
            <p>请选择您的身份登入作战系统</p>
            <el-select v-model="selectedRep" placeholder="我是..." size="large" style="width: 200px">
                <el-option v-for="name in salesReps" :key="name" :label="name" :value="name" />
            </el-select>
        </div>

        <!-- Personal Dashboard -->
        <div class="dashboard" v-else key="dashboard">
            <div class="header">
                <div>
                    <h1>{{ selectedRep }} 的作战地图</h1>
                    <p class="subtitle">{{ myData?.region }}大区 | 剩余作战日: {{ remainingDays }}天</p>
                </div>
                <el-button @click="selectedRep = ''" circle>🔄</el-button>
            </div>

            <!-- HERO CARD: GAP TO GO -->
            <div class="hero-card" :class="{ 'danger': (myData?.gapA || 0) > 0, 'success': (myData?.gapA || 0) === 0 }">
                <div class="label">Sales-A 年度缺口 (Gap To Go)</div>
                <div class="value">¥{{ animatedGap.toLocaleString() }}</div>
                <div class="sub-value" v-if="(myData?.gapA || 0) > 0">
                    🔥 每天需完成: <span class="highlight">¥{{ animatedRequired.toLocaleString() }}</span>
                </div>
                <div class="sub-value" v-else>
                    🎉 目标已达成！继续冲刺！
                </div>
            </div>

            <!-- Metric Details -->
            <div class="metrics-grid">
                <!-- Sales A -->
                <div class="card">
                    <h3>渠道进货 (Sales A)</h3>
                    <el-progress type="dashboard" :percentage="Math.min(100, Math.round((myData?.salesA || 0)/(myData?.targetA || 1)*100))" 
                        :color="(myData?.salesA || 0) >= (myData?.targetA || 0) ? '#67C23A' : '#E6A23C'"
                    >
                        <template #default="{ percentage }">
                            <span class="percentage-value">{{ percentage }}%</span>
                            <span class="percentage-label">达成率</span>
                        </template>
                    </el-progress>
                    <div class="details">
                        <div class="row"><span>实绩:</span> <b>{{ myData?.salesA }}</b></div>
                        <div class="row"><span>目标:</span> <b>{{ myData?.targetA }}</b></div>
                    </div>
                </div>

                <!-- Sales B -->
                 <div class="card">
                    <h3>纯销 (Sales B)</h3>
                    <el-progress type="dashboard" :percentage="Math.min(100, Math.round((myData?.salesB || 0)/(myData?.targetB || 1)*100))" 
                         :color="(myData?.salesB || 0) >= (myData?.targetB || 0) ? '#67C23A' : '#0071E3'"
                    >
                         <template #default="{ percentage }">
                            <span class="percentage-value">{{ percentage }}%</span>
                            <span class="percentage-label">达成率</span>
                        </template>
                    </el-progress>
                     <div class="details">
                        <div class="row"><span>实绩:</span> <b>{{ myData?.salesB }}</b></div>
                        <div class="row"><span>目标:</span> <b>{{ myData?.targetB }}</b></div>
                    </div>
                </div>
            </div>
        </div>
    </transition>
  </div>
</template>

<style scoped>
/* Previous Styles */
.sales-cockpit {
    max-width: 600px; /* Mobile Friendly width */
    margin: 0 auto;
    padding: 20px;
    background: #f5f7fa;
    min-height: 80vh;
}

.login-card {
    text-align: center;
    padding: 60px 20px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    margin-top: 50px;
}

.hero-card {
    background: white;
    padding: 30px;
    border-radius: 16px;
    margin-bottom: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    text-align: center;
    border-left: 6px solid #ccc;
    transition: all 0.3s ease;
}
.hero-card:active {
    transform: scale(0.98);
}
.hero-card.danger { border-left-color: #F56C6C; }
.hero-card.success { border-left-color: #67C23A; }

.hero-card .value {
    font-size: 40px;
    font-weight: 800;
    margin: 10px 0;
    color: #303133;
    /* Monospace for stable number animation */
    font-variant-numeric: tabular-nums; 
}
.hero-card .highlight {
    color: #F56C6C;
    font-weight: bold;
    font-size: 18px;
    font-variant-numeric: tabular-nums;
}

.metrics-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

/* Mobile Responsive */
@media (max-width: 480px) {
    .metrics-grid {
        grid-template-columns: 1fr;
    }
    .hero-card .value {
        font-size: 32px;
    }
}

.card {
    background: white;
    padding: 20px;
    border-radius: 12px;
    text-align: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.card h3 { font-size: 14px; margin-bottom: 16px; color: #666; }

.row { display: flex; justify-content: space-between; font-size: 14px; margin-top: 8px; border-bottom: 1px dashed #eee; padding-bottom: 4px; }

/* Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.5s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
