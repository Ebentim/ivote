import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cn, getInitials, getAvatarColor } from '@/lib/utils'
import type { ElectionStatus, ElectionVisibility } from '@/types'

// ── Avatar ────────────────────────────────────────────────────────────────────
interface AvatarProps {
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  src?: string | null
  className?: string
}

const SIZES = { xs: 'w-7 h-7 text-[10px]', sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-lg' }

export function Avatar({ name, size = 'md', src, className }: AvatarProps) {
  const color = getAvatarColor(name)
  return (
    <div
      className={cn('rounded-full flex items-center justify-center font-bold text-white shrink-0 border-2 border-white/10 overflow-hidden', SIZES[size], className)}
      style={{ background: src ? undefined : `linear-gradient(135deg, ${color}, #2f6ab2)` }}
    >
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : getInitials(name)}
    </div>
  )
}

// ── Status Badge ──────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: ElectionStatus }) {
  const map: Record<ElectionStatus, { cls: string; dot?: string; label: string }> = {
    active:   { cls: 'badge-live',     dot: 'bg-emerald-400 animate-pulse-dot', label: 'Live'     },
    upcoming: { cls: 'badge-upcoming', dot: 'bg-brand-blue-light',              label: 'Upcoming' },
    ended:    { cls: 'badge-ended',    dot: undefined,                           label: 'Ended'    },
    draft:    { cls: 'badge-draft',    dot: 'bg-amber-400',                      label: 'Draft'    },
  }
  const { cls, dot, label } = map[status]
  return (
    <span className={cls}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />}
      {label}
    </span>
  )
}

// ── Visibility Badge ──────────────────────────────────────────────────────────
export function VisibilityBadge({ visibility }: { visibility: ElectionVisibility }) {
  return visibility === 'public'
    ? <span className="badge-public">🌐 Public</span>
    : <span className="badge-private">🔒 Private</span>
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
  return (
    <svg className={cn('animate-spin text-brand-blue', s[size], className)} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
export function ProgressBar({ value, max = 100, className }: { value: number; max?: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className={cn('progress-bar', className)}>
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider({ label }: { label?: string }) {
  return (
    <div className="divider">
      {label && <span>{label}</span>}
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning' | 'info'
interface ToastItem { id: string; type: ToastType; message: string }

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
  success: (message: string) => void
  error: (message: string) => void
}

const ToastCtx = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const remove = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, type, message }])
    setTimeout(() => remove(id), 4500)
  }, [remove])

  const success = useCallback((m: string) => toast(m, 'success'), [toast])
  const error   = useCallback((m: string) => toast(m, 'error'),   [toast])

  return (
    <ToastCtx.Provider value={{ toast, success, error }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 w-full max-w-sm">
        {toasts.map((t) => <ToastCard key={t.id} item={t} onClose={() => remove(t.id)} />)}
      </div>
    </ToastCtx.Provider>
  )
}

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />,
    error:   <XCircle    className="w-4 h-4 text-red-400 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
    info:    <Info       className="w-4 h-4 text-brand-blue-light shrink-0" />,
  }
  const borders: Record<ToastType, string> = {
    success: 'border-emerald-500/30', error: 'border-red-500/30',
    warning: 'border-amber-500/30',   info:  'border-brand-blue/30',
  }

  return (
    <div className={cn(
      'glass-sm flex items-start gap-3 px-4 py-3.5 animate-slide-in-right shadow-modal',
      borders[item.type],
    )}>
      {icons[item.type]}
      <p className="flex-1 text-sm text-brand-white-dim leading-snug">{item.message}</p>
      <button onClick={onClose} className="btn-icon w-6 h-6 shrink-0 mt-0.5"><X className="w-3.5 h-3.5" /></button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-3xl bg-brand-ink-muted flex items-center justify-center text-brand-grey mb-5">
        {icon}
      </div>
      <h3 className="font-display text-xl text-brand-white-dim mb-2">{title}</h3>
      {description && <p className="text-brand-grey text-sm max-w-xs leading-relaxed mb-6">{description}</p>}
      {action}
    </div>
  )
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
export function ConfirmModal({ open, title, description, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel, loading }: {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}) {
  useEffect(() => {
    const handle = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    if (open) document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [open, onCancel])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-brand-ink/80 backdrop-blur-sm" />
      <div className="glass relative z-10 p-8 max-w-md w-full shadow-modal animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-xl text-brand-white mb-3">{title}</h3>
        <p className="text-brand-grey text-sm leading-relaxed mb-8">{description}</p>
        <div className="flex gap-3 justify-end">
          <button className="btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={loading}>
            {loading ? <Spinner size="sm" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
