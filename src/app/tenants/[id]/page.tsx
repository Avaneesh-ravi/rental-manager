'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Phone, Calendar, MapPin, MessageCircle, FileText, IndianRupee } from 'lucide-react'
import { getTenant } from '@/lib/firebase/tenants'
import { getProperties } from '@/lib/firebase/properties'
import { getPaymentsByTenant, addPayment, updatePayment } from '@/lib/firebase/payments'
import type { Tenant, Property, Payment } from '@/lib/types'
import Modal from '@/components/ui/Modal'
import PaymentForm from '@/components/forms/PaymentForm'
import StatusBadge from '@/components/ui/StatusBadge'
import { formatCurrency, formatDate, formatMonth, maskAadhaar, cn } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function TenantProfilePage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const router = useRouter()
  const [tenantId, setTenantId] = useState<string>('')

  useEffect(() => {
    if (params instanceof Promise) {
      params.then(p => setTenantId(p.id))
    } else {
      setTenantId(params.id)
    }
  }, [params])

  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [property, setProperty] = useState<Property | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState<Payment | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!tenantId) return
    try {
      const [t, props, pays] = await Promise.all([
        getTenant(tenantId),
        getProperties(),
        getPaymentsByTenant(tenantId)
      ])
      setTenant(t)
      if (t) {
        const p = props.find(pr => pr.id === t.propertyId)
        if (p) setProperty(p)
      }
      setPayments(pays)
    } catch (e) {
      toast.error('Failed to load tenant details')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => { load() }, [load])

  const handleEdit = async (data: Parameters<React.ComponentProps<typeof PaymentForm>['onSubmit']>[0]) => {
    if (!editModal || !tenant) return
    setSaving(true)
    try {
      if (editModal.id === 'new' && property) {
        await addPayment({
          tenantId: tenant.id,
          propertyId: property.id,
          tenantName: tenant.fullName,
          propertyNumber: property.propertyNumber,
          month: data.month,
          year: data.year,
          amount: data.amount,
          partialAmount: data.partialAmount,
          status: data.status,
          dueDate: new Date(data.year, data.month - 1, tenant.moveInDate.getDate()),
          paidDate: data.paidDate ? new Date(data.paidDate) : undefined as any,
          notes: data.notes
        })
        toast.success('Payment recorded!')
      } else {
        await updatePayment(editModal.id, {
          amount: data.amount,
          partialAmount: data.partialAmount,
          status: data.status,
          paidDate: new Date(data.paidDate),
          notes: data.notes
        })
        toast.success('Payment updated!')
      }
      setEditModal(null)
      load()
    } catch (e) {
      console.error('Record error:', e)
      toast.error('Failed to update payment')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <div className="h-40 bg-stone-200 animate-pulse rounded-2xl" />
        <div className="h-64 bg-stone-200 animate-pulse rounded-2xl" />
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="text-center py-20">
        <p className="text-stone-500">Tenant not found</p>
        <button onClick={() => router.back()} className="btn-secondary mt-4">Go Back</button>
      </div>
    )
  }

  const totalUnpaid = payments.reduce((sum, p) => {
    if (p.status === 'paid') return sum
    return sum + Number(p.amount) - Number(p.partialAmount || 0)
  }, 0)

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/tenants')} className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-stone-600" />
        </button>
        <div>
          <h1 className="page-title leading-tight">{tenant.fullName}</h1>
          <p className="text-stone-500 text-sm mt-0.5">{property?.propertyNumber || 'No Property Assigned'}</p>
        </div>
      </div>

      {/* Tenant Profile Card */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">

          {/* Photo */}
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden bg-stone-100 flex-shrink-0 flex items-center justify-center border-4 border-white shadow-md">
            {tenant.photoUrl ? (
              <Image src={tenant.photoUrl} alt={tenant.fullName} width={160} height={160} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-stone-300">{tenant.fullName.substring(0, 2).toUpperCase()}</span>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 w-full space-y-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-stone-900">{tenant.fullName}</h2>
                <div className="flex gap-2 items-center mt-1">
                  <span className={cn('badge text-xs', tenant.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100')}>
                    {tenant.isActive ? 'Active Tenant' : 'Inactive Tenant'}
                  </span>
                  <span className="text-xs text-stone-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Since {formatDate(tenant.moveInDate)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-2 border-t border-stone-100">
              {/* Phone & Contacts */}
              <div className="space-y-1">
                <p className="text-xs text-stone-400 font-semibold uppercase tracking-wider">Contact</p>
                <div className="flex items-center gap-3">
                  <p className="font-medium text-stone-800">{tenant.phoneNumber}</p>
                  <div className="flex items-center gap-1">
                    <a href={`tel:${tenant.phoneNumber}`} className="p-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors" title="Call">
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                    <a target="_blank" rel="noopener noreferrer" href={`https://wa.me/91${tenant.phoneNumber}`} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-full hover:bg-emerald-100 transition-colors" title="WhatsApp Message">
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Aadhaar */}
              <div className="space-y-1">
                <p className="text-xs text-stone-400 font-semibold uppercase tracking-wider">Aadhaar</p>
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-stone-400" />
                  <p className="font-medium text-stone-800 tracking-wide">{maskAadhaar(tenant.aadhaarNumber)}</p>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs text-stone-400 font-semibold uppercase tracking-wider">Address</p>
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 text-stone-400 mt-0.5 flex-shrink-0" />
                  <p className="font-medium text-stone-800 leading-snug">{tenant.address}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Snapshot */}
          <div className="w-full md:w-64 bg-[#f8f9fa] rounded-xl p-5 border border-stone-200 flex-shrink-0">
            <h3 className="text-xs text-stone-400 font-semibold uppercase tracking-wider mb-4 border-b border-stone-200 pb-2">Financial Snapshot</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-stone-500 mb-0.5">Monthly Rent</p>
                <div className="flex items-center gap-1">
                  <IndianRupee className="w-4 h-4 text-stone-700" />
                  <p className="text-xl font-bold text-stone-800">{tenant.monthlyRent.toLocaleString('en-IN')}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-stone-500 mb-0.5">Advance / Deposit Paid</p>
                <div className="flex items-center gap-1">
                  <IndianRupee className="w-4 h-4 text-brand-600" />
                  <p className="text-xl font-bold text-brand-600">{(tenant.depositAmount || 0).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Outstanding Balance Banner — outside profile card */}
      {totalUnpaid > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-800">Outstanding Balance</p>
              <p className="text-xs text-red-500 mt-0.5">Across all unpaid months</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalUnpaid)}</p>
        </div>
      )}

      {/* Payment History Table */}
      <div className="card">
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900">Payment History</h2>
          <span className="text-sm font-medium text-stone-500">{payments.length} Records</span>
        </div>

        {payments.length === 0 ? (
          <p className="text-sm text-stone-500 text-center py-10">No payment history found for this tenant.</p>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-[#f8f9fa] border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4 text-left font-bold text-xs text-stone-500 tracking-wider">Month</th>
                  <th className="py-3 px-4 text-left font-bold text-xs text-stone-500 tracking-wider">Due Amount</th>
                  <th className="py-3 px-4 text-left font-bold text-xs text-stone-500 tracking-wider">Paid Date</th>
                  <th className="py-3 px-4 text-left font-bold text-xs text-stone-500 tracking-wider">Paid Amount</th>
                  <th className="py-3 px-4 text-left font-bold text-xs text-stone-500 tracking-wider">Balance</th>
                  <th className="py-3 px-4 text-left font-bold text-xs text-stone-500 tracking-wider">Status</th>
                  <th className="py-3 px-4 text-left font-bold text-xs text-stone-500 tracking-wider">Remarks</th>
                  <th className="py-3 px-4 text-center font-bold text-xs text-stone-500 tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {(() => {
                  const moveIn = new Date(tenant.moveInDate)
                  const now = new Date()
                  const months: { m: number; y: number }[] = []
                  let cursor = new Date(moveIn.getFullYear(), moveIn.getMonth(), 1)
                  const endMonth = new Date(now.getFullYear(), now.getMonth(), 1)
                  while (cursor <= endMonth) {
                    months.push({ m: cursor.getMonth() + 1, y: cursor.getFullYear() })
                    cursor.setMonth(cursor.getMonth() + 1)
                  }
                  months.reverse()

                  return months.map(({ m, y }) => {
                    const pay = payments.find(p => p.month === m && p.year === y)
                    const isJoinMonth = m === (moveIn.getMonth() + 1) && y === moveIn.getFullYear()
                    const monthLabel = `${new Date(y, m - 1).toLocaleString('en-IN', { month: 'long' })} ${y}`

                    if (!pay) {
                      const isOverdue = new Date(y, m - 1, 28) < now
                      return (
                        <tr key={`empty-${m}-${y}`} className="hover:bg-stone-50 transition-colors opacity-70">
                          <td className="py-2.5 px-4 font-medium">
                            <span>{monthLabel}</span>
                            {isJoinMonth && (
                              <span className="ml-2 text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">
                                Joined {formatDate(tenant.moveInDate)}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4">{formatCurrency(tenant.monthlyRent)}</td>
                          <td className="py-2.5 px-4 text-stone-400">—</td>
                          <td className="py-2.5 px-4 text-stone-400">₹0</td>
                          <td className="py-2.5 px-4 text-red-500 font-semibold">{formatCurrency(tenant.monthlyRent)}</td>
                          <td className="py-2.5 px-4"><StatusBadge status={isOverdue ? 'overdue' : 'pending'} /></td>
                          <td className="py-2.5 px-4 text-xs text-stone-500">—</td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              onClick={() => setEditModal({
                                id: 'new',
                                tenantId: tenant.id,
                                propertyId: property?.id || '',
                                tenantName: tenant.fullName,
                                propertyNumber: property?.propertyNumber || '',
                                month: m,
                                year: y,
                                amount: tenant.monthlyRent,
                                status: 'pending',
                                dueDate: new Date(y, m - 1, moveIn.getDate())
                              } as Payment)}
                              className="p-1 px-3 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 hover:text-emerald-700 rounded font-medium text-xs tracking-wide transition-colors"
                            >
                              Pay
                            </button>
                          </td>
                        </tr>
                      )
                    }

                    const paidAmt = pay.status === 'paid' ? Number(pay.amount) : Number(pay.partialAmount || 0)
                    const balanceAmt = Number(pay.amount) - paidAmt

                    return (
                      <tr key={pay.id} className="hover:bg-stone-50 transition-colors">
                        <td className="py-2.5 px-4 font-medium">
                          <span>{monthLabel}</span>
                          {isJoinMonth && (
                            <span className="ml-2 text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">
                              Joined {formatDate(tenant.moveInDate)}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">{formatCurrency(Number(pay.amount))}</td>
                        <td className="py-2.5 px-4 text-stone-500">{pay.paidDate ? formatDate(pay.paidDate) : '—'}</td>
                        <td className="py-2.5 px-4 font-medium text-emerald-600">{formatCurrency(paidAmt)}</td>
                        <td className="py-2.5 px-4 font-semibold">
                          {balanceAmt > 0
                            ? <span className="text-red-500">{formatCurrency(balanceAmt)}</span>
                            : <span className="text-emerald-500">Paid</span>
                          }
                        </td>
                        <td className="py-2.5 px-4"><StatusBadge status={pay.status} /></td>
                        <td className="py-2.5 px-4 text-xs text-stone-500 truncate max-w-[150px]">{pay.notes || '—'}</td>
                        <td className="py-2.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {pay.status !== 'paid' && (
                              <button
                                onClick={() => setEditModal(pay)}
                                className="p-1 px-3 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 hover:text-emerald-700 rounded font-medium text-xs tracking-wide transition-colors"
                              >
                                Pay
                              </button>
                            )}
                            <button
                              onClick={() => setEditModal(pay)}
                              className="p-1 px-3 bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900 rounded font-medium text-xs tracking-wide transition-colors"
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Payment Modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title={`Edit Record — ${property?.propertyNumber || ''}`}>
        {editModal && (
          <div>
            <div className="bg-stone-50 rounded-xl p-3 mb-4 text-sm">
              <p className="text-stone-600">Tenant: <span className="font-semibold">{tenant.fullName}</span></p>
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