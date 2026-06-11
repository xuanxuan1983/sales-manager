<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const sidebarOpen = ref(false)
const isMobile = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 900
  if (!isMobile.value) sidebarOpen.value = false
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

// 底部导航只显示核心功能（微信习惯：5个以内）
const bottomNavItems = [
  { path: '/', name: '仪表盘', icon: '📊' },
  { path: '/scan-verify', name: '验真', icon: '🔐' },
  { path: '/udi/inbound', name: '入库', icon: '📦' },
  { path: '/udi/trace', name: '追溯', icon: '🔍' },
  { path: '/indicators', name: '指标', icon: '📈' }
]

// 侧边栏保留完整导航
const navItems = [
  { path: '/collagen-projects', name: '胶原项目总看板', icon: 'dashboard' },
  { path: '/collagen-projects/follow-ups', name: '胶原跟进清单', icon: 'list-check' },
  { path: '/collagen-projects/monthly-review', name: '胶原月度复盘', icon: 'bar-chart' },
  { path: '/targets', name: '目标指挥中心', icon: 'target' },
  { path: '/indicators', name: '指标管理', icon: 'bar-chart' },
  { path: '/', name: '实时仪表盘', icon: 'bar-chart-3' },
  { path: '/regions', name: '区域下钻分析', icon: 'map-pin' },
  { path: '/team', name: '团队管理', icon: 'users-2' },
  { path: '/clients', name: '客户资产', icon: 'database' },
  { path: '/products', name: '产品分析', icon: 'package' },
  { path: '/orders', name: '订单管理', icon: 'file-text' },
  { path: '/strategy', name: '战略沙盘', icon: 'grid' },
  { path: '/import', name: '数据导入', icon: 'upload' },
  { path: '/distributors', name: '代理商分级', icon: 'medal' },
  { path: '/headcount', name: '人员规划', icon: 'users' },
  { path: '/scan-verify', name: '扫码验真', icon: 'shield-check' },
  { path: '/udi/inbound', name: 'UDI 入库', icon: 'package' },
  { path: '/udi/trace', name: 'UDI 追溯', icon: 'scan' },
  { path: '/udi/adverse', name: '不良事件', icon: 'alert-triangle' }
]

const currentNav = computed(() => {
  const exactMatch = navItems.find(n => n.path === route.path)
  if (exactMatch) return exactMatch.name
  if (route.path.startsWith('/collagen-projects')) return '胶原项目总看板'
  return navItems.find(n => n.path === route.path)?.name || '销售系统'
})

const isNavActive = (path: string) => {
  if (path === '/') return route.path === '/'
  if (path === '/collagen-projects') {
    return route.path === '/collagen-projects' || route.path === '/collagen-projects/new' || /^\/collagen-projects\/cp-/.test(route.path)
  }
  return route.path === path || route.path.startsWith(`${path}/`)
}
</script>

<template>
  <div class="app-container">
    <!-- Mobile Header -->
    <header class="mobile-header" v-if="isMobile">
      <button class="menu-toggle" @click="sidebarOpen = !sidebarOpen">
        <span class="hamburger" :class="{ open: sidebarOpen }"></span>
      </button>
      <h2 class="mobile-brand">医美销售追溯</h2>
      <div class="mobile-actions">
        <button class="btn-icon">🔔</button>
      </div>
    </header>

    <!-- Sidebar Overlay -->
    <div 
      class="sidebar-overlay" 
      :class="{ open: sidebarOpen }" 
      @click="sidebarOpen = false"
    ></div>

    <!-- Sidebar (Desktop + Mobile Drawer) -->
    <nav class="sidebar" :class="{ open: sidebarOpen, mobile: isMobile }">
      <h2 class="brand">医美销售追溯 <span class="version">v2</span></h2>
      
      <div class="nav-menu">
        <router-link 
          v-for="item in navItems" 
          :key="item.path"
          :to="item.path"
          class="nav-link"
          :class="{ active: isNavActive(item.path) }"
          @click="sidebarOpen = false"
        >
          <span class="nav-text">{{ item.name }}</span>
        </router-link>
      </div>

      <div class="sidebar-footer">
        <a href="#" class="nav-link">⚙️ 系统设置</a>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="content" :class="{ mobile: isMobile }">
      <header class="header" v-if="!isMobile">
        <div class="header-left">
          <p class="header-subtitle">Medical Aesthetics Division</p>
          <h1 class="header-title">{{ currentNav }}</h1>
        </div>
        <div class="header-actions">
          <button class="btn-outline">Q4 报告下载</button>
          <button class="btn-primary">设定新目标</button>
        </div>
      </header>
      
      <!-- Mobile Page Title -->
      <div class="mobile-page-title" v-if="isMobile">
        <h1>{{ currentNav }}</h1>
      </div>
      
      <div class="page-content" :class="{ 'has-bottom-nav': isMobile }">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>

    <!-- Mobile Bottom Navigation (WeChat Style) -->
    <nav class="bottom-nav" v-if="isMobile">
      <router-link
        v-for="item in bottomNavItems"
        :key="item.path"
        :to="item.path"
        class="bottom-nav-item"
        :class="{ active: route.path === item.path }"
      >
        <span class="bottom-nav-icon">{{ item.icon }}</span>
        <span class="bottom-nav-text">{{ item.name }}</span>
      </router-link>
    </nav>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

