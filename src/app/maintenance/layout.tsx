import Sidebar from '@/components/layout/Sidebar'
import AuthGuard from '@/components/layout/AuthGuard'

export default function MaintenanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-stone-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8 pt-16 lg:pt-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}