import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SalesOrder, SalesStats } from '@/types/sales'

// Mock data for demonstration
const generateMockData = (): SalesOrder[] => {
    const products = ['产品A', '产品B', '产品C', '产品D', '产品E']
    const customers = ['客户甲', '客户乙', '客户丙', '客户丁', '客户戊']
    const salespeople = ['张三', '李四', '王五', '赵六']
    const statuses: SalesOrder['status'][] = ['pending', 'confirmed', 'shipped', 'completed']

    return Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        orderNo: `SO${String(2024001 + i).padStart(7, '0')}`,
        customerName: customers[Math.floor(Math.random() * customers.length)],
        productName: products[Math.floor(Math.random() * products.length)],
        quantity: Math.floor(Math.random() * 100) + 1,
        unitPrice: Math.floor(Math.random() * 500) + 50,
        get totalAmount() { return this.quantity * this.unitPrice },
        salesperson: salespeople[Math.floor(Math.random() * salespeople.length)],
        orderDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        remark: ''
    }))
}

export const useSalesStore = defineStore('sales', () => {
    const orders = ref<SalesOrder[]>(generateMockData())

    const stats = computed<SalesStats>(() => {
        const list = orders.value
        const totalAmount = list.reduce((sum, o) => sum + o.totalAmount, 0)
        return {
            totalOrders: list.length,
            totalAmount,
            totalQuantity: list.reduce((sum, o) => sum + o.quantity, 0),
            averageOrderValue: list.length ? Math.round(totalAmount / list.length) : 0
        }
    })

    const addOrder = (order: Omit<SalesOrder, 'id' | 'orderNo' | 'totalAmount'>) => {
        const maxId = orders.value.reduce((max, o) => Math.max(max, o.id), 0)
        const newOrder: SalesOrder = {
            ...order,
            id: maxId + 1,
            orderNo: `SO${String(2024001 + maxId).padStart(7, '0')}`,
            totalAmount: order.quantity * order.unitPrice
        }
        orders.value.unshift(newOrder)
        return newOrder
    }

    const updateOrder = (id: number, data: Partial<SalesOrder>) => {
        const index = orders.value.findIndex(o => o.id === id)
        if (index !== -1) {
            const updated = { ...orders.value[index], ...data }
            if (data.quantity !== undefined || data.unitPrice !== undefined) {
                updated.totalAmount = updated.quantity * updated.unitPrice
            }
            orders.value[index] = updated
        }
    }

    const deleteOrder = (ids: number[]) => {
        orders.value = orders.value.filter(o => !ids.includes(o.id))
    }

    return { orders, stats, addOrder, updateOrder, deleteOrder }
})
