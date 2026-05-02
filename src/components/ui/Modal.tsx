'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' }

export default function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4 sm:pt-10 mb-10">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
        <div className={cn(
          'relative w-full bg-white shadow-2xl animate-fade-in-up flex flex-col',
          'h-[100dvh] sm:h-auto sm:max-h-[85vh] sm:rounded-2xl',
          'rounded-none',
          sizes[size]
        )}>
          {/* Sticky header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-stone-100 flex-shrink-0 sticky top-0 bg-white z-10 rounded-t-none sm:rounded-t-2xl">
            <h2 className="text-base sm:text-lg font-semibold text-stone-900">{title}</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-stone-500" />
            </button>
          </div>
          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 sm:py-6">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}