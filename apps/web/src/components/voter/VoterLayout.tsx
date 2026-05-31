import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Vote, LogOut } from 'lucide-react'
import { useAuthStore, useCurrentUser } from '@/store/auth'
import { authApi } from '@/api'
import { Avatar } from '@/components/ui'
import type { Voter } from '@/types'

export default function VoterLayout() {
  const navigate   = useNavigate()
  const user       = useCurrentUser() as (Voter & { userType: 'voter' }) | null
  const logout     = useAuthStore((s) => s.logout)

  const handleLogout = async () => {
    try { await authApi.logout() } catch { /* ignore */ }
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-brand-ink flex flex-col">
      {/* Top nav */}
      <header
        className="sticky top-0 z-40 border-b border-white/[0.06] backdrop-blur-xl"
        style={{ background: 'rgba(10,22,40,0.9)' }}
      >
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <NavLink to="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1e4d8a, #2f6ab2)' }}
            >
              <Vote className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-lg text-brand-white">
              i<span className="text-brand-blue-light">Vote</span>
            </span>
          </NavLink>

          {/* Right */}
          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden sm:flex items-center gap-2.5">
                <Avatar name={user.displayName} size="xs" />
                <div>
                  <p className="text-brand-white text-xs font-semibold leading-none">{user.displayName}</p>
                  <p className="text-brand-grey text-[10px] mt-0.5">Verified Voter</p>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="btn-ghost text-brand-grey hover:text-red-400 gap-1.5 text-xs px-3 py-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Live indicator bar */}
      <div className="bg-emerald-500/10 border-b border-emerald-500/15">
        <div className="max-w-4xl mx-auto px-4 py-1.5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
          <p className="text-emerald-400/80 text-[11px] font-mono tracking-wide">
            LIVE — Results update every 5 seconds
          </p>
        </div>
      </div>

      {/* Page */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
