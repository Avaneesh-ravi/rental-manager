// src/app/dashboard/page.tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  Building2, Users, TrendingUp, AlertCircle,
  CheckCircle, Home, Store, RefreshCw, Clock, Trash2, X
} from 'lucide-react'
import StatCard from '@/components/ui/StatCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { getProperties } from '@/lib/firebase/properties'
import { getActiveTenants, getTenants } from '@/lib/firebase/tenants'
import { getPaymentsByMonth, updateOverduePayments, getPendingPayments, deletePayment } from '@/lib/firebase/payments'
import { formatCurrency, formatDate, getMonthYear, formatMonth } from '@/lib/utils'
import type { Property, Tenant, Payment } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'

// ── PaymentRow lives OUTSIDE the page component to avoid SWC parse errors ──
function PaymentRow({
  p,
  type,
  inactive,
  deletingId,
  onDelete,
  onNavigate,
}: {
  p: Payment
  type: 'overdue' | 'pending'
  inactive: boolean
  deletingId: string | null
  onDelete: (id: string, e: React.MouseEvent) => void
  onNavigate: (tenantId: string) => void
}) {
  const paid = Number(p.partialAmount || 0)
  const remaining = Number(p.amount) - paid
  const bgClass = inactive
    ? 'bg-stone-50 border-stone-200'
    : type === 'overdue'
      ? 'bg-red-50 border-red-100 hover:bg-red-100'
      : 'bg-amber-50 border-amber-100 hover:bg-amber-100'

  return (
    <div className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors ${bgClass}`}>
      <button
        className="flex-1 text-left focus:outline-none"
        onClick={() => !inactive && onNavigate(p.tenantId)}
        disabled={inactive}
      >
        <div className="flex items-center gap-2">
          <p className={`text-sm font-semibold ${inactive ? 'text-stone-400 line-through' : 'text-stone-800'}`}>
            {p.tenantName}
          </p>
          {inactive && (
            <span className="text-xs bg-stone-200 text-stone-500 px-1.5 py-0.5 rounded-full">Inactive</span>
          )}
        </div>
        <p className="text-xs text-stone-500 mt-0.5">
          {p.propertyNumber} · {formatMonth(p.month, p.year)}
        </p>
        {paid > 0 && (
          <p className="text-xs text-emerald-600 mt-0.5">Partial paid: {formatCurrency(paid)}</p>
        )}
      </button>

      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
        <div className="text-right">
          {paid > 0 && (
            <>
              <p className="text-xs text-stone-400 line-through">{formatCurrency(Number(p.amount))}</p>
              <p className="text-xs text-emerald-600 font-medium">Paid: {formatCurrency(paid)}</p>
            </>
          )}
          <p className={`text-sm font-bold ${type === 'overdue' ? 'text-red-600' : 'text-amber-600'}`}>
            Balance: {formatCurrency(remaining)}
          </p>
          <StatusBadge status={p.status} />
        </div>

        {inactive && (
          <button
            onClick={(e) => onDelete(p.id, e)}
            disabled={deletingId === p.id}
            className="p-2 bg-red-100 text-red-500 hover:bg-red-200 rounded-lg transition-colors flex-shrink-0"
            title="Delete this record"
          >
            {deletingId === p.id
              ? <RefreshCw className="w-4 h-4 animate-spin" />
              : <Trash2 className="w-4 h-4" />
            }
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main Page ──
export default function DashboardPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [allTenants, setAllTenants] = useState<Tenant[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [globalPending, setGlobalPending] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [showOverduePanel, setShowOverduePanel] = useState(false)
  const [showPendingPanel, setShowPendingPanel] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  const { month, year } = getMonthYear()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [props, tens, allTens] = await Promise.all([
        getProperties(),
        getActiveTenants(),
        getTenants()
      ])

      const { generateMonthlyPayments } = await import('@/lib/firebase/payments')
      for (const tenant of tens) {
        const prop = props.find(p => p.id === tenant.propertyId)
        if (prop) {
          await generateMonthlyPayments(
            tenant.id, prop.id, tenant.fullName, prop.propertyNumber,
            tenant.monthlyRent, month, year, tenant.moveInDate
          )
        }
      }

      const { deleteDuplicatePayments } = await import('@/lib/firebase/payments')
      await deleteDuplicatePayments()
      await updateOverduePayments()
      const [pays, pendingPays] = await Promise.all([
        getPaymentsByMonth(month, year),
        getPendingPayments()
      ])

      setProperties(props)
      setTenants(tens)
      setAllTenants(allTens)
      setPayments(pays)
      setGlobalPending(pendingPays)
    } catch (e) {
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => { load() }, [load])

  const isTenantInactive = (tenantId: string) => {
    const t = allTenants.find(t => t.id === tenantId)
    return t ? !t.isActive : false
  }

  const handleDeletePayment = async (paymentId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this payment record?')) return
    setDeletingId(paymentId)
    try {
      await deletePayment(paymentId)
      setGlobalPending(prev => prev.filter(p => p.id !== paymentId))
      toast.success('Payment record deleted')
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  const totalRent = properties.reduce((s, p) => s + Number(p.monthlyRent), 0)
  const collected = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)
  const partialCollected = payments.filter(p => p.status === 'partial').reduce((s, p) => s + Number(p.partialAmount || 0), 0)

  const overduePayments = [...globalPending.filter(p => p.status === 'overdue')]
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
  const overdueAmount = overduePayments.reduce((s, p) => s + Number(p.amount) - Number(p.partialAmount || 0), 0)

  const pendingPayments = [...globalPending.filter(p => p.status === 'pending' || p.status === 'partial')]
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
  const pendingAmount = pendingPayments.reduce((s, p) => s + Number(p.amount) - Number(p.partialAmount || 0), 0)

  const occupied = tenants.length

  const chartData = [
    { name: 'Collected', value: collected + partialCollected, fill: '#dc711a' },
    { name: 'Pending', value: payments.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0), fill: '#f59e0b' },
    { name: 'Overdue', value: payments.filter(p => p.status === 'overdue').reduce((s, p) => s + Number(p.amount), 0), fill: '#ef4444' },
  ]

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-stone-200 rounded-xl w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-stone-200 rounded-2xl" />)}
      </div>
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-stone-500 text-sm mt-1">{formatMonth(month, year)} Overview</p>
        </div>
        <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Properties" value={String(properties.length)} sub={`${properties.filter(p => p.type === 'house').length} houses · ${properties.filter(p => p.type === 'shop').length} shops`} icon={Building2} color="stone" />
        <StatCard label="Active Tenants" value={String(occupied)} sub={`${properties.length - occupied} vacant`} icon={Users} color="blue" />
        <StatCard label="Monthly Revenue" value={formatCurrency(totalRent)} sub="Expected this month" icon={TrendingUp} color="orange" />
        <StatCard label="Collected" value={formatCurrency(collected + partialCollected)} sub={`${((collected + partialCollected) / totalRent * 100 || 0).toFixed(0)}% of total`} icon={CheckCircle} color="green" />
      </div>

      {/* Stats Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => { setShowOverduePanel(v => !v); setShowPendingPanel(false) }}
          className="text-left focus:outline-none rounded-2xl transition hover:opacity-80"
        >
          <StatCard label="Overdue" value={formatCurrency(overdueAmount)} sub={`${overduePayments.length} record(s) · tap to view`} icon={AlertCircle} color="red" />
        </button>

        <button
          onClick={() => { setShowPendingPanel(v => !v); setShowOverduePanel(false) }}
          className="text-left focus:outline-none rounded-2xl transition hover:opacity-80"
        >
          <StatCard label="Pending" value={formatCurrency(pendingAmount)} sub={`${pendingPayments.length} record(s) · tap to view`} icon={Clock} color="orange" />
        </button>

        <StatCard label="Houses" value={String(properties.filter(p => p.type === 'house').length)} icon={Home} color="blue" />
        <StatCard label="Shops" value={String(properties.filter(p => p.type === 'shop').length)} icon={Store} color="orange" />
      </div>

      {/* Overdue Panel */}
      {showOverduePanel && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              Overdue Payments
              <span className="text-xs font-normal text-stone-400 ml-1">— All months</span>
            </h2>
            <button onClick={() => setShowOverduePanel(false)} className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors">
              <X className="w-4 h-4 text-stone-400" />
            </button>
          </div>
          {overduePayments.length === 0 ? (
            <p className="text-stone-400 text-sm py-8 text-center">No overdue payments 🎉</p>
          ) : (
            <div className="space-y-2">
              {overduePayments.map(p => (
                <PaymentRow
                  key={p.id}
                  p={p}
                  type="overdue"
                  inactive={isTenantInactive(p.tenantId)}
                  deletingId={deletingId}
                  onDelete={handleDeletePayment}
                  onNavigate={(id) => router.push(`/tenants/${id}`)}
                />
              ))}
              <div className="pt-3 border-t border-stone-100 flex justify-between items-center">
                <span className="text-xs text-stone-500">{overduePayments.length} records</span>
                <span className="text-sm font-bold text-red-600">Total: {formatCurrency(overdueAmount)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pending Panel */}
      {showPendingPanel && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Pending Payments
              <span className="text-xs font-normal text-stone-400 ml-1">— All months</span>
            </h2>
            <button onClick={() => setShowPendingPanel(false)} className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors">
              <X className="w-4 h-4 text-stone-400" />
            </button>
          </div>
          {pendingPayments.length === 0 ? (
            <p className="text-stone-400 text-sm py-8 text-center">No pending payments</p>
          ) : (
            <div className="space-y-2">
              {pendingPayments.map(p => (
                <PaymentRow
                  key={p.id}
                  p={p}
                  type="pending"
                  inactive={isTenantInactive(p.tenantId)}
                  deletingId={deletingId}
                  onDelete={handleDeletePayment}
                  onNavigate={(id) => router.push(`/tenants/${id}`)}
                />
              ))}
              <div className="pt-3 border-t border-stone-100 flex justify-between items-center">
                <span className="text-xs text-stone-500">{pendingPayments.length} records</span>
                <span className="text-sm font-bold text-amber-600">Total: {formatCurrency(pendingAmount)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chart + Summary */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="section-title mb-4">Revenue Breakdown</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#78716c' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e7e5e4', fontSize: 13 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => <rect key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h2 className="section-title mb-4">Payment Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-stone-50 rounded-xl">
              <span className="text-sm text-stone-600">Expected (This Month)</span>
              <span className="font-bold text-stone-800">{formatCurrency(totalRent)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl">
              <span className="text-sm text-emerald-700">Collected</span>
              <span className="font-bold text-emerald-700">{formatCurrency(collected + partialCollected)}</span>
            </div>
            <button
              className="w-full flex justify-between items-center p-3 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
              onClick={() => { setShowPendingPanel(true); setShowOverduePanel(false) }}
            >
              <span className="text-sm text-amber-700">Pending (all months)</span>
              <span className="font-bold text-amber-700">{formatCurrency(pendingAmount)}</span>
            </button>
            <button
              className="w-full flex justify-between items-center p-3 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
              onClick={() => { setShowOverduePanel(true); setShowPendingPanel(false) }}
            >
              <span className="text-sm text-red-700">Overdue (all months)</span>
              <span className="font-bold text-red-700">{formatCurrency(overdueAmount)}</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}