import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Users, Plus, Trash2, Search, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { votersApi } from '@/api'
import { Avatar, EmptyState, Skeleton, ConfirmModal, useToast } from '@/components/ui'
import { fmtDateShort } from '@/lib/utils'
import { addVoterSchema, type AddVoterForm } from '@/lib/schemas'
import type { Voter } from '@/types'

export default function AdminVotersPage() {
  const qc = useQueryClient()
  const { success, error } = useToast()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Voter | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'voters'],
    queryFn: () => votersApi.list({ pageSize: 200 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => votersApi.delete(id),
    onSuccess: () => {
      success('Voter removed.')
      qc.invalidateQueries({ queryKey: ['admin', 'voters'] })
      setDeleteTarget(null)
    },
    onError: (e: Error) => error(e.message),
  })

  const voters = (data?.data ?? []).filter(
    (v) =>
      v.displayName.toLowerCase().includes(search.toLowerCase()) ||
      v.username.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="max-w-3xl animate-fade-in">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl text-brand-white mb-1">Voters</h1>
          <p className="text-brand-grey text-sm">
            {data?.total ?? 0} registered voter{(data?.total ?? 0) !== 1 ? 's' : ''}. Identities are anonymised in vote records.
          </p>
        </div>
        <button className="btn-primary shrink-0" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Add Voter
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-grey" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or username…"
          className="field-input pl-10"
        />
      </div>

      {/* Privacy banner */}
      <div className="flex items-start gap-3 bg-brand-blue/[0.08] border border-brand-blue/20 rounded-xl px-4 py-3 mb-5">
        <span className="text-brand-blue-light text-sm shrink-0">🔒</span>
        <p className="text-brand-grey-light text-xs leading-relaxed">
          Votes are stored against a one-way hash of the voter's ID. Neither admins nor other voters can trace any vote back to an individual.
        </p>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : voters.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title={search ? 'No voters match your search' : 'No voters yet'}
          description={search ? 'Try a different search term.' : 'Add a voter to get started.'}
          action={!search ? <button className="btn-primary" onClick={() => setShowForm(true)}><Plus className="w-4 h-4" />Add Voter</button> : undefined}
        />
      ) : (
        <div className="space-y-2">
          {voters.map((v) => (
            <div key={v.id} className="card flex items-center gap-4 px-4 py-3.5">
              <Avatar name={v.displayName} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-brand-white font-semibold text-sm truncate">{v.displayName}</p>
                <p className="text-brand-grey text-xs">@{v.username} · Added {fmtDateShort(v.createdAt)}</p>
              </div>
              <span className="badge badge-upcoming shrink-0">Voter</span>
              <button
                onClick={() => setDeleteTarget(v)}
                className="btn-icon text-red-400/50 hover:text-red-400 hover:bg-red-500/10 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add voter drawer */}
      {showForm && (
        <AddVoterModal
          onClose={() => setShowForm(false)}
          onAdded={() => {
            qc.invalidateQueries({ queryKey: ['admin', 'voters'] })
            setShowForm(false)
          }}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Remove Voter"
        description={`Remove "${deleteTarget?.displayName}" from the platform? Their historical vote records (anonymised) will be retained.`}
        confirmLabel="Remove"
        danger
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

function AddVoterModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const { success, error } = useToast()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AddVoterForm>({
    resolver: zodResolver(addVoterSchema),
  })

  const onSubmit = async (data: AddVoterForm) => {
    try {
      await votersApi.create(data)
      success(`Voter "${data.displayName}" added.`)
      onAdded()
    } catch (e) {
      error((e as Error).message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-brand-ink/80 backdrop-blur-sm" />
      <div
        className="glass relative z-10 w-full max-w-md p-8 shadow-modal animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl text-brand-white">Add Voter</h2>
          <button className="btn-icon" onClick={onClose}><X className="w-4 h-4" /></button>
        </div>

        <div className="bg-brand-blue/[0.08] border border-brand-blue/20 rounded-xl px-4 py-3 mb-6">
          <p className="text-xs text-brand-grey-light leading-relaxed">
            Share these credentials privately with the voter. They will use them to sign in at <code className="text-brand-blue-light">/login</code>.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label className="field-label">Full Name *</label>
            <input {...register('displayName')} placeholder="e.g., Jane Adeyemi" className={`field-input ${errors.displayName ? 'error' : ''}`} />
            {errors.displayName && <p className="field-error"><span>⚠</span>{errors.displayName.message}</p>}
          </div>
          <div>
            <label className="field-label">Username *</label>
            <input {...register('username')} placeholder="e.g., jane.adeyemi" className={`field-input ${errors.username ? 'error' : ''}`} />
            {errors.username && <p className="field-error"><span>⚠</span>{errors.username.message}</p>}
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
              Add Voter
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
