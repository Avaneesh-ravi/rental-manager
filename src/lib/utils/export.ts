// src/lib/utils/export.ts
import { formatCurrency, formatDate, formatMonth } from './index'
import type { Payment, Property, Tenant } from '../types'

export async function exportPaymentsToPDF(
  payments: Payment[],
  title: string
): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF()

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('RentFlow — Property Management', 14, 20)

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(title, 14, 30)
  doc.text(`Generated: ${formatDate(new Date())}`, 14, 38)

  const tableData = payments.map(p => [
    p.propertyNumber,
    p.tenantName,
    formatMonth(p.month, p.year),
    formatCurrency(p.amount),
    p.status.toUpperCase(),
    p.paidDate ? formatDate(p.paidDate) : '—',
    p.notes || '—',
  ])

  autoTable(doc, {
    head: [['Property', 'Tenant', 'Month', 'Amount', 'Status', 'Paid Date', 'Notes']],
    body: tableData,
    startY: 45,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [220, 113, 26] },
  })

  const total = payments.reduce((s, p) => s + (p.status === 'paid' ? p.amount : (p.partialAmount || 0)), 0)
  const finalY = (doc as any).lastAutoTable?.finalY || 150
  doc.setFont('helvetica', 'bold')
  doc.text(`Total Collected: ${formatCurrency(total)}`, 14, finalY + 10)

  doc.save(`rentflow-report-${Date.now()}.pdf`)
}

export async function exportPaymentsToExcel(
  payments: Payment[],
  title: string
): Promise<void> {
  const XLSX = await import('xlsx')

  const data = payments.map(p => ({
    'Property No': p.propertyNumber,
    'Tenant Name': p.tenantName,
    'Month': formatMonth(p.month, p.year),
    'Rent Amount': p.amount,
    'Status': p.status.toUpperCase(),
    'Paid Date': p.paidDate ? formatDate(p.paidDate) : '',
    'Partial Amount': p.partialAmount || '',
    'Notes': p.notes || '',
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Payments')
  XLSX.writeFile(wb, `rentflow-payments-${Date.now()}.xlsx`)
}

export async function exportPropertiesToExcel(properties: Property[]): Promise<void> {
  const XLSX = await import('xlsx')

  const data = properties.map(p => ({
    'Property No': p.propertyNumber,
    'Type': p.type.toUpperCase(),
    'Address': p.address,
    'Monthly Rent': p.monthlyRent,
    'Area': p.area || '',
    'Notes': p.notes || '',
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Properties')
  XLSX.writeFile(wb, `rentflow-properties-${Date.now()}.xlsx`)
}
