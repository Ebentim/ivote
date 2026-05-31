import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { Vote, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { voterLoginSchema, type VoterLoginForm } from '@/lib/schemas'
import { authApi } from '@/api'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/ui'
import type { Voter } from '@/types'

export default function VoterLoginPage() {
  const navigate = useNavigate()
  const setUser  = useAuthStore((s) => s.setUser)
  const { error: showError } = useToast()
  const [showPwd, setShowPwd] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<VoterLoginForm>({
    resolver: zodResolver(voterLoginSchema),
  })

  const onSubmit = async (data: VoterLoginForm) => {
    try {
      const res = await authApi.voterLogin(data.username, data.password)
      setUser({ ...res.voter, userType: 'voter' } as Voter & { userType: 'voter' })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      showError((err as Error).message)
    }
  }

  return (
    <div className="auth-bg">
      {/* Background orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none opacity-30"
        style={{ background: 'radial-gradient(ellipse, #2f6ab2 0%, transparent 65%)', filter: 'blur(60px)' }} />
      <div className="absolute bottom-0 right-0 w-96 h-96 pointer-events-none opacity-10"
        style={{ background: 'radial-gradient(circle, #4a85cc, transparent 70%)' }} />

      <div className="relative z-10 w-full max-w-md px-6 py-12 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-5 shadow-glow-blue"
            style={{ background: 'linear-gradient(135deg, #1e4d8a 0%, #2f6ab2 60%, #4a85cc 100%)' }}>
            <Vote className="w-9 h-9 text-white" />
          </div>

          <h1 className="font-display text-5xl text-brand-white mb-1">
            i<span style={{ color: '#4a85cc' }}>Vote</span>
          </h1>
          <p className="text-brand-grey text-sm tracking-widest uppercase font-mono mt-1">
            Secure · Anonymous · Real-time
          </p>
        </div>

        {/* Card */}
        <div className="glass px-8 py-8">
          <div className="mb-7">
            <h2 className="font-display text-2xl text-brand-white mb-1">Welcome back</h2>
            <p className="text-brand-grey text-sm">Sign in with the credentials provided by your administrator.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div>
              <label className="field-label">Username</label>
              <input
                {...register('username')}
                autoComplete="username"
                placeholder="your.username"
                className={`field-input ${errors.username ? 'error' : ''}`}
              />
              {errors.username && <p className="field-error"><span>⚠</span>{errors.username.message}</p>}
            </div>

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
                <button type="button" onClick={() => setShowPwd((p) => !p)} tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-grey hover:text-brand-white transition-colors">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="field-error"><span>⚠</span>{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-2 py-3.5">
              {isSubmitting
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in…</>
                : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Privacy note */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-brand-grey/50 text-xs leading-relaxed">
            🔒 Your identity is protected — all votes are cryptographically anonymous.
          </p>
          <p className="text-brand-grey/40 text-xs">
            Access is by invitation only. Contact your administrator.
          </p>
        </div>
      </div>
    </div>
  )
}
