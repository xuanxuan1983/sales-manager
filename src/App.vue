<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const navItems = [
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
  { path: '/headcount', name: '人员规划', icon: 'users' }
]

const currentNav = computed(() => navItems.find(n => n.path === route.path)?.name || '销售系统')
</script>

<template>
  <div class="app-container">
    <!-- Sidebar -->
    <nav class="sidebar">
      <h2 class="brand">DermAnalytics <span class="version">v2</span></h2>
      
      <div class="nav-menu">
        <router-link 
          v-for="item in navItems" 
          :key="item.path"
          :to="item.path"
          class="nav-link"
          :class="{ active: route.path === item.path }"
        >
          <span class="nav-text">{{ item.name }}</span>
        </router-link>
      </div>

      <div class="sidebar-footer">
        <a href="#" class="nav-link">系统设置</a>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="content">
      <header class="header">
        <div class="header-left">
          <p class="header-subtitle">Medical Aesthetics Division</p>
          <h1 class="header-title">{{ currentNav }}</h1>
        </div>
        <div class="header-actions">
          <button class="btn-outline">Q4 报告下载</button>
          <button class="btn-primary">设定新目标</button>
        </div>
      </header>
      
      <div class="page-content">
        <router-view />
      </div>
    </main>
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
}

.app-container {
  display: flex;
  min-height: 100vh;
}

/* Sidebar */
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
  transition: all 0.3s;
  font-weight: 500;
  font-size: 14px;
}

.nav-link:hover {
  background: #f5f5f7;
  color: var(--text);
}

.nav-link.active {
  background: var(--text);
  color: #fff;
}

.sidebar-footer {
  margin-top: auto;
}

/* Main Content */
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

@media (max-width: 1200px) {
  .sidebar { width: 220px; padding: 24px 16px; }
  .content { padding: 32px 40px; }
}

@media (max-width: 900px) {
  .sidebar { display: none; }
  .content { padding: 24px; }
  .header { flex-direction: column; gap: 16px; align-items: flex-start; }
}
</style>
