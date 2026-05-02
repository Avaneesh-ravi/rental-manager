'use client'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRef, useState, useEffect } from 'react'
import { Camera, Upload } from 'lucide-react'
import Image from 'next/image'
import type { Tenant, Property } from '@/lib/types'
import WebcamCapture from '../ui/WebcamCapture'

const schema = z.object({
  fullName: z.string().min(2, 'Enter full name'),
  aadhaarNumber: z.string().length(12, 'Aadhaar must be 12 digits').regex(/^\d+$/, 'Digits only'),
  phoneNumber: z.string().min(10, 'Enter valid phone').max(10, 'Max 10 digits'),
  address: z.string().min(5, 'Enter full address'),
  moveInDate: z.string().min(1, 'Required'),
  monthlyRent: z.coerce.number().min(1, 'Enter rent'),
  depositAmount: z.coerce.number().optional(),
  propertyId: z.string().min(1, 'Select property'),
})

type FormData = z.infer<typeof schema>

interface TenantFormProps {
  defaultValues?: Partial<Tenant>
  properties: Property[]
  onSubmit: (data: FormData, photo?: File) => Promise<void>
  loading?: boolean
  fixedPropertyId?: string
}

export default function TenantForm({ defaultValues, properties, onSubmit, loading, fixedPropertyId }: TenantFormProps) {
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>(defaultValues?.photoUrl || '')
  const [showWebcam, setShowWebcam] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, setValue, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: defaultValues?.fullName || '',
      aadhaarNumber: defaultValues?.aadhaarNumber || '',
      phoneNumber: defaultValues?.phoneNumber || '',
      address: defaultValues?.address || '',
      moveInDate: defaultValues?.moveInDate ? new Date(defaultValues.moveInDate).toISOString().split('T')[0] : '',
      monthlyRent: defaultValues?.monthlyRent || 0,
      depositAmount: defaultValues?.depositAmount || 0,
      propertyId: fixedPropertyId || defaultValues?.propertyId || '',
    },
  })

  // Watch propertyId and auto-fill rent
  const selectedPropertyId = useWatch({ control, name: 'propertyId' })
  useEffect(() => {
    if (!selectedPropertyId) return
    const prop = properties.find(p => p.id === selectedPropertyId)
    if (prop) setValue('monthlyRent', prop.monthlyRent)
  }, [selectedPropertyId, properties, setValue])

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    handleFileSet(f)
  }

  const handleFileSet = (f: File) => {
    setPhotoFile(f)
    const reader = new FileReader()
    reader.onload = ev => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(f)
  }

  return (
    <>
      <form onSubmit={handleSubmit(d => onSubmit(d, photoFile || undefined))} className="space-y-4">

      {/* Photo upload */}
      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-dashed border-stone-200 flex items-center justify-center cursor-pointer hover:border-brand-400 transition-colors bg-stone-50 overflow-hidden flex-shrink-0"
          onClick={() => fileRef.current?.click()}
        >
          {photoPreview
            ? <Image src={photoPreview} alt="Preview" width={80} height={80} className="w-full h-full object-cover" />
            : <Camera className="w-5 h-5 text-stone-400" />}
        </div>
        <div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary text-sm flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200">
              <Upload className="w-4 h-4" /> Upload
            </button>
            <button 
              type="button" 
              onClick={() => {
                // If on mobile app/pwa, capture="environment" might work, but we'll use webcam for universally accessing the camera inline!
                setShowWebcam(true)
              }} 
              className="btn-secondary text-sm flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 text-brand-600 bg-brand-50 hover:bg-brand-100"
            >
              <Camera className="w-4 h-4" /> Take Photo
            </button>
          </div>
          <p className="text-xs text-stone-400 mt-1">JPG, PNG up to 5MB</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        {/* We can keep native camera ref as fallback, but WebRTC is better for desktops */}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
      </div>

      {/* Full Name */}
      <div>
        <label className="label">Full Name *</label>
        <input {...register('fullName')} className="input" placeholder="Tenant's full name" />
        {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>}
      </div>

      {/* Aadhaar + Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Aadhaar Number *</label>
          <input {...register('aadhaarNumber')} className="input" maxLength={12} placeholder="12-digit number" inputMode="numeric" />
          {errors.aadhaarNumber && <p className="text-red-500 text-xs mt-1">{errors.aadhaarNumber.message}</p>}
        </div>
        <div>
          <label className="label">Phone Number *</label>
          <input {...register('phoneNumber')} className="input" maxLength={10} placeholder="10-digit number" inputMode="numeric" />
          {errors.phoneNumber && <p className="text-red-500 text-xs mt-1">{errors.phoneNumber.message}</p>}
        </div>
      </div>

      {/* Address */}
      <div>
        <label className="label">Address *</label>
        <textarea {...register('address')} className="input resize-none" rows={2} placeholder="Tenant's home address" />
        {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
      </div>

      {/* Property — auto fills rent */}
      <div>
        <label className="label">Property *</label>
        <select {...register('propertyId')} className="input" disabled={!!fixedPropertyId}>
          <option value="">Select property</option>
          {properties.map(p => (
            <option key={p.id} value={p.id}>
              {p.propertyNumber} — {p.address.slice(0, 35)} (₹{p.monthlyRent.toLocaleString('en-IN')}/mo)
            </option>
          ))}
        </select>
        {errors.propertyId && <p className="text-red-500 text-xs mt-1">{errors.propertyId.message}</p>}
        {selectedPropertyId && (
          <p className="text-xs text-brand-600 mt-1 font-medium">
            ✓ Rent auto-filled from property
          </p>
        )}
      </div>

      {/* Move-in Date + Rent + Deposit */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="label">Move-in Date *</label>
          <input {...register('moveInDate')} type="date" className="input" />
          {errors.moveInDate && <p className="text-red-500 text-xs mt-1">{errors.moveInDate.message}</p>}
        </div>
        <div>
          <label className="label">Monthly Rent (₹) *</label>
          <input {...register('monthlyRent')} type="number" className="input bg-brand-50 font-semibold" inputMode="numeric" />
          {errors.monthlyRent && <p className="text-red-500 text-xs mt-1">{errors.monthlyRent.message}</p>}
        </div>
        <div>
          <label className="label">Deposit (₹)</label>
          <input {...register('depositAmount')} type="number" className="input" placeholder="0" inputMode="numeric" />
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
        {loading ? 'Saving...' : 'Save Tenant'}
      </button>
    </form>
    
    {showWebcam && (
      <WebcamCapture 
        onClose={() => setShowWebcam(false)} 
        onCapture={(file) => {
          handleFileSet(file)
          setShowWebcam(false)
        }} 
      />
    )}
    </>
  )
}