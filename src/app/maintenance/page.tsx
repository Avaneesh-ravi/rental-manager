'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Wrench, CheckCircle2, Clock, AlertCircle, Edit2, Trash2, Home, Store } from 'lucide-react'
import {
  getMaintenanceRequests, addMaintenanceRequest,
  updateMaintenanceRequest, deleteMaintenanceRequest
} from '@/lib/firebase/maintenance'
import { getProperties } from '@/lib/firebase/properties'
import type { MaintenanceRequest, Property } from '@/lib/types'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import SearchBar from '@/components/ui/SearchBar'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const STATUS_CONFIG = {
  pending:    { label: 'Pending',    icon: Clock,         color: 'bg-amber-50 text-amber-700 border-amber-200' },
  inprogress: { label: 'In Progress', icon: Wrench,       color: 'bg-blue-50 text-blue-700 border-blue-200' },
  resolved:   { label: 'Resolved',   icon: CheckCircle2,  color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
} as const

type Status = keyof typeof STATUS_CONFIG

interface FormState {
  propertyId: string
  title: string
  description: string
  status: Status
  cost: string
  dateRaised: string
  dateResolved: string
}

const emptyForm = (): FormState => ({
  propertyId: '',
  title: '',
  description: '',
  status: 'pending',
  cost: '',
  dateRaised: new Date().toISOString().split('T')[0],
  dateResolved: '',
})

export default function MaintenancePage() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<MaintenanceRequest | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceRequest | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [reqs, props] = await Promise.all([getMaintenanceRequests(), getProperties()])
    setRequests(reqs)
    setProperties(props)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const getProperty = (id: string) => properties.find(p => p.id === id)

  const openAdd = () => { setEditTarget(null); setForm(emptyForm()); setModalOpen(true) }
  const openEdit = (r: MaintenanceRequest) => {
    setEditTarget(r)
    setForm({
      propertyId: r.propertyId,
      title: r.title,
      description: r.description ?? '',
      status: r.status,
      cost: r.cost != null ? String(r.cost) : '',
      dateRaised: r.dateRaised instanceof Date ? r.dateRaised.toISOString().split('T')[0] : String(r.dateRaised).split('T')[0],
      dateResolved: r.dateResolved
        ? (r.dateResolved instanceof Date ? r.dateResolved.toISOString().split('T')[0] : String(r.dateResolved).split('T')[0])
        : '',
    })
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.propertyId || !form.title) { toast.error('Fill required fields'); return }
    setSaving(true)
    try {
      const payload = {
        propertyId: form.propertyId,
        title: form.title,
        description: form.description || undefined,
        status: form.status,
        cost: form.cost ? parseFloat(form.cost) : undefined,
        dateRaised: new Date(form.dateRaised),
        dateResolved: form.dateResolved ? new Date(form.dateResolved) : undefined,
      }
      if (editTarget) {
        await updateMaintenanceRequest(editTarget.id, payload)
        toast.success('Request updated')
      } else {
        await addMaintenanceRequest(payload)
        toast.success('Request added')
      }
      setModalOpen(false)
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
      await deleteMaintenanceRequest(deleteTarget.id)
      toast.success('Deleted')
      setDeleteTarget(null)
      load()
    } catch {
      toast.error('Failed to delete')
    } finally {
      setSaving(false)
    }
  }

  const filtered = requests.filter(r => {
    const matchStatus = statusFilter === 'all' || r.status === statusFilter
    const prop = getProperty(r.propertyId)
    const matchSearch = !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (prop?.propertyNumber ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (r.description ?? '').toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const totalCost = requests.filter(r => r.status === 'resolved' && r.cost).reduce((s, r) => s + (r.cost ?? 0), 0)
  const pendingCount = requests.filter(r => r.status === 'pending').length
  const inProgressCount = requests.filter(r => r.status === 'inprogress').length

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Maintenance Log</h1>
          <p className="text-stone-500 text-sm mt-1">Track repair requests, status, and costs per property</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-stone-500 mb-1">Total Requests</p>
          <p className="text-2xl font-bold text-stone-800">{requests.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-stone-500 mb-1">Pending</p>
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-stone-500 mb-1">In Progress</p>
          <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-stone-500 mb-1">Total Repair Cost</p>
          <p className="text-2xl font-bold text-stone-700">{formatCurrency(totalCost)}</p>
          <p className="text-xs text-stone-400">resolved only</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by title, property..." />
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'inprogress', 'resolved'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize',
              statusFilter === s ? 'bg-brand-500 text-white shadow-warm' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            )}>{s === 'inprogress' ? 'In Progress' : s === 'all' ? 'All' : STATUS_CONFIG[s].label}</button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-stone-200 animate-pulse rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Wrench className="w-10 h-10 text-stone-200 mx-auto mb-3" />
          <p className="text-stone-400 text-sm">No maintenance requests found.</p>
          <button onClick={openAdd} className="btn-primary mt-4">Add First Request</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const prop = getProperty(r.propertyId)
            const statusCfg = STATUS_CONFIG[r.status as Status] ?? STATUS_CONFIG.pending
            const StatusIcon = statusCfg.icon
            return (
              <div key={r.id} className="card p-4 hover:shadow-md transition-all group">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-stone-100 mt-0.5">
                    <Wrench className="w-4 h-4 text-stone-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-stone-900">{r.title}</p>
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium border', statusCfg.color)}>
                        <StatusIcon className="w-3 h-3" />{statusCfg.label}
                      </span>
                    </div>
                    {r.description && <p className="text-sm text-stone-500 mb-2 line-clamp-2">{r.description}</p>}
                    <div className="flex items-center gap-4 flex-wrap text-xs text-stone-400">
                      {prop && (
                        <span className="flex items-center gap-1">
                          {prop.type === 'house' ? <Home className="w-3 h-3" /> : <Store className="w-3 h-3" />}
                          {prop.propertyNumber}
                        </span>
                      )}
                      <span>Raised: {formatDate(r.dateRaised)}</span>
                      {r.dateResolved && <span className="text-emerald-600">Resolved: {formatDate(r.dateResolved)}</span>}
                      {r.cost != null && (
                        <span className="font-semibold text-stone-600">Cost: {formatCurrency(r.cost)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-stone-100 rounded-lg">
                      <Edit2 className="w-3.5 h-3.5 text-stone-500" />
                    </button>
                    <button onClick={() => setDeleteTarget(r)} className="p-1.5 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Request' : 'New Maintenance Request'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label">Property *</label>
              <select value={form.propertyId} onChange={e => setForm(f => ({ ...f, propertyId: e.target.value }))}
                className="input w-full" required>
                <option value="">Select property...</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.propertyNumber} — {p.address}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="input w-full" placeholder="e.g. Leaking pipe in bathroom" required />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="input w-full h-20 resize-none" placeholder="More details..." />
            </div>
            <div>
              <label className="form-label">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))}
                className="input w-full">
                <option value="pending">Pending</option>
                <option value="inprogress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div>
              <label className="form-label">Repair Cost (optional)</label>
              <input type="number" min="0" step="0.01" value={form.cost}
                onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                className="input w-full" placeholder="0.00" />
            </div>
            <div>
              <label className="form-label">Date Raised *</label>
              <input type="date" value={form.dateRaised}
                onChange={e => setForm(f => ({ ...f, dateRaised: e.target.value }))}
                className="input w-full" required />
            </div>
            <div>
              <label className="form-label">Date Resolved</label>
              <input type="date" value={form.dateResolved}
                onChange={e => setForm(f => ({ ...f, dateResolved: e.target.value }))}
                className="input w-full" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : editTarget ? 'Update' : 'Add Request'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Request"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={saving}
      />
    </div>
  )
}