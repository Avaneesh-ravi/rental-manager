import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-stone-400" />
      </div>
      <h3 className="font-semibold text-stone-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-stone-400 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
