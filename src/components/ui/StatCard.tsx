import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string
  sub?: string
  icon: LucideIcon
  color?: 'orange' | 'green' | 'red' | 'blue' | 'stone'
  trend?: { value: string; up: boolean }
}

const colors = {
  orange: 'bg-brand-50 text-brand-600 border-brand-100',
  green:  'bg-emerald-50 text-emerald-600 border-emerald-100',
  red:    'bg-red-50 text-red-600 border-red-100',
  blue:   'bg-blue-50 text-blue-600 border-blue-100',
  stone:  'bg-stone-50 text-stone-600 border-stone-200',
}

export default function StatCard({ label, value, sub, icon: Icon, color = 'stone', trend }: StatCardProps) {
  return (
    <div className="card p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2.5 rounded-xl border', colors[color])}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={cn('text-xs font-medium', trend.up ? 'text-emerald-600' : 'text-red-500')}>
            {trend.up ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-stone-900 leading-none">{value}</p>
      <p className="text-sm text-stone-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
    </div>
  )
}
