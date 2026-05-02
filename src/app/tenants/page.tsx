'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Users, Phone, Calendar, History, UserMinus, Edit2, ChevronDown, ChevronUp } from 'lucide-react'
import { getTenants, addTenant, updateTenant, deactivateTenant, getTenantsByProperty } from '@/lib/firebase/tenants'
import { getProperties } from '@/lib/firebase/properties'
import { getPaymentsByTenant, recordPayment } from '@/lib/firebase/payments'
import type { Tenant, Property, Payment } from '@/lib/types'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import SearchBar from '@/components/ui/SearchBar'
import TenantForm from '@/components/forms/TenantForm'
import PaymentForm from '@/components/forms/PaymentForm'
import StatusBadge from '@/components/ui/StatusBadge'
import { formatCurrency, formatDate, formatMonth, maskAadhaar, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const searchParams = useSearchParams()
  const [filter, setFilter] = useState<'active' | 'all' | 'history'>((searchParams.get('filter') as any) || 'active')
  const [modalOpen, setModalOpen] = useState(false)
  const [historyModal, setHistoryModal] = useState<{ property: Property; tenants: Tenant[]; payments: Payment[][] } | null>(null)
  const [editTarget, setEditTarget] = useState<Tenant | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<Tenant | null>(null)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  
  // Payment Form Modal
  const [editModal, setEditModal] = useState<(Payment & { tenantName?: string, propertyNumber?: string }) | null>(null)
  const propertyFilter = searchParams.get('property')

  const load = useCallback(async () => {
    const [tens, props] = await Promise.all([getTenants(), getProperties()])
    setTenants(tens)
    setProperties(props)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = tenants.filter(t => {
    const matchFilter = filter === 'all' || (filter === 'active' ? t.isActive : !t.isActive)
    const matchProp = !propertyFilter || t.propertyId === propertyFilter
    const matchSearch = !search ||
      t.fullName.toLowerCase().includes(search.toLowerCase()) ||
      t.phoneNumber.includes(search) ||
      t.aadhaarNumber.includes(search)
    return matchFilter && matchProp && matchSearch
  })

  const getProperty = (id: string) => properties.find(p => p.id === id)

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
    } catch (e) {
      console.error('Update error:', e)
      toast.error('Failed to update payment')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (data: Parameters<React.ComponentProps<typeof TenantForm>['onSubmit']>[0], photo?: File) => {
  setSaving(true)
  try {
    const tenantData = {
      ...data,
      moveInDate: new Date(data.moveInDate),
      isActive: true,
      // ✅ Always preserve existing photoUrl; upload in firebase fn will overwrite if new photo given
      photoUrl: editTarget?.photoUrl ?? null,
    } as Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>

    if (editTarget) {
      await updateTenant(editTarget.id, tenantData, photo)
      toast.success('Tenant updated')
    } else {
      await addTenant(tenantData, photo)
      toast.success('Tenant added successfully')
    }
    setModalOpen(false)
    setEditTarget(null)
    await load() // ✅ await so UI refreshes after save completes
  } catch (e) {
    console.error('Save tenant error:', e) // ✅ log the real error
    toast.error('Something went wrong. Check your connection and try again.')
  } finally {
    setSaving(false)
  }
}

  const handleDeactivate = async () => {
    if (!deactivateTarget) return
    setSaving(true)
    try {
      await deactivateTenant(deactivateTarget.id, deactivateTarget.propertyId)
      toast.success('Tenant moved out')
      setDeactivateTarget(null)
      load()
    } catch {
      toast.error('Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const openHistory = async (property: Property) => {
    const allTenants = await getTenantsByProperty(property.id)
    const payments = await Promise.all(allTenants.map(t => getPaymentsByTenant(t.id)))
    setHistoryModal({ property, tenants: allTenants, payments })
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Tenants</h1>
          <p className="text-stone-500 text-sm mt-1">{tenants.filter(t => t.isActive).length} active</p>
        </div>
        <button onClick={() => { setEditTarget(null); setModalOpen(true) }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Tenant
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, phone, Aadhaar..." />
        <div className="flex gap-2 flex-shrink-0">
          {(['active', 'all', 'history'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize',
              filter === f ? 'bg-brand-500 text-white shadow-warm' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            )}>{f === 'history' ? 'Past' : f}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-stone-200 animate-pulse rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No tenants found" />
      ) : (
        <div className="space-y-3">
          {filtered.map(t => {
            const prop = getProperty(t.propertyId)
            return (
              <div key={t.id} className="card p-4 hover:shadow-md transition-shadow group cursor-pointer" onClick={() => router.push(`/tenants/${t.id}`)}>
                <div className="flex items-center gap-4">
                  {/* Photo */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0 flex items-center justify-center">
                    {t.photoUrl ? (
                      <Image src={t.photoUrl} alt={t.fullName} width={48} height={48} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-stone-400">{t.fullName[0]}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-stone-900">{t.fullName}</p>
                      <span className={cn('badge text-xs', t.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-stone-50 text-stone-500 border-stone-200')}>
                        {t.isActive ? 'Active' : 'Past'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                      <span className="flex items-center gap-1 text-xs text-stone-500"><Phone className="w-3 h-3" />{t.phoneNumber}</span>
                      <span className="flex items-center gap-1 text-xs text-stone-500"><Calendar className="w-3 h-3" />Since {formatDate(t.moveInDate)}</span>
                      {prop && <span className="text-xs font-medium text-brand-600">{prop.propertyNumber}</span>}
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">Aadhaar: {maskAadhaar(t.aadhaarNumber)}</p>
                  </div>

                  {/* Rent */}
                  <div className="hidden sm:block text-right flex-shrink-0">
                    <p className="font-bold text-stone-900">{formatCurrency(t.monthlyRent)}<span className="text-xs text-stone-400 font-normal">/mo</span></p>
                    {t.depositAmount ? <p className="text-xs text-stone-400">Dep: {formatCurrency(t.depositAmount)}</p> : null}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); setEditTarget(t); setModalOpen(true) }} className="p-1.5 hover:bg-stone-200 rounded-lg" title="Edit">
                      <Edit2 className="w-3.5 h-3.5 text-stone-500" />
                    </button>
                    {prop && (
                      <button onClick={(e) => { e.stopPropagation(); router.push(`/tenants/${t.id}`) }} className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-500 font-medium text-xs px-2" title="View Profile">
                        View
                      </button>
                    )}
                    {t.isActive && (
                      <button onClick={(e) => { e.stopPropagation(); setDeactivateTarget(t) }} className="p-1.5 hover:bg-amber-100 rounded-lg" title="Move Out">
                        <UserMinus className="w-3.5 h-3.5 text-amber-500" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditTarget(null) }} title={editTarget ? 'Edit Tenant' : 'Add Tenant'} size="xl">
        <TenantForm defaultValues={editTarget || {}} properties={properties} onSubmit={handleSubmit} loading={saving} />
      </Modal>

      {/* Deactivate */}
      <ConfirmDialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        title="Move Out Tenant"
        message={`Mark ${deactivateTarget?.fullName} as moved out? They will be archived to history.`}
        confirmLabel="Move Out"
        loading={saving}
      />

      {/* History Modal */}
      <Modal open={!!historyModal} onClose={() => setHistoryModal(null)} title={`Tenant History — ${historyModal?.property.propertyNumber}`} size="xl">
        {historyModal && (
          <div className="space-y-4">
            {historyModal.tenants.map((t, i) => (
              <div key={t.id} className="border border-stone-100 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-stone-100 rounded-lg flex items-center justify-center font-bold text-stone-500">{t.fullName[0]}</div>
                  <div>
                    <p className="font-semibold text-sm">{t.fullName}</p>
                    <p className="text-xs text-stone-400">{formatDate(t.moveInDate)} → {t.moveOutDate ? formatDate(t.moveOutDate) : 'Present'}</p>
                  </div>
                  <span className={cn('badge ml-auto', t.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-stone-50 text-stone-400 border-stone-100')}>
                    {t.isActive ? 'Current' : 'Past'}
                  </span>
                </div>
                {historyModal.payments[i]?.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-stone-100"><th className="text-left py-1 px-2 text-stone-400">Month</th><th className="text-left py-1 px-2 text-stone-400">Amount</th><th className="text-left py-1 px-2 text-stone-400">Status</th><th className="text-left py-1 px-2 text-stone-400">Paid</th></tr></thead>
                      <tbody>
                        {historyModal.payments[i].map(p => (
                          <tr key={p.id} className="border-b border-stone-50">
                            <td className="py-1 px-2">{p.month}/{p.year}</td>
                            <td className="py-1 px-2">{formatCurrency(p.amount)}</td>
                            <td className="py-1 px-2"><StatusBadge status={p.status} /></td>
                            <td className="py-1 px-2 text-stone-400">{formatDate(p.paidDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>

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
    </div>
  )
}
