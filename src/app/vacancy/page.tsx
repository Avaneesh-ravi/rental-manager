'use client'
import { useEffect, useState, useCallback } from 'react'
import { Home, Store, TrendingDown, AlertCircle, CheckCircle2 } from 'lucide-react'
import { getProperties } from '@/lib/firebase/properties'
import { getActiveTenants } from '@/lib/firebase/tenants'
import type { Property, Tenant } from '@/lib/types'
import { formatCurrency, cn } from '@/lib/utils'

interface VacancyInfo {
  property: Property
  tenant: Tenant | null
  daysVacant: number
  rentLost: number
}

function getDaysVacant(property: Property, tenant: Tenant | null): number {
  if (tenant) return 0
  const since = property.updatedAt instanceof Date ? property.updatedAt : new Date(property.updatedAt)
  const now = new Date()
  return Math.max(0, Math.floor((now.getTime() - since.getTime()) / (1000 * 60 * 60 * 24)))
}

export default function VacancyTrackerPage() {
  const [data, setData] = useState<VacancyInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'vacant' | 'occupied'>('all')

  const load = useCallback(async () => {
    const [props, tenants] = await Promise.all([getProperties(), getActiveTenants()])
    const infos: VacancyInfo[] = props.map(p => {
      const tenant = tenants.find(t => t.propertyId === p.id) ?? null
      const daysVacant = getDaysVacant(p, tenant)
      const rentLost = tenant ? 0 : parseFloat(((p.monthlyRent / 30) * daysVacant).toFixed(2))
      return { property: p, tenant, daysVacant, rentLost }
    })
    setData(infos)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = data.filter(d => {
    if (filter === 'vacant') return !d.tenant
    if (filter === 'occupied') return !!d.tenant
    return true
  })

  const totalVacant = data.filter(d => !d.tenant).length
  const totalOccupied = data.filter(d => !!d.tenant).length
  const totalRentLost = data.reduce((sum, d) => sum + d.rentLost, 0)
  const occupancyRate = data.length ? Math.round((totalOccupied / data.length) * 100) : 0

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="page-title">Vacancy Tracker</h1>
        <p className="text-stone-500 text-sm mt-1">Monitor vacant properties and estimated rent loss</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-xs text-stone-500 mb-1">Occupancy Rate</p>
          <p className="text-2xl font-bold text-emerald-600">{occupancyRate}%</p>
          <p className="text-xs text-stone-400 mt-1">{totalOccupied} of {data.length} units</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-stone-500 mb-1">Vacant</p>
          <p className="text-2xl font-bold text-red-500">{totalVacant}</p>
          <p className="text-xs text-stone-400 mt-1">properties</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-stone-500 mb-1">Occupied</p>
          <p className="text-2xl font-bold text-stone-800">{totalOccupied}</p>
          <p className="text-xs text-stone-400 mt-1">properties</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-stone-500 mb-1">Est. Rent Lost</p>
          <p className="text-xl font-bold text-amber-600">{formatCurrency(totalRentLost)}</p>
          <p className="text-xs text-stone-400 mt-1">from vacant units</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'vacant', 'occupied'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={cn(
            'px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize',
            filter === f ? 'bg-brand-500 text-white shadow-warm' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
          )}>{f}</button>
        ))}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-stone-200 animate-pulse rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center text-stone-400 text-sm">No properties match this filter.</div>
      ) : (
        <>
          {/* ── Mobile: Card list ── */}
          <div className="flex flex-col gap-3 lg:hidden">
            {filtered.map(({ property: p, tenant, daysVacant, rentLost }) => (
              <div key={p.id} className={cn('card p-4', !tenant && 'border-l-4 border-l-red-400')}>
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn('p-2 rounded-xl', p.type === 'house' ? 'bg-blue-50' : 'bg-amber-50')}>
                      {p.type === 'house'
                        ? <Home className="w-4 h-4 text-blue-600" />
                        : <Store className="w-4 h-4 text-amber-600" />}
                    </div>
                    <div>
                      <p className="font-bold text-stone-900">{p.propertyNumber}</p>
                      <p className="text-xs text-stone-400">{p.address}</p>
                    </div>
                  </div>
                  {tenant ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700">
                      <CheckCircle2 className="w-3 h-3" /> Occupied
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-red-50 text-red-600">
                      <AlertCircle className="w-3 h-3" /> Vacant
                    </span>
                  )}
                </div>

                {/* Details row */}
                <div className="grid grid-cols-3 gap-2 text-center bg-stone-50 rounded-xl p-3">
                  <div>
                    <p className="text-xs text-stone-400 mb-0.5">Tenant</p>
                    <p className="text-xs font-medium text-stone-700 truncate">
                      {tenant ? tenant.fullName.split(' ')[0] : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400 mb-0.5">Rent/mo</p>
                    <p className="text-xs font-medium text-stone-700">{formatCurrency(p.monthlyRent)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400 mb-0.5">
                      {tenant ? 'Status' : 'Days Vacant'}
                    </p>
                    {tenant ? (
                      <p className="text-xs font-medium text-emerald-600">Active</p>
                    ) : (
                      <p className={cn('text-xs font-bold',
                        daysVacant > 30 ? 'text-red-600' : daysVacant > 7 ? 'text-amber-600' : 'text-stone-600'
                      )}>{daysVacant}d</p>
                    )}
                  </div>
                </div>

                {/* Rent lost */}
                {rentLost > 0 && (
                  <div className="flex items-center justify-between mt-3 px-3 py-2 bg-red-50 rounded-xl">
                    <span className="text-xs text-red-500 flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" /> Estimated rent loss
                    </span>
                    <span className="text-sm font-bold text-red-600">{formatCurrency(rentLost)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Desktop: Table ── */}
          <div className="card overflow-hidden hidden lg:block">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Property</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Tenant</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Days Vacant</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Rent/mo</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Est. Loss</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filtered.map(({ property: p, tenant, daysVacant, rentLost }) => (
                  <tr key={p.id} className={cn('hover:bg-stone-50 transition-colors', !tenant && 'bg-red-50/30')}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-stone-900">{p.propertyNumber}</p>
                      <p className="text-xs text-stone-400 truncate max-w-[160px]">{p.address}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium',
                        p.type === 'house' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                      )}>
                        {p.type === 'house' ? <Home className="w-3 h-3" /> : <Store className="w-3 h-3" />}
                        {p.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {tenant ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" /> Occupied
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-red-50 text-red-600">
                          <AlertCircle className="w-3 h-3" /> Vacant
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {tenant ? tenant.fullName : <span className="text-stone-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!tenant ? (
                        <span className={cn('font-semibold', daysVacant > 30 ? 'text-red-600' : daysVacant > 7 ? 'text-amber-600' : 'text-stone-600')}>
                          {daysVacant}d
                        </span>
                      ) : <span className="text-stone-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-stone-700">{formatCurrency(p.monthlyRent)}</td>
                    <td className="px-4 py-3 text-right">
                      {rentLost > 0 ? (
                        <span className="font-semibold text-red-500 flex items-center justify-end gap-1">
                          <TrendingDown className="w-3 h-3" />{formatCurrency(rentLost)}
                        </span>
                      ) : <span className="text-stone-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}