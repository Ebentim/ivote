import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import type { Admin } from '@/types'

// Require any authenticated session (voter or admin)
export function RequireAuth({ redirectTo }: { redirectTo: string }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()
  if (!isAuthenticated) return <Navigate to={redirectTo} state={{ from: location }} replace />
  return <Outlet />
}

// Require admin role — renders nested routes via <Outlet>
export function RequireAdmin() {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/admin/login" replace />
  if (user.userType !== 'admin') return <Navigate to="/dashboard" replace />
  return <Outlet />
}

// Require superadmin role — wraps a single child element
export function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user || user.userType !== 'admin') return <Navigate to="/admin/login" replace />
  if ((user as Admin & { userType: 'admin' }).role !== 'superadmin') {
    return <Navigate to="/admin/dashboard" replace />
  }
  return <>{children}</>
}

// Require voter role — renders nested routes via <Outlet>
export function RequireVoter() {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (user.userType !== 'voter') return <Navigate to="/admin/dashboard" replace />
  return <Outlet />
}

// Redirect already-authenticated users away from login pages
export function RedirectAuthenticated({
  adminTo,
  voterTo,
  children,
}: {
  adminTo: string
  voterTo: string
  children: React.ReactNode
}) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <>{children}</>
  return user.userType === 'admin'
    ? <Navigate to={adminTo} replace />
    : <Navigate to={voterTo} replace />
}
