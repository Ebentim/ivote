import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Vote, Users, ShieldCheck, LogOut, ChevronRight, Menu } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore, useIsSuperAdmin, useCurrentUser } from '@/store/auth'
import { authApi } from '@/api'
import { Avatar } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { Admin } from '@/types'

const NAV = [
  { to: '/admin/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/elections',  icon: Vote,             label: 'Elections'  },
  { to: '/admin/voters',     icon: Users,            label: 'Voters'     },
]

export default function AdminLayout() {
  const navigate    = useNavigate()
  const user        = useCurrentUser() as (Admin & { userType: 'admin' }) | null
  const isSuperAdmin = useIsSuperAdmin()
  const logout      = useAuthStore((s) => s.logout)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    try { await authApi.logout() } catch { /* ignore */ }
    logout()
    navigate('/admin/login', { replace: true })
  }

  const sidebarContent = (
    <aside className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-glow-sm"
            style={{ background: 'linear-gradient(135deg, #1e4d8a, #2f6ab2)' }}>
            <Vote className="w-5 h-5 text-white" />
          </div>
          <span className="font-display text-xl text-brand-white">
            i<span className="text-brand-blue-light">Vote</span>
          </span>
        </div>

        {/* Admin profile chip */}
        {user && (
          <div className="flex items-center gap-3 bg-brand-blue/10 border border-brand-blue/20 rounded-xl px-3 py-2.5">
            <Avatar name={user.displayName} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-brand-white text-xs font-semibold truncate">{user.displayName}</p>
              <p className="text-brand-blue-light text-[10px] font-mono uppercase tracking-wider">
                {user.role === 'superadmin' ? '⚡ Superadmin' : 'Admin'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to} to={to}
            className={({ isActive }) => cn('nav-item', isActive && 'active')}
            onClick={() => setSidebarOpen(false)}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
            <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-30" />
          </NavLink>
        ))}

        {isSuperAdmin && (
          <NavLink
            to="/admin/admins"
            className={({ isActive }) => cn('nav-item', isActive && 'active')}
            onClick={() => setSidebarOpen(false)}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            Administrators
            <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-30" />
          </NavLink>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-6 pt-3 border-t border-white/[0.06]">
        <button onClick={handleLogout} className="nav-item w-full text-red-400/70 hover:text-red-400 hover:bg-red-500/10">
          <LogOut className="w-4 h-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-dvh overflow-hidden bg-brand-ink">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col w-60 shrink-0 border-r border-white/[0.06]"
        style={{ background: 'linear-gradient(180deg, #0d1f3c 0%, #0a1628 100%)' }}>
        {sidebarContent}
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-brand-ink/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 border-r border-white/[0.06] z-50"
            style={{ background: 'linear-gradient(180deg, #0d1f3c 0%, #0a1628 100%)' }}>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] shrink-0"
          style={{ background: '#0a1628' }}>
          <button className="btn-icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-display text-lg text-brand-white">
            i<span className="text-brand-blue-light">Vote</span>
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
