'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, CreditCard, Filter, Download, ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { getPayments, addPayment, recordPayment, generateMonthlyPayments, getPaymentsByTenant } from '@/lib/firebase/payments'
import { getActiveTenants } from '@/lib/firebase/tenants'
import { getProperties } from '@/lib/firebase/properties'
import type { Payment, Tenant, Property } from '@/lib/types'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import SearchBar from '@/components/ui/SearchBar'
import StatusBadge from '@/components/ui/StatusBadge'
import PaymentForm from '@/components/forms/PaymentForm'
import { formatCurrency, formatDate, formatMonth, MONTHS, cn, getMonthYear } from '@/lib/utils'
import { exportPaymentsToPDF, exportPaymentsToExcel } from '@/lib/utils/export'
import toast from 'react-hot-toast'
import { useSearchParams } from 'next/navigation'

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue' | 'partial'>((searchParams.get('filter') as any) || 'all')
  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState<Payment | null>(null)
  const [genModal, setGenModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null)
  const [tenantPayments, setTenantPayments] = useState<Record<string, Payment[]>>({})
  const now = getMonthYear()
  const [genMonth, setGenMonth] = useState(now.month)
  const [genYear, setGenYear] = useState(now.year)

  const load = useCallback(async () => {
    try {
      const [pays, tens, props] = await Promise.all([getPayments(), getActiveTenants(), getProperties()])
      setPayments(pays)
      setTenants(tens)
      setProperties(props)
    } catch (e) {
      console.error('Load error:', e)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = payments.filter(p => {
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    const matchSearch = !search ||
      p.tenantName.toLowerCase().includes(search.toLowerCase()) ||
      p.propertyNumber.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const handleEdit = async (data: Parameters<React.ComponentProps<typeof PaymentForm>['onSubmit']>[0]) => {
    if (!editModal) return
    setSaving(true)
    try {
      const { updatePayment } = await import('@/lib/firebase/payments')
      await updatePayment(editModal.id, {
        amount: data.amount,
        partialAmount: data.partialAmount,
        status: data.status,
        paidDate: new Date(data.paidDate),
        notes: data.notes
      })
      toast.success('Payment updated!')
      setEditModal(null)
      load()
    } catch (e) {
      console.error('Update error:', e)
      toast.error('Failed to update payment')
    } finally {
      setSaving(false)
    }
  }

  const handleAddPayment = async (data: Parameters<React.ComponentProps<typeof PaymentForm>['onSubmit']>[0]) => {
    setSaving(true)
    try {
      const tenant = tenants.find(t => t.id === data.tenantId)
      if (!tenant) { toast.error('Please select a tenant'); setSaving(false); return }
      const prop = properties.find(p => p.id === tenant.propertyId)
      if (!prop) { toast.error('Property not found'); setSaving(false); return }

      await addPayment({
        tenantId: tenant.id,
        propertyId: prop.id,
        tenantName: tenant.fullName,
        propertyNumber: prop.propertyNumber,
        amount: Number(data.amount),
        month: Number(data.month),
        year: Number(data.year),
        dueDate: new Date(Number(data.year), Number(data.month) - 1, 5),
        status: data.status,
        paidDate: data.paidDate ? new Date(data.paidDate) : undefined,
        partialAmount: data.partialAmount || null as any,
        notes: data.notes || null as any,
      })
      toast.success('Payment added!')
      setAddModal(false)
      load()
    } catch (e: unknown) {
      console.error('Add payment error:', e)
      const msg = e instanceof Error ? e.message : 'Unknown error'
      toast.error(`Failed: ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  const handleGenerate = async () => {
    setSaving(true)
    try {
      let count = 0
      for (const tenant of tenants) {
        const prop = properties.find(p => p.id === tenant.propertyId)
        if (!prop) continue
        await generateMonthlyPayments(tenant.id, prop.id, tenant.fullName, prop.propertyNumber, tenant.monthlyRent, genMonth, genYear, tenant.moveInDate)
        count++
      }
      toast.success(`Generated payments for ${count} tenants`)
      setGenModal(false)
      load()
    } catch (e) {
      console.error('Generate error:', e)
      toast.error('Failed to generate payments')
    } finally {
      setSaving(false)
    }
  }

  const toggleTenantHistory = async (tenantId: string) => {
    if (expandedTenant === tenantId) {
      setExpandedTenant(null)
      return
    }
    setExpandedTenant(tenantId)
    if (!tenantPayments[tenantId]) {
      try {
        const pays = await getPaymentsByTenant(tenantId)
        setTenantPayments(prev => ({ ...prev, [tenantId]: pays }))
      } catch (e) {
        console.error('History error:', e)
      }
    }
  }

  const totalCollected = filtered.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  const totalPending = filtered.filter(p => ['pending', 'overdue'].includes(p.status)).reduce((s, p) => s + p.amount, 0)

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="text-stone-500 text-sm mt-1">{payments.length} records</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => exportPaymentsToPDF(filtered, 'Payment Report')} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> PDF
          </button>
          <button onClick={() => exportPaymentsToExcel(filtered, 'Payments')} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Excel
          </button>
          <button onClick={() => setGenModal(true)} className="btn-secondary flex items-center gap-2 text-sm">
            <Filter className="w-4 h-4" /> Generate Monthly
          </button>
          <button onClick={() => setAddModal(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Add Payment
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4 bg-emerald-50 border-emerald-100">
          <p className="text-xs text-emerald-600 font-medium">Collected</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(totalCollected)}</p>
        </div>
        <div className="card p-4 bg-amber-50 border-amber-100">
          <p className="text-xs text-amber-600 font-medium">Pending / Overdue</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{formatCurrency(totalPending)}</p>
        </div>
      </div>

      {/* Tenant Payment History Panel */}
      {tenants.length > 0 && (
        <div className="card p-5">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-500" /> Tenant Payment History
          </h2>
          <div className="space-y-2">
            {tenants.map(t => {
              const prop = properties.find(p => p.id === t.propertyId)
              const isExpanded = expandedTenant === t.id
              const history = tenantPayments[t.id] || []
              return (
                <div key={t.id} className="border border-stone-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleTenantHistory(t.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-stone-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-700">
                        {t.fullName[0]}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-stone-800">{t.fullName}</p>
                        <p className="text-xs text-stone-400">{prop?.propertyNumber} · {formatCurrency(t.monthlyRent)}/mo</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-400">View history</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-stone-100 bg-stone-50 p-3">
                      {history.length === 0 ? (
                        <p className="text-xs text-stone-400 text-center py-4">No payment records yet</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-stone-200">
                                <th className="text-left py-2 px-2 text-stone-400 font-medium">Month</th>
                                <th className="text-left py-2 px-2 text-stone-400 font-medium">Amount</th>
                                <th className="text-left py-2 px-2 text-stone-400 font-medium">Status</th>
                                <th className="text-left py-2 px-2 text-stone-400 font-medium">Paid On</th>
                                <th className="text-left py-2 px-2 text-stone-400 font-medium">Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {history.map(pay => (
                                <tr key={pay.id} className="border-b border-stone-100 hover:bg-white">
                                  <td className="py-2 px-2 font-medium">{formatMonth(pay.month, pay.year)}</td>
                                  <td className="py-2 px-2">{formatCurrency(pay.amount)}</td>
                                  <td className="py-2 px-2"><StatusBadge status={pay.status} /></td>
                                  <td className="py-2 px-2 text-stone-400">{pay.paidDate ? formatDate(pay.paidDate) : '—'}</td>
                                  <td className="py-2 px-2 text-stone-400">{pay.notes || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {/* Summary row */}
                          <div className="flex gap-4 mt-3 pt-3 border-t border-stone-200 text-xs">
                            <span className="text-emerald-600 font-medium">
                              Paid: {formatCurrency(history.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0))}
                            </span>
                            <span className="text-red-500 font-medium">
                              Pending: {formatCurrency(history.filter(p => p.status !== 'paid').reduce((s, p) => s + p.amount, 0))}
                            </span>
                            <span className="text-stone-500">
                              Total records: {history.length}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search tenant, property..." />
        <div className="flex gap-2 flex-wrap">
          {(['all', 'paid', 'pending', 'overdue', 'partial'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-medium transition-all capitalize',
              statusFilter === s ? 'bg-brand-500 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            )}>{s}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="h-14 bg-stone-200 animate-pulse rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={CreditCard} title="No payments found" description="Add a payment or generate monthly payments" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-stone-100 bg-stone-50">
                <tr>
                  {['Property', 'Tenant', 'Month', 'Due', 'Paid', 'Unpaid', 'Status', 'Due Date', 'Paid Date', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-stone-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} className={cn('border-b border-stone-50 hover:bg-stone-50 transition-colors', i % 2 === 1 ? 'bg-stone-50/50' : '')}>
                    <td className="py-3 px-4 font-medium">{p.propertyNumber}</td>
                    <td className="py-3 px-4 text-stone-600 max-w-[140px] truncate">{p.tenantName}</td>
                    <td className="py-3 px-4 text-stone-500 whitespace-nowrap">{formatMonth(p.month, p.year)}</td>
                    <td className="py-3 px-4 font-semibold">{formatCurrency(p.amount)}</td>
                    <td className="py-3 px-4 font-medium">{formatCurrency(p.status === 'paid' ? p.amount : (p.partialAmount || 0))}</td>
                    <td className="py-3 px-4 font-medium text-red-500">{formatCurrency(p.amount - (p.status === 'paid' ? p.amount : (p.partialAmount || 0)))}</td>
                    <td className="py-3 px-4"><StatusBadge status={p.status} /></td>
                    <td className="py-3 px-4 text-stone-400 whitespace-nowrap">{formatDate(p.dueDate)}</td>
                    <td className="py-3 px-4 text-stone-400 whitespace-nowrap">{p.paidDate ? formatDate(p.paidDate) : '—'}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {p.status !== 'paid' && (
                          <button 
                            onClick={() => setEditModal(p)} 
                            className="p-1 px-3 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 hover:text-emerald-700 rounded font-medium text-xs tracking-wide transition-colors"
                          >
                            Pay
                          </button>
                        )}
                        <button 
                          onClick={() => setEditModal(p)} 
                          className="p-1 px-3 bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900 rounded font-medium text-xs tracking-wide transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title={`Edit Record — ${editModal?.propertyNumber || ''}`}>
        {editModal && (
          <div>
            <div className="bg-stone-50 rounded-xl p-3 mb-4 text-sm">
              <p className="text-stone-600">Tenant: <span className="font-semibold">{editModal.tenantName}</span></p>
              <p className="text-stone-600 mt-0.5">Month: <span className="font-semibold">{formatMonth(editModal.month, editModal.year)}</span></p>
            </div>
            <PaymentForm 
              defaultAmount={editModal.amount} 
              defaultPaidAmount={editModal.partialAmount || (editModal.status === 'paid' ? editModal.amount : 0)}
              defaultDate={editModal.paidDate ? new Date(editModal.paidDate).toISOString().split('T')[0] : ''}
              defaultMonth={editModal.month}
              defaultYear={editModal.year}
              defaultNotes={editModal.notes || ''}
              defaultTenantId={editModal.tenantId} 
              onSubmit={handleEdit} 
              loading={saving} 
              mode="edit" 
            />
          </div>
        )}
      </Modal>

      {/* Add Payment Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Payment Record" size="lg">
        <PaymentForm onSubmit={handleAddPayment} loading={saving} mode="add" tenants={tenants} properties={properties} />
      </Modal>

      {/* Generate Modal */}
      <Modal open={genModal} onClose={() => setGenModal(false)} title="Generate Monthly Payments" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-stone-600">Generate payment records for all active tenants for a specific month.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Month</label>
              <select value={genMonth} onChange={e => setGenMonth(+e.target.value)} className="input">
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Year</label>
              <input type="number" value={genYear} onChange={e => setGenYear(+e.target.value)} className="input" min={2020} />
            </div>
          </div>
          <p className="text-xs text-stone-400">Will generate for {tenants.length} active tenants. Existing records won't be duplicated.</p>
          <button onClick={handleGenerate} disabled={saving} className="btn-primary w-full">
            {saving ? 'Generating...' : `Generate for ${MONTHS[genMonth - 1]} ${genYear}`}
          </button>
        </div>
      </Modal>
    </div>
  )
}