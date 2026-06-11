import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AdverseEvent, AdverseEventFilter, AdverseEventStatus } from '@/types/sales'
import { sendNotification, createSevereAlertMessage, notifyBatchEvents } from '@/utils/notification'

export const useAdverseEventStore = defineStore('adverseEvent', () => {
    // ========== State ==========
    const events = ref<AdverseEvent[]>([
        // Demo data
        {
            id: 'AE001',
            reportNo: 'AE-20260415-001',
            reportDate: '2026-04-15',
            reporter: '王医生',
            reporterContact: '138****8888',
            patientAge: 32,
            patientGender: 'female',
            productId: 'P001',
            productName: '胶原蛋白植入剂 1ml',
            udiDi: '6973894820001',
            udiPi: 'GEN-20260115-A-015',
            batchNo: 'GEN-20260115-A',
            serialNo: '015',
            eventType: 'allergy',
            eventDate: '2026-04-14',
            eventDescription: '注射后24小时出现局部红肿、瘙痒，伴轻微发热（37.8°C）',
            treatmentDescription: '口服氯雷他定10mg qd，局部冷敷，48小时后症状缓解',
            severity: 'mild',
            outcome: 'recovered',
            institutionName: '北京美莱医疗美容医院',
            institutionType: 'hospital',
            operatorName: '李主任',
            status: 'closed',
            closedDate: '2026-04-17',
            remark: '患者有青霉素过敏史，术前未充分告知'
        },
        {
            id: 'AE002',
            reportNo: 'AE-20260420-002',
            reportDate: '2026-04-20',
            reporter: '张护士',
            reporterContact: '139****6666',
            patientAge: 28,
            patientGender: 'female',
            productId: 'P001',
            productName: '胶原蛋白植入剂 1ml',
            udiDi: '6973894820001',
            udiPi: 'GEN-20260115-A-042',
            batchNo: 'GEN-20260115-A',
            serialNo: '042',
            eventType: 'nodule',
            eventDate: '2026-04-18',
            eventDescription: '注射鼻唇沟2周后出现可触及硬结，直径约5mm，无压痛',
            treatmentDescription: '观察中，建议热敷按摩，如未消退考虑透明质酸酶注射',
            severity: 'moderate',
            outcome: 'recovering',
            institutionName: '上海华美医疗美容门诊部',
            institutionType: 'clinic',
            operatorName: '陈医师',
            status: 'investigating'
        }
    ])

    const filter = ref<AdverseEventFilter>({
        keyword: '',
        eventType: '',
        severity: '',
        status: '',
        dateRange: null,
        batchNo: ''
    })

    // ========== Computed ==========
    const filteredEvents = computed(() => {
        return events.value.filter(e => {
            if (filter.value.keyword) {
                const kw = filter.value.keyword.toLowerCase()
                const match = e.reportNo.toLowerCase().includes(kw) ||
                    e.institutionName.toLowerCase().includes(kw) ||
                    e.productName.toLowerCase().includes(kw) ||
                    e.eventDescription.toLowerCase().includes(kw)
                if (!match) return false
            }
            if (filter.value.eventType && e.eventType !== filter.value.eventType) return false
            if (filter.value.severity && e.severity !== filter.value.severity) return false
            if (filter.value.status && e.status !== filter.value.status) return false
            if (filter.value.batchNo && !e.batchNo.includes(filter.value.batchNo)) return false
            if (filter.value.dateRange) {
                const [start, end] = filter.value.dateRange
                if (start && e.eventDate < start) return false
                if (end && e.eventDate > end) return false
            }
            return true
        }).sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime())
    })

    const stats = computed(() => {
        const total = events.value.length
        const investigating = events.value.filter(e => e.status === 'investigating').length
        const reported = events.value.filter(e => e.status === 'reported').length
        const closed = events.value.filter(e => e.status === 'closed').length
        const severe = events.value.filter(e => e.severity === 'severe' || e.severity === 'life_threatening').length
        return { total, investigating, reported, closed, severe }
    })

    const getEventsByBatch = (batchNo: string) => {
        return events.value.filter(e => e.batchNo === batchNo)
    }

    const getEventsByUDI = (udiPi: string) => {
        return events.value.filter(e => e.udiPi === udiPi)
    }

    // ========== Actions ==========
    // 告警接收人（实际项目中从配置读取）
    const alertRecipients = {
        emails: ['safety@dermanalytics.com', 'manager@dermanalytics.com'],
        phones: ['13800138000']
    }

    const addEvent = (event: AdverseEvent) => {
        events.value.unshift(event)

        // 严重事件自动告警
        if (event.severity === 'severe' || event.severity === 'life_threatening') {
            const { subject, content } = createSevereAlertMessage({
                reportNo: event.reportNo,
                eventType: getEventTypeLabel(event.eventType),
                severity: getSeverityLabel(event.severity),
                institutionName: event.institutionName,
                eventDescription: event.eventDescription,
                batchNo: event.batchNo,
                udiPi: event.udiPi
            })

            sendNotification({
                to: [...alertRecipients.emails, ...alertRecipients.phones],
                subject,
                content,
                type: 'both'
            })
        }

        // 检查同批次是否已有其他事件（批次关联告警）
        const sameBatchEvents = events.value.filter(e =>
            e.batchNo === event.batchNo && e.id !== event.id && e.status !== 'closed'
        )
        if (sameBatchEvents.length >= 2) {
            notifyBatchEvents(
                [event, ...sameBatchEvents].slice(0, 5),
                alertRecipients.emails
            )
        }
    }

    function getEventTypeLabel(type: string): string {
        const map: Record<string, string> = {
            infection: '感染', allergy: '过敏反应', nodule: '结节/硬结',
            vascular: '血管栓塞', asymmetry: '不对称/畸形', other: '其他'
        }
        return map[type] || type
    }

    function getSeverityLabel(sev: string): string {
        const map: Record<string, string> = {
            mild: '轻度', moderate: '中度', severe: '重度', life_threatening: '危及生命'
        }
        return map[sev] || sev
    }

    const updateStatus = (id: string, status: AdverseEventStatus, remark?: string) => {
        const event = events.value.find(e => e.id === id)
        if (event) {
            event.status = status
            if (remark) event.remark = remark
            if (status === 'closed') event.closedDate = new Date().toISOString().split('T')[0]
        }
    }

    const generateReportNo = () => {
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
        const count = events.value.filter(e => e.reportNo.includes(date)).length + 1
        return `AE-${date}-${String(count).padStart(3, '0')}`
    }

    return {
        events,
        filter,
        filteredEvents,
        stats,
        getEventsByBatch,
        getEventsByUDI,
        addEvent,
        updateStatus,
        generateReportNo
    }
})
