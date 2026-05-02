'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Property } from '@/lib/types'

const schema = z.object({
  propertyNumber: z.string().min(1, 'Required'),
  type: z.enum(['house', 'shop']),
  address: z.string().min(5, 'Enter full address'),
  area: z.string().optional(),
  monthlyRent: z.coerce.number().min(1, 'Enter rent amount'),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface PropertyFormProps {
  defaultValues?: Partial<Property>
  onSubmit: (data: FormData) => Promise<void>
  loading?: boolean
}

export default function PropertyForm({ defaultValues, onSubmit, loading }: PropertyFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      propertyNumber: defaultValues?.propertyNumber || '',
      type: defaultValues?.type || 'house',
      address: defaultValues?.address || '',
      area: defaultValues?.area || '',
      monthlyRent: defaultValues?.monthlyRent || 0,
      notes: defaultValues?.notes || '',
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Property Number *</label>
          <input {...register('propertyNumber')} className="input" placeholder="H001 / S001" />
          {errors.propertyNumber && <p className="text-red-500 text-xs mt-1">{errors.propertyNumber.message}</p>}
        </div>
        <div>
          <label className="label">Type *</label>
          <select {...register('type')} className="input">
            <option value="house">House</option>
            <option value="shop">Shop</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">Address *</label>
        <textarea {...register('address')} className="input min-h-[80px] resize-none" placeholder="Full property address" />
        {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Area / Location</label>
          <input {...register('area')} className="input" placeholder="e.g. Main Street" />
        </div>
        <div>
          <label className="label">Monthly Rent (₹) *</label>
          <input {...register('monthlyRent')} type="number" className="input" placeholder="0" />
          {errors.monthlyRent && <p className="text-red-500 text-xs mt-1">{errors.monthlyRent.message}</p>}
        </div>
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea {...register('notes')} className="input resize-none" rows={2} placeholder="Any additional notes..." />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? 'Saving...' : 'Save Property'}
        </button>
      </div>
    </form>
  )
}
