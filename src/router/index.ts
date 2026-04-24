import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/indicators',
            name: 'indicators',
            component: () => import('@/views/IndicatorCenter.vue'),
            meta: { title: '指标管理', icon: 'bar-chart' }
        },
        {
            path: '/',
            name: 'dashboard',
            component: () => import('@/views/Dashboard.vue'),
            meta: { title: '销售仪表盘', icon: '📊' }
        },
        {
            path: '/targets',
            name: 'targets',
            component: () => import('@/views/TargetManagement.vue'),
            meta: { title: '目标指挥中心', icon: '🎯' }
        },
        {
            path: '/sales',
            name: 'sales',
            component: () => import('@/views/SalesCockpit.vue'),
            meta: { title: '销售作战室', icon: '⚔️' }
        },

        {
            path: '/regions',
            name: 'regions',
            component: () => import('@/views/RegionAnalysis.vue'),
            meta: { title: '区域分析', icon: '🏢' }
        },
        {
            path: '/team',
            name: 'team',
            component: () => import('@/views/TeamPerformance.vue'),
            meta: { title: '团队管理', icon: '👔' }
        },
        {
            path: '/clients',
            name: 'clients',
            component: () => import('@/views/ClientManagement.vue'),
            meta: { title: '客户管理', icon: '🏥' }
        },
        {
            path: '/products',
            name: 'products',
            component: () => import('@/views/ProductAnalysis.vue'),
            meta: { title: '产品分析', icon: '📦' }
        },
        {
            path: '/orders',
            name: 'orders',
            component: () => import('@/views/OrderList.vue'),
            meta: { title: '订单管理', icon: '📋' }
        },

        {
            path: '/strategy',
            name: 'strategy',
            component: () => import('@/views/StrategyMatrix.vue'),
            meta: { title: '战略沙盘', icon: 'grid' }
        },
        {
            path: '/import',
            name: 'import',
            component: () => import('@/views/DataImport.vue'),
            meta: { title: '数据导入', icon: 'upload' }
        },

        {
            path: '/distributors',
            name: 'distributors',
            component: () => import('@/views/DistributorManagement.vue'),
            meta: { title: '代理商分级', icon: 'medal' }
        },
        {
            path: '/headcount',
            name: 'headcount',
            component: () => import('@/views/HeadcountPlanning.vue'),
            meta: { title: '人员规划', icon: 'user' }
        }
    ]
})

export default router
