'use client'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Building2 } from 'lucide-react'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login')
  }, [user, loading, router])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="text-center">
        <div className="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-3 animate-pulse">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <p className="text-stone-500 text-sm">Loading...</p>
      </div>
    </div>
  )

  if (!user) return null
  return <>{children}</>
}
