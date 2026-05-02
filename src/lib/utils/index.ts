// src/lib/utils/index.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isAfter, isBefore, startOfMonth, endOfMonth } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: Date | undefined): string {
  if (!date) return '—'
  return format(date, 'dd MMM yyyy')
}

export function formatMonth(month: number, year: number): string {
  return format(new Date(year, month - 1), 'MMMM yyyy')
}

export const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

export function getMonthYear(date = new Date()) {
  return { month: date.getMonth() + 1, year: date.getFullYear() }
}

export function maskAadhaar(aadhaar: string): string {
  if (aadhaar.length !== 12) return aadhaar
  return `XXXX-XXXX-${aadhaar.slice(8)}`
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'paid': return 'text-emerald-600 bg-emerald-50 border-emerald-200'
    case 'pending': return 'text-amber-600 bg-amber-50 border-amber-200'
    case 'overdue': return 'text-red-600 bg-red-50 border-red-200'
    case 'partial': return 'text-blue-600 bg-blue-50 border-blue-200'
    default: return 'text-stone-600 bg-stone-50 border-stone-200'
  }
}

export function generatePropertyNumber(type: 'house' | 'shop', index: number): string {
  const prefix = type === 'house' ? 'H' : 'S'
  return `${prefix}${String(index).padStart(3, '0')}`
}
