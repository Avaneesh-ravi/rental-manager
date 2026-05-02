'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Building2, Users, CreditCard,
  FileBarChart, LogOut, Menu, X, History, Wrench, MapPin
} from 'lucide-react'
import { useState } from 'react'
import { signOut } from '@/lib/firebase/auth'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/dashboard',                icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/properties',               icon: Building2,       label: 'Properties' },
  { href: '/tenants',                  icon: Users,           label: 'Tenants' },
  { href: '/tenants?filter=history',   icon: History,         label: 'Past Tenants' },
  { href: '/payments',                 icon: CreditCard,      label: 'Payments' },
  { href: '/reports',                  icon: FileBarChart,    label: 'Reports' },
  { href: '/vacancy',                  icon: MapPin,          label: 'Vacancy Tracker' },
  { href: '/maintenance',              icon: Wrench,          label: 'Maintenance' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    toast.success('Signed out')
    router.push('/auth/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shadow-warm">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-display font-bold text-stone-900 leading-none">RentFlow</p>
            <p className="text-xs text-stone-400 mt-0.5">Property Manager</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {nav.map(({ href, icon: Icon, label }) => {
          // exact match for query-string links, prefix match for the rest
          const isActive = href.includes('?')
            ? pathname + (typeof window !== 'undefined' ? window.location.search : '') === href
            : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn('nav-link', isActive && 'nav-link-active')}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-stone-100">
        <button
          onClick={handleSignOut}
          className="nav-link w-full text-red-500 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-stone-200 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setOpen(!open)}
          className="p-2 bg-white border border-stone-200 rounded-xl shadow-sm"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  )
}