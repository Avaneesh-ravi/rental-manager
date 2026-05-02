'use client'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'
import { MONTHS } from '@/lib/utils'
import type { Tenant, Property } from '@/lib/types'

const schema = z.object({
  tenantId: z.string().min(1, 'Select a tenant'),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020).max(2100),
  rentDue: z.coerce.number().min(1, 'Enter rent due'),
  paidAmount: z.coerce.number().min(0, 'Enter paid amount (0 if pending)'),
  paidDate: z.string().min(1, 'Required'),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface PaymentFormProps {
  defaultAmount?: number
  defaultTenantId?: string
  defaultPaidAmount?: number
  defaultDate?: string
  defaultMonth?: number
  defaultYear?: number
  defaultNotes?: string
  tenants?: Tenant[]
  properties?: Property[]
  onSubmit: (data: { tenantId: string, month: number, year: number, amount: number, partialAmount: number, paidDate: string, status: 'paid' | 'partial' | 'pending', notes?: string }) => Promise<void>
  loading?: boolean
  mode?: 'record' | 'add' | 'edit'
}

export default function PaymentForm({
  defaultAmount = 0,
  defaultTenantId = '',
  defaultPaidAmount = 0,
  defaultDate = '',
  defaultMonth,
  defaultYear,
  defaultNotes = '',
  tenants = [],
  properties = [],
  onSubmit,
  loading,
  mode = 'record'
}: PaymentFormProps) {
  const now = new Date()

  const { register, handleSubmit, setValue, control, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      tenantId: defaultTenantId,
      month: defaultMonth || now.getMonth() + 1,
      year: defaultYear || now.getFullYear(),
      rentDue: defaultAmount,
      paidAmount: mode === 'edit' ? defaultPaidAmount : defaultAmount,
      paidDate: defaultDate || now.toISOString().split('T')[0],
      notes: defaultNotes,
    },
  })

  const selectedTenantId = useWatch({ control, name: 'tenantId' })
  const rentDue = watch('rentDue')
  const paidAmount = watch('paidAmount')

  // Auto-fill amount when tenant is selected
  useEffect(() => {
    if (!selectedTenantId || mode !== 'add') return
    const tenant = tenants.find(t => t.id === selectedTenantId)
    if (tenant) {
      setValue('rentDue', tenant.monthlyRent)
      setValue('paidAmount', tenant.monthlyRent)
    }
  }, [selectedTenantId, tenants, setValue, mode])

  const submitWrapper = (d: FormData) => {
    let stat: 'paid' | 'partial' | 'pending' = 'paid'
    if (d.paidAmount === 0) stat = 'pending'
    else if (d.paidAmount < d.rentDue) stat = 'partial'

    onSubmit({
      ...d,
      amount: d.rentDue,
      partialAmount: d.paidAmount,
      status: stat,
    })
  }

  const selectedTenant = tenants.find(t => t.id === selectedTenantId)
  const selectedProperty = selectedTenant ? properties.find(p => p.id === selectedTenant.propertyId) : null

  return (
    <form onSubmit={handleSubmit(submitWrapper)} className="space-y-4">

      {/* Tenant selector — only in add mode */}
      {mode === 'add' && tenants.length > 0 && (
        <div>
          <label className="label">Tenant *</label>
          <select {...register('tenantId')} className="input">
            <option value="">Select tenant</option>
            {tenants.map(t => {
              const prop = properties.find(p => p.id === t.propertyId)
              return (
                <option key={t.id} value={t.id}>
                  {t.fullName} — {prop?.propertyNumber || ''} (₹{t.monthlyRent.toLocaleString('en-IN')}/mo)
                </option>
              )
            })}
          </select>
          {errors.tenantId && <p className="text-red-500 text-xs mt-1">{errors.tenantId.message}</p>}

          {/* Selected tenant info card */}
          {selectedTenant && selectedProperty && (
            <div className="mt-2 p-3 bg-brand-50 border border-brand-100 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-200 flex items-center justify-center text-sm font-bold text-brand-800 flex-shrink-0">
                {selectedTenant.fullName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-stone-800">{selectedTenant.fullName}</p>
                <p className="text-xs text-stone-500">{selectedProperty.propertyNumber} · {selectedProperty.address.slice(0, 35)}</p>
              </div>
              <p className="text-sm font-bold text-brand-600 flex-shrink-0">
                ₹{selectedTenant.monthlyRent.toLocaleString('en-IN')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Month + Year */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Month *</label>
          <select {...register('month')} className="input">
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Year *</label>
          <input {...register('year')} type="number" className="input" min={2020} max={2100} />
        </div>
      </div>

      {/* Amount + Date */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Monthly Rent Due (₹) *</label>
          <input
            {...register('rentDue')}
            type="number"
            className="input bg-stone-100 border-stone-200 text-stone-500 cursor-not-allowed"
            inputMode="numeric"
            readOnly
          />
          {errors.rentDue && <p className="text-red-500 text-xs mt-1">{errors.rentDue.message}</p>}
        </div>
        <div>
          <label className="label">Amount Paid (₹) *</label>
          <input
            {...register('paidAmount')}
            type="number"
            className="input font-semibold bg-emerald-50 text-emerald-700"
            inputMode="numeric"
          />
          {errors.paidAmount && <p className="text-red-500 text-xs mt-1">{errors.paidAmount.message}</p>}
        </div>
      </div>

      <div>
        <label className="label">Payment Date *</label>
        <input {...register('paidDate')} type="date" className="input" />
        {errors.paidDate && <p className="text-red-500 text-xs mt-1">{errors.paidDate.message}</p>}
      </div>
      
      {/* Auto-calculated status indicator */}
      <div className="flex items-center gap-2 text-sm text-stone-500 bg-stone-50 p-2.5 rounded-lg border border-stone-200">
        <span className="font-medium text-stone-700">Status will be logged as: </span>
        {paidAmount === 0 ? (
          <span className="badge bg-stone-100 text-stone-600 border-stone-200">Pending</span>
        ) : paidAmount < rentDue ? (
          <span className="badge bg-amber-50 text-amber-600 border-amber-200">Partial Payment</span>
        ) : (
          <span className="badge bg-emerald-50 text-emerald-600 border-emerald-200">Paid in Full</span>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="label">Notes</label>
        <textarea {...register('notes')} className="input resize-none" rows={2} placeholder="Any remarks..." />
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Saving...' : 'Record Payment'}
      </button>
    </form>
  )
}