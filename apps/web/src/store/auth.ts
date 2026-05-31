import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Admin, Voter } from '@/types'

type AuthUser =
  | ({ userType: 'admin' } & Admin)
  | ({ userType: 'voter' } & Voter)

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  setUser: (user: AuthUser | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      logout: () => {
        localStorage.removeItem('ivote_token')
        set({ user: null, isAuthenticated: false })
      },
    }),
    {
      name: 'ivote-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
)

// Selectors
export const useIsAdmin = () => useAuthStore((s) => s.user?.userType === 'admin')
export const useIsSuperAdmin = () =>
  useAuthStore((s) => s.user?.userType === 'admin' && (s.user as Admin & { userType: 'admin' }).role === 'superadmin')
export const useCurrentUser = () => useAuthStore((s) => s.user)
