'use client'
import { useEffect, useState, useCallback } from 'react'
import { Download, FileSpreadsheet, FileText, Calendar, TrendingUp } from 'lucide-react'
import { getProperties } from '@/lib/firebase/properties'
import { getPaymentsByTenant } from '@/lib/firebase/payments'
import { getActiveTenants, getTenants } from '@/lib/firebase/tenants'
import type { Property, Tenant, Payment } from '@/lib/types'
import { formatCurrency, cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

interface PropertyRow {
  property: Property
  tenant: Tenant | null
  monthly: (number | null)[]  // index 0-11 = Jan-Dec
  total: number
}

export default function AnnualReportPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [props, tens] = await Promise.all([getProperties(), getTenants()])
      // Fetch payments for every tenant and filter to the selected year
      const allPays = (
        await Promise.all(tens.map(t => getPaymentsByTenant(t.id)))
      ).flat().filter(pay => pay.year === year)
      setProperties(props)
      setTenants(tens)
      setPayments(allPays)
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => { load() }, [load])

  const rows: PropertyRow[] = properties.map(p => {
    const tenant = tenants.find(t => t.propertyId === p.id) ?? null
    const monthly: (number | null)[] = Array(12).fill(null)
    payments
      .filter(pay => pay.propertyId === p.id)
      .forEach(pay => {
        const m = pay.month - 1  // Payment.month is 1-12, array is 0-11
        monthly[m] = (monthly[m] ?? 0) + pay.amount
      })
    const total = monthly.reduce<number>((s, v) => s + (v ?? 0), 0)
    return { property: p, tenant, monthly, total }
  })

  const monthTotals = MONTHS.map((_, mi) =>
    rows.reduce((s, r) => s + (r.monthly[mi] ?? 0), 0)
  )
  const grandTotal = rows.reduce((s, r) => s + r.total, 0)
  const expectedAnnual = properties.reduce((s, p) => s + p.monthlyRent * 12, 0)
  const collectionRate = expectedAnnual > 0 ? Math.round((grandTotal / expectedAnnual) * 100) : 0

  // ── Excel Export ──────────────────────────────────────────────────────────
  const exportExcel = async () => {
    setExporting(true)
    try {
      const XLSX = await import('xlsx')
      const wsData: (string | number)[][] = [
        [`Annual Rent Report — ${year}`],
        [],
        ['Property', 'Type', 'Tenant', 'Rent/mo', ...MONTHS, 'Total'],
        ...rows.map(r => [
          r.property.propertyNumber,
          r.property.type,
          r.tenant?.fullName ?? 'Vacant',
          r.property.monthlyRent,
          ...r.monthly.map(v => v ?? 0),
          r.total,
        ]),
        [],
        ['', '', '', 'Monthly Total', ...monthTotals, grandTotal],
      ]
      const ws = XLSX.utils.aoa_to_sheet(wsData)
      // Column widths
      ws['!cols'] = [{ wch: 14 }, { wch: 8 }, { wch: 20 }, { wch: 10 },
        ...MONTHS.map(() => ({ wch: 9 })), { wch: 12 }]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, `Report ${year}`)
      XLSX.writeFile(wb, `rent-report-${year}.xlsx`)
      toast.success('Excel exported!')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  // ── PDF Export ─────────────────────────────────────────────────────────────
  const exportPDF = async () => {
    setExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(`Annual Rent Report — ${year}`, 14, 16)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(`Generated on ${new Date().toLocaleDateString()}  ·  Collection Rate: ${collectionRate}%  ·  Total Collected: ${formatCurrency(grandTotal)}`, 14, 23)

      autoTable(doc, {
        startY: 28,
        head: [['Property', 'Type', 'Tenant', 'Rent/mo', ...MONTHS, 'Total']],
        body: [
          ...rows.map(r => [
            r.property.propertyNumber,
            r.property.type,
            r.tenant?.fullName ?? 'Vacant',
            formatCurrency(r.property.monthlyRent),
            ...r.monthly.map(v => v ? formatCurrency(v) : '—'),
            formatCurrency(r.total),
          ]),
          ['', '', '', 'Total', ...monthTotals.map(t => formatCurrency(t)), formatCurrency(grandTotal)],
        ],
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [120, 90, 60], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [250, 248, 245] },
        footStyles: { fillColor: [240, 235, 228], fontStyle: 'bold' },
      })

      doc.save(`rent-report-${year}.pdf`)
      toast.success('PDF exported!')
    } catch {
      toast.error('PDF export failed')
    } finally {
      setExporting(false)
    }
  }

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Annual Report</h1>
          <p className="text-stone-500 text-sm mt-1">Full year payment history for accounting & tax</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Year picker */}
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-stone-200 text-sm bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
          >
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={exportExcel} disabled={exporting || loading} className="btn-secondary flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export Excel
          </button>
          <button onClick={exportPDF} disabled={exporting || loading} className="btn-primary flex items-center gap-2">
            <FileText className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-stone-500 mb-1">Year</p>
          <p className="text-2xl font-bold text-stone-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand-400" />{year}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-stone-500 mb-1">Total Collected</p>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(grandTotal)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-stone-500 mb-1">Expected Annual</p>
          <p className="text-2xl font-bold text-stone-700">{formatCurrency(expectedAnnual)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-stone-500 mb-1">Collection Rate</p>
          <p className={cn('text-2xl font-bold flex items-center gap-1',
            collectionRate >= 90 ? 'text-emerald-600' : collectionRate >= 70 ? 'text-amber-600' : 'text-red-500'
          )}>
            <TrendingUp className="w-5 h-5" />{collectionRate}%
          </p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-stone-200 animate-pulse rounded-lg" />)}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                <th className="text-left px-3 py-3 font-semibold text-stone-500 uppercase tracking-wide sticky left-0 bg-stone-50">Property</th>
                <th className="text-left px-3 py-3 font-semibold text-stone-500 uppercase tracking-wide">Tenant</th>
                <th className="text-right px-3 py-3 font-semibold text-stone-500 uppercase tracking-wide">Rent/mo</th>
                {MONTHS.map(m => (
                  <th key={m} className="text-right px-2 py-3 font-semibold text-stone-500 uppercase tracking-wide">{m}</th>
                ))}
                <th className="text-right px-3 py-3 font-semibold text-stone-500 uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {rows.map(({ property: p, tenant, monthly, total }) => (
                <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-3 py-2.5 sticky left-0 bg-white font-semibold text-stone-900">{p.propertyNumber}</td>
                  <td className="px-3 py-2.5 text-stone-500">{tenant?.fullName ?? <span className="text-stone-300">Vacant</span>}</td>
                  <td className="px-3 py-2.5 text-right text-stone-600">{formatCurrency(p.monthlyRent)}</td>
                  {monthly.map((v, mi) => (
                    <td key={mi} className={cn('px-2 py-2.5 text-right',
                      v === null ? 'text-stone-200' :
                      v >= p.monthlyRent ? 'text-emerald-600 font-medium' : 'text-amber-600'
                    )}>
                      {v !== null ? formatCurrency(v) : '—'}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right font-bold text-stone-800">{formatCurrency(total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-stone-100 border-t-2 border-stone-200">
              <tr>
                <td colSpan={3} className="px-3 py-2.5 font-bold text-stone-700 text-xs uppercase">Monthly Total</td>
                {monthTotals.map((t, i) => (
                  <td key={i} className="px-2 py-2.5 text-right font-bold text-stone-800">{formatCurrency(t)}</td>
                ))}
                <td className="px-3 py-2.5 text-right font-bold text-brand-700">{formatCurrency(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
