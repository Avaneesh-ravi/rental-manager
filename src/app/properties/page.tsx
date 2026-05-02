'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Home, Store, Edit2, Trash2, Users, ChevronRight } from 'lucide-react'
import { getProperties, addProperty, updateProperty, deleteProperty } from '@/lib/firebase/properties'
import { getActiveTenants } from '@/lib/firebase/tenants'
import type { Property, Tenant } from '@/lib/types'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import SearchBar from '@/components/ui/SearchBar'
import PropertyForm from '@/components/forms/PropertyForm'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'house' | 'shop'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Property | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [props, tens] = await Promise.all([getProperties(), getActiveTenants()])
    setProperties(props)
    setTenants(tens)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = properties.filter(p => {
    const matchType = filter === 'all' || p.type === filter
    const matchSearch = !search || p.propertyNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.address.toLowerCase().includes(search.toLowerCase()) || (p.area || '').toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  const getTenant = (propId: string) => tenants.find(t => t.propertyId === propId)

  const handleSubmit = async (data: Parameters<React.ComponentProps<typeof PropertyForm>['onSubmit']>[0]) => {
    setSaving(true)
    try {
      if (editTarget) {
        await updateProperty(editTarget.id, data)
        toast.success('Property updated')
      } else {
        await addProperty(data as Property)
        toast.success('Property added')
      }
      setModalOpen(false)
      setEditTarget(null)
      load()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await deleteProperty(deleteTarget.id)
      toast.success('Property deleted')
      setDeleteTarget(null)
      load()
    } catch {
      toast.error('Failed to delete')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Properties</h1>
          <p className="text-stone-500 text-sm mt-1">{properties.length} total · {tenants.length} occupied</p>
        </div>
        <button onClick={() => { setEditTarget(null); setModalOpen(true) }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Property
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by number, address..." />
        <div className="flex gap-2">
          {(['all', 'house', 'shop'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize',
              filter === f ? 'bg-brand-500 text-white shadow-warm' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            )}>{f}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-44 bg-stone-200 animate-pulse rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No properties found" description="Add your first property to get started" action={
          <button onClick={() => setModalOpen(true)} className="btn-primary">Add Property</button>
        } />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => {
            const tenant = getTenant(p.id)
            return (
              <div key={p.id} className="card p-5 hover:shadow-md transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn('p-2 rounded-xl', p.type === 'house' ? 'bg-blue-50' : 'bg-amber-50')}>
                      {p.type === 'house' ? <Home className="w-4 h-4 text-blue-600" /> : <Store className="w-4 h-4 text-amber-600" />}
                    </div>
                    <div>
                      <p className="font-bold text-stone-900">{p.propertyNumber}</p>
                      <p className="text-xs text-stone-400 capitalize">{p.type}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditTarget(p); setModalOpen(true) }} className="p-1.5 hover:bg-stone-100 rounded-lg">
                      <Edit2 className="w-3.5 h-3.5 text-stone-500" />
                    </button>
                    <button onClick={() => setDeleteTarget(p)} className="p-1.5 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-stone-600 mb-3 line-clamp-2">{p.address}</p>
                <p className="text-lg font-bold text-brand-600 mb-3">{formatCurrency(p.monthlyRent)}<span className="text-xs text-stone-400 font-normal">/mo</span></p>

                {tenant ? (
                  <div className="flex items-center gap-2 p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="w-7 h-7 bg-emerald-200 rounded-full flex items-center justify-center text-xs font-bold text-emerald-700">
                      {tenant.fullName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-stone-800 truncate">{tenant.fullName}</p>
                      <p className="text-xs text-stone-500">Since {formatDate(tenant.moveInDate)}</p>
                    </div>
                    <Link href={`/tenants?property=${p.id}`}>
                      <ChevronRight className="w-4 h-4 text-stone-400" />
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2.5 bg-stone-50 rounded-xl border border-stone-100">
                    <Users className="w-4 h-4 text-stone-400" />
                    <p className="text-xs text-stone-400">Vacant</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditTarget(null) }} title={editTarget ? 'Edit Property' : 'Add Property'} size="lg">
        <PropertyForm defaultValues={editTarget || {}} onSubmit={handleSubmit} loading={saving} />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Property"
        message={`Are you sure you want to delete ${deleteTarget?.propertyNumber}? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={saving}
      />
    </div>
  )
}

// Fix missing import
import { Building2 } from 'lucide-react'
