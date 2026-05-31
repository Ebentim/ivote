import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ShieldCheck, Plus, Trash2, X, Crown, Shield } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { adminsApi } from '@/api'
import { Avatar, Skeleton, ConfirmModal, useToast } from '@/components/ui'
import { fmtDateShort } from '@/lib/utils'
import { addAdminSchema, type AddAdminForm } from '@/lib/schemas'
import { useCurrentUser } from '@/store/auth'
import type { Admin } from '@/types'

const MAX_ADMINS = 3

export default function AdminAdminsPage() {
  const qc = useQueryClient()
  const { success, error } = useToast()
  const currentUser = useCurrentUser() as (Admin & { userType: 'admin' }) | null
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Admin | null>(null)

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ['admins'],
    queryFn: adminsApi.list,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminsApi.delete(id),
    onSuccess: () => {
      success('Admin removed.')
      qc.invalidateQueries({ queryKey: ['admins'] })
      setDeleteTarget(null)
    },
    onError: (e: Error) => error(e.message),
  })

  const canAddMore = admins.length < MAX_ADMINS

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl text-brand-white mb-1">Administrators</h1>
          <p className="text-brand-grey text-sm">
            {admins.length} / {MAX_ADMINS} admins · Only the superadmin can manage this list.
          </p>
        </div>
        {canAddMore && (
          <button className="btn-primary shrink-0" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Add Admin
          </button>
        )}
      </div>

      {/* Capacity indicator */}
      <div className={`flex items-center gap-3 rounded-xl px-4 py-3 mb-5 border ${
        admins.length >= MAX_ADMINS
          ? 'bg-red-500/[0.08] border-red-500/20'
          : 'bg-brand-blue/[0.08] border-brand-blue/20'
      }`}>
        <ShieldCheck className={`w-4 h-4 shrink-0 ${admins.length >= MAX_ADMINS ? 'text-red-400' : 'text-brand-blue-light'}`} />
        <p className="text-xs text-brand-grey-light">
          {admins.length >= MAX_ADMINS
            ? 'Maximum of 3 administrators reached. Remove one to add another.'
            : `${MAX_ADMINS - admins.length} admin slot${MAX_ADMINS - admins.length !== 1 ? 's' : ''} remaining.`}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : (
        <div className="space-y-3">
          {admins.map((admin) => {
            const isSelf = admin.id === currentUser?.id
            const isSuperAdmin = admin.role === 'superadmin'
            return (
              <div key={admin.id} className={`card flex items-center gap-4 px-5 py-4 ${isSelf ? 'border-brand-blue/30' : ''}`}>
                <div className="relative shrink-0">
                  <Avatar name={admin.displayName} size="md" />
                  {isSuperAdmin && (
                    <Crown className="absolute -top-1 -right-1 w-3.5 h-3.5 text-amber-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-brand-white font-semibold text-sm truncate">{admin.displayName}</p>
                    {isSelf && <span className="text-brand-blue-light text-[10px] font-mono">(you)</span>}
                  </div>
                  <p className="text-brand-grey text-xs">@{admin.username} · {admin.email}</p>
                  <p className="text-brand-grey/50 text-xs">Added {fmtDateShort(admin.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`badge ${isSuperAdmin ? 'bg-amber-400/15 text-amber-400 border border-amber-400/25' : 'badge-upcoming'}`}>
                    {isSuperAdmin ? <><Crown className="w-2.5 h-2.5" /> Superadmin</> : <><Shield className="w-2.5 h-2.5" /> Admin</>}
                  </span>
                  {!isSuperAdmin && !isSelf && (
                    <button
                      onClick={() => setDeleteTarget(admin)}
                      className="btn-icon text-red-400/50 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <AddAdminModal
          onClose={() => setShowForm(false)}
          onAdded={() => {
            qc.invalidateQueries({ queryKey: ['admins'] })
            setShowForm(false)
          }}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Remove Administrator"
        description={`Remove "${deleteTarget?.displayName}" as an administrator? They will lose all admin access immediately.`}
        confirmLabel="Remove Admin"
        danger
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

function AddAdminModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const { success, error } = useToast()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AddAdminForm>({
    resolver: zodResolver(addAdminSchema),
  })

  const onSubmit = async (data: AddAdminForm) => {
    try {
      await adminsApi.create(data)
      success(`Admin "${data.displayName}" added.`)
      onAdded()
    } catch (e) {
      error((e as Error).message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-brand-ink/80 backdrop-blur-sm" />
      <div className="glass relative z-10 w-full max-w-md p-8 shadow-modal animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl text-brand-white">Add Administrator</h2>
          <button className="btn-icon" onClick={onClose}><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label className="field-label">Full Name *</label>
            <input {...register('displayName')} placeholder="e.g., John Okonkwo" className={`field-input ${errors.displayName ? 'error' : ''}`} />
            {errors.displayName && <p className="field-error"><span>⚠</span>{errors.displayName.message}</p>}
          </div>
          <div>
            <label className="field-label">Username *</label>
            <input {...register('username')} placeholder="e.g., john.okonkwo" className={`field-input ${errors.username ? 'error' : ''}`} />
            {errors.username && <p className="field-error"><span>⚠</span>{errors.username.message}</p>}
          </div>
          <div>
            <label className="field-label">Email *</label>
            <input {...register('email')} type="email" placeholder="john@organisation.com" className={`field-input ${errors.email ? 'error' : ''}`} />
            {errors.email && <p className="field-error"><span>⚠</span>{errors.email.message}</p>}
          </div>
          <div>
            <label className="field-label">Password *</label>
            <input {...register('password')} type="password" placeholder="Minimum 8 characters" className={`field-input ${errors.password ? 'error' : ''}`} />
            {errors.password && <p className="field-error"><span>⚠</span>{errors.password.message}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Admin
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
