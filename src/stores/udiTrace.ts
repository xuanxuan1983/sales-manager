import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ProductBatch, TraceRecord, ExpiryAlert, ExpiryAlertLevel } from '@/types/sales'

export const useUDITraceStore = defineStore('udiTrace', () => {
    // ========== State ==========
    const batches = ref<ProductBatch[]>([
        // Demo data
        {
            id: 'B001',
            productId: 'P001',
            batchNo: 'TXF-20260115-A',
            productionDate: '2026-01-15',
            expiryDate: '2028-01-14',
            quantity: 500,
            remaining: 320,
            udiList: [],
            storageTemp: '2-8°C',
            status: 'in_stock'
        },
        {
            id: 'B002',
            productId: 'P001',
            batchNo: 'TXF-20260320-B',
            productionDate: '2026-03-20',
            expiryDate: '2027-09-19',
            quantity: 300,
            remaining: 280,
            udiList: [],
            storageTemp: '2-8°C',
            status: 'in_stock'
        },
        {
            id: 'B003',
            productId: 'P002',
            batchNo: 'TXF-20251010-C',
            productionDate: '2025-10-10',
            expiryDate: '2026-07-09',
            quantity: 200,
            remaining: 45,
            udiList: [],
            storageTemp: '2-8°C',
            status: 'in_stock'
        }
    ])

    const traceRecords = ref<TraceRecord[]>([
        {
            id: 'T001',
            udiDi: '6973894820001',
            udiPi: 'TXF-20260115-A-001',
            batchNo: 'TXF-20260115-A',
            serialNo: '001',
            productId: 'P001',
            productName: '天新福胶原蛋白植入剂 1ml',
            from: '天新福工厂仓库',
            to: '北京美莱医疗美容医院',
            toType: 'hospital',
            operation: 'outbound',
            quantity: 1,
            timestamp: '2026-04-10T09:30:00Z',
            operator: '张仓库',
            orderId: 'O20260410001'
        },
        {
            id: 'T002',
            udiDi: '6973894820001',
            udiPi: 'TXF-20260115-A-002',
            batchNo: 'TXF-20260115-A',
            serialNo: '002',
            productId: 'P001',
            productName: '天新福胶原蛋白植入剂 1ml',
            from: '天新福工厂仓库',
            to: '上海华美医疗美容门诊部',
            toType: 'clinic',
            operation: 'outbound',
            quantity: 1,
            timestamp: '2026-04-12T14:20:00Z',
            operator: '李仓库',
            orderId: 'O20260412002'
        }
    ])

    // ========== Computed ==========

    /** 效期预警计算 */
    const expiryAlerts = computed<ExpiryAlert[]>(() => {
        const today = new Date()
        const alerts: ExpiryAlert[] = []

        batches.value.forEach(batch => {
            if (batch.status === 'expired' || batch.status === 'sold_out') return

            const expiry = new Date(batch.expiryDate)
            const diffMs = expiry.getTime() - today.getTime()
            const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

            let alertLevel: ExpiryAlertLevel | null = null

            if (daysUntil < 0) {
                alertLevel = 'critical'  // 已过期
            } else if (daysUntil <= 90) {
                alertLevel = 'critical'  // 3个月内
            } else if (daysUntil <= 180) {
                alertLevel = 'warning'   // 6个月内
            }

            if (alertLevel) {
                alerts.push({
                    id: `EA-${batch.id}`,
                    batchId: batch.id,
                    batchNo: batch.batchNo,
                    productId: batch.productId,
                    productName: getProductName(batch.productId),
                    expiryDate: batch.expiryDate,
                    remainingQuantity: batch.remaining,
                    daysUntilExpiry: daysUntil,
                    alertLevel,
                    createdAt: today.toISOString(),
                    isAcknowledged: false
                })
            }
        })

        return alerts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
    })

    /** 预警统计 */
    const alertStats = computed(() => {
        const critical = expiryAlerts.value.filter(a => a.alertLevel === 'critical').length
        const warning = expiryAlerts.value.filter(a => a.alertLevel === 'warning').length
        return { critical, warning, total: critical + warning }
    })

    /** 按批次查询流向 */
    const getTraceByBatch = (batchNo: string) => {
        return traceRecords.value.filter(t => t.batchNo === batchNo)
    }

    /** 按UDI查询全链路 */
    const getTraceByUDI = (udiPi: string) => {
        return traceRecords.value.filter(t => t.udiPi === udiPi)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    }

    /** 按产品查询所有批次 */
    const getBatchesByProduct = (productId: string) => {
        return batches.value.filter(b => b.productId === productId)
    }

    // ========== Actions ==========

    /** 入库：新增批次 */
    const addBatch = (batch: ProductBatch) => {
        batches.value.push(batch)
    }

    /** 出库：记录追溯 */
    const recordOutbound = (record: TraceRecord) => {
        traceRecords.value.push(record)
        // 扣减库存
        const batch = batches.value.find(b => b.batchNo === record.batchNo)
        if (batch) {
            batch.remaining = Math.max(0, batch.remaining - record.quantity)
            if (batch.remaining === 0) batch.status = 'sold_out'
        }
    }

    /** 退货：记录并恢复库存 */
    const recordReturn = (record: TraceRecord) => {
        traceRecords.value.push(record)
        const batch = batches.value.find(b => b.batchNo === record.batchNo)
        if (batch) {
            batch.remaining += record.quantity
            if (batch.status === 'sold_out') batch.status = 'in_stock'
        }
    }

    /** 确认预警 */
    const acknowledgeAlert = (alertId: string) => {
        // 实际应用中这里会更新后端状态
        console.log('Acknowledged alert:', alertId)
    }

    /** 扫码入库（预留接口） */
    const scanInbound = async (dataMatrixContent: string) => {
        // TODO: 解析 DataMatrix 内容，提取 UDI-DI + UDI-PI
        // GS1 格式: (01)6973894820001(11)260115(17)280114(10)TXF-A(21)001
        console.log('Scanning:', dataMatrixContent)
        return null
    }

    // Helper
    function getProductName(productId: string): string {
        const names: Record<string, string> = {
            P001: '天新福胶原蛋白植入剂 1ml',
            P002: '天新福胶原蛋白植入剂 0.5ml'
        }
        return names[productId] || '未知产品'
    }

    return {
        batches,
        traceRecords,
        expiryAlerts,
        alertStats,
        getTraceByBatch,
        getTraceByUDI,
        getBatchesByProduct,
        addBatch,
        recordOutbound,
        recordReturn,
        acknowledgeAlert,
        scanInbound
    }
})
