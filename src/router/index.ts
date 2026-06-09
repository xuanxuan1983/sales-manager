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
            path: '/collagen-projects',
            name: 'collagen-projects',
            component: () => import('@/views/CollagenProjectBoard.vue'),
            meta: { title: '胶原项目总看板', icon: 'dashboard' }
        },
        {
            path: '/collagen-projects/follow-ups',
            name: 'collagen-project-follow-ups',
            component: () => import('@/views/CollagenFollowUps.vue'),
            meta: { title: '胶原项目跟进清单', icon: 'dashboard' }
        },
        {
            path: '/collagen-projects/monthly-review',
            name: 'collagen-project-monthly-review',
            component: () => import('@/views/CollagenMonthlyReview.vue'),
            meta: { title: '胶原项目月度复盘', icon: 'dashboard' }
        },
        {
            path: '/collagen-projects/new',
            name: 'collagen-project-new',
            component: () => import('@/views/CollagenProjectNew.vue'),
            meta: { title: '新增胶原项目', icon: 'dashboard' }
        },
        {
            path: '/collagen-projects/:id',
            name: 'collagen-project-detail',
            component: () => import('@/views/CollagenProjectDetail.vue'),
            meta: { title: '胶原项目详情', icon: 'dashboard' }
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
        },
        {
            path: '/udi/inbound',
            name: 'udi-inbound',
            component: () => import('@/views/UDIInbound.vue'),
            meta: { title: 'UDI 入库', icon: 'scan' }
        },
        {
            path: '/udi/trace',
            name: 'udi-trace',
            component: () => import('@/views/UDITrace.vue'),
            meta: { title: 'UDI 追溯', icon: 'search' }
        },
        {
            path: '/udi/adverse',
            name: 'udi-adverse',
            component: () => import('@/views/AdverseEventReport.vue'),
            meta: { title: '不良事件', icon: 'alert' }
        },
        {
            path: '/scan-verify',
            name: 'scan-verify',
            component: () => import('@/views/ScanVerify.vue'),
            meta: { title: '扫码验真', icon: 'scan' }
        }
    ]
})

export default router
