import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Eye, EyeOff, Lock } from 'lucide-react'
import { useState } from 'react'
import { adminLoginSchema, type AdminLoginForm } from '@/lib/schemas'
import { authApi } from '@/api'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/ui'
import type { Admin } from '@/types'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const setUser  = useAuthStore((s) => s.setUser)
  const { error: showError } = useToast()
  const [showPwd, setShowPwd] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AdminLoginForm>({
    resolver: zodResolver(adminLoginSchema),
  })

  const onSubmit = async (data: AdminLoginForm) => {
    try {
      const res = await authApi.adminLogin(data.username, data.password)
      setUser({ ...res.admin, userType: 'admin' } as Admin & { userType: 'admin' })
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      showError((err as Error).message)
    }
  }

  return (
    <div className="auth-bg">
      {/* Decorative orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #2f6ab2, transparent 70%)' }} />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #4a85cc, transparent 70%)' }} />

      <div className="relative z-10 w-full max-w-md px-6 py-12 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-5 shadow-glow-blue"
            style={{ background: 'linear-gradient(135deg, #1e4d8a, #2f6ab2)' }}>
            <ShieldCheck className="w-9 h-9 text-white" />
          </div>
          <h1 className="font-display text-4xl text-brand-white mb-1">
            i<span className="text-brand-blue-light">Vote</span>
          </h1>
          <p className="text-brand-grey text-sm tracking-widest uppercase font-mono">Administration</p>
        </div>

        {/* Card */}
        <div className="glass px-8 py-8">
          {/* Admin-only notice */}
          <div className="flex items-center gap-2.5 bg-brand-blue/10 border border-brand-blue/20 rounded-xl px-4 py-3 mb-7">
            <Lock className="w-4 h-4 text-brand-blue-light shrink-0" />
            <p className="text-xs text-brand-grey-light leading-snug">
              This portal is restricted to administrators only.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Username */}
            <div>
              <label className="field-label">Username</label>
              <input
                {...register('username')}
                autoComplete="username"
                placeholder="admin"
                className={`field-input ${errors.username ? 'error' : ''}`}
              />
              {errors.username && (
                <p className="field-error"><span>⚠</span>{errors.username.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="field-label">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`field-input pr-11 ${errors.password ? 'error' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-grey hover:text-brand-white transition-colors"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="field-error"><span>⚠</span>{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full mt-2 py-3.5"
            >
              {isSubmitting
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in…</>
                : 'Sign In to Admin'}
            </button>
          </form>
        </div>

        {/* Voter link */}
        <p className="text-center text-brand-grey/60 text-xs mt-6">
          Not an admin?{' '}
          <a href="/login" className="text-brand-blue-light hover:underline">Voter login →</a>
        </p>
      </div>
    </div>
  )
}
