import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import type { SalesOrder } from '@/types/sales'

const statusMap: Record<SalesOrder['status'], string> = {
    pending: '待确认',
    confirmed: '已确认',
    shipped: '已发货',
    completed: '已完成',
    cancelled: '已取消'
}

export const exportToExcel = (data: SalesOrder[], filename = '销售订单') => {
    const exportData = data.map(order => ({
        '订单编号': order.orderNo,
        '客户名称': order.customerName,
        '产品名称': order.productName,
        '数量': order.quantity,
        '单价': order.unitPrice,
        '总金额': order.totalAmount,
        '业务员': order.salesperson,
        '订单日期': order.orderDate,
        '状态': statusMap[order.status],
        '备注': order.remark || ''
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '销售订单')

    // Set column widths
    worksheet['!cols'] = [
        { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 8 },
        { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
        { wch: 10 }, { wch: 20 }
    ]

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`)
}

export const exportToCSV = (data: SalesOrder[], filename = '销售订单') => {
    const exportData = data.map(order => ({
        '订单编号': order.orderNo,
        '客户名称': order.customerName,
        '产品名称': order.productName,
        '数量': order.quantity,
        '单价': order.unitPrice,
        '总金额': order.totalAmount,
        '业务员': order.salesperson,
        '订单日期': order.orderDate,
        '状态': statusMap[order.status],
        '备注': order.remark || ''
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const csv = XLSX.utils.sheet_to_csv(worksheet)
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    saveAs(blob, `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
}
