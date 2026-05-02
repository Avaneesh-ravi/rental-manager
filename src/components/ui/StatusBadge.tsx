import { cn, getStatusColor } from '@/lib/utils'

interface BadgeProps {
  status: 'paid' | 'pending' | 'overdue' | 'partial'
  className?: string
}

const labels = { paid: 'Paid', pending: 'Pending', overdue: 'Overdue', partial: 'Partial' }

export default function StatusBadge({ status, className }: BadgeProps) {
  return (
    <span className={cn('badge', getStatusColor(status), className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {labels[status]}
    </span>
  )
}