:root {
  --bg: #F5F5F7;
  --card: #FFFFFF;
  --text: #1D1D1F;
  --accent: #0071E3;
  --secondary: #86868B;
  --border: #D2D2D7;
  --success: #1DB440;
  --warning: #FF9500;
  --danger: #EF4444;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body { 
  font-family: 'Inter', -apple-system, sans-serif; 
  background: var(--bg); 
  color: var(--text);
  line-height: 1.5;
  -webkit-tap-highlight-color: transparent;
}

.app-container {
  display: flex;
  min-height: 100vh;
}

/* ============ Sidebar ============ */
.sidebar {
  width: 260px;
  background: var(--card);
  border-right: 1px solid var(--border);
  padding: 32px 24px;
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.brand {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 40px;
  letter-spacing: -1px;
}

.version {
  font-weight: 300;
  opacity: 0.5;
}

.nav-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  text-decoration: none;
  color: var(--secondary);
  border-radius: 12px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 500;
  font-size: 14px;
  position: relative;
  overflow: hidden;
}

.nav-link::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 0;
  background: var(--accent);
  border-radius: 0 3px 3px 0;
  transition: height 0.25s ease;
}

.nav-link:hover {
  background: #f5f5f7;
  color: var(--text);
}

.nav-link:hover::before {
  height: 20px;
}

.nav-link.active {
  background: var(--text);
  color: #fff;
}

.nav-link.active::before {
  height: 24px;
}

.sidebar-footer {
  margin-top: auto;
}

/* ============ Main Content ============ */
.content {
  flex: 1;
  padding: 40px 60px;
  max-width: 1600px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 48px;
}

.header-subtitle {
  color: var(--secondary);
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.header-title {
  font-size: 32px;
  margin-top: 4px;
  font-weight: 600;
  letter-spacing: -0.5px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn-outline {
  padding: 12px 24px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: white;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-outline:hover {
  background: var(--bg);
}

.btn-primary {
  padding: 12px 24px;
  background: var(--text);
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-primary:hover {
  opacity: 0.85;
}

.page-content {
  /* Content area */
}

.page-content.has-bottom-nav {
  padding-bottom: 80px;
}

/* ============ Page Transition ============ */
.page-enter-active,
.page-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.page-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

/* ============ Mobile Header ============ */
.mobile-header {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: var(--card);
  border-bottom: 1px solid var(--border);
  z-index: 100;
  padding: 0 16px;
  align-items: center;
  justify-content: space-between;
}

.menu-toggle {
  width: 48px;
  height: 48px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.hamburger {
  display: block;
  width: 20px;
  height: 2px;
  background: var(--text);
  position: relative;
  transition: all 0.3s;
}

.hamburger::before,
.hamburger::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 2px;
  background: var(--text);
  transition: all 0.3s;
}

.hamburger::before { top: -6px; }
.hamburger::after { top: 6px; }

.hamburger.open {
  background: transparent;
}

.hamburger.open::before {
  transform: rotate(45deg);
  top: 0;
}

.hamburger.open::after {
  transform: rotate(-45deg);
  top: 0;
}

.mobile-brand {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.btn-icon {
  width: 48px;
  height: 48px;
  border: none;
  background: transparent;
  font-size: 20px;
  cursor: pointer;
}

/* ============ Sidebar Overlay ============ */
.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(4px);
  z-index: 90;
  opacity: 0;
  transition: opacity 0.3s;
}

.sidebar-overlay.open {
  opacity: 1;
}

/* ============ Mobile Page Title ============ */
.mobile-page-title {
  display: none;
  margin-bottom: 16px;
}

.mobile-page-title h1 {
  font-size: 24px;
  font-weight: 700;
}

/* ============ Bottom Navigation (WeChat Style) ============ */
.bottom-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(0,0,0,0.06);
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom);
}

.bottom-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  text-decoration: none;
  color: #9CA3AF;
  transition: all 0.2s;
  min-height: 56px;
  padding: 4px 0;
}

.bottom-nav-item.active {
  color: var(--accent);
}

.bottom-nav-icon {
  font-size: 22px;
  line-height: 1;
}

.bottom-nav-text {
  font-size: 11px;
  font-weight: 500;
}

/* ============ Responsive ============ */
@media (max-width: 1200px) {
  .sidebar { width: 220px; padding: 24px 16px; }
  .content { padding: 32px 40px; }
}

@media (max-width: 900px) {
  .mobile-header { display: flex; }
  
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 100;
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 4px 0 24px rgba(0,0,0,0.1);
  }
  
  .sidebar.open {
    transform: translateX(0);
  }
  
  .sidebar-overlay.open {
    display: block;
  }
  
  .content {
    padding: 72px 16px 24px;
    max-width: 100%;
  }
  
  .content.mobile {
    padding-top: 72px;
  }
  
  .header { display: none; }
  
  .mobile-page-title {
    display: block;
  }
  
  .header-title {
    font-size: 24px;
  }

  /* Show bottom nav */
  .bottom-nav {
    display: flex;
  }

  .page-content.has-bottom-nav {
    padding-bottom: 88px;
  }
}
</style>
