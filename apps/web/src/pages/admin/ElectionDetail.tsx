import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Send, Trash2, UserPlus, UserMinus,
  BarChart2, Users, Settings, Globe, Lock, RefreshCw
} from 'lucide-react'
import { useState } from 'react'
import { electionsApi, votersApi } from '@/api'
import {
  Avatar, StatusBadge, VisibilityBadge, ProgressBar,
  Skeleton, ConfirmModal, useToast, EmptyState
} from '@/components/ui'
import { fmtDate, fmtCountdown, deriveElectionStatus, pluralize } from '@/lib/utils'
import type { Election, Voter } from '@/types'

type Tab = 'results' | 'contestants' | 'access'

export default function AdminElectionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { success, error } = useToast()
  const [tab, setTab] = useState<Tab>('results')
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: election, isLoading } = useQuery({
    queryKey: ['admin', 'election', id],
    queryFn: () => electionsApi.get(id!),
    refetchInterval: 5_000,
    enabled: !!id,
  })

  const { data: results } = useQuery({
    queryKey: ['admin', 'election', id, 'results'],
    queryFn: () => electionsApi.getResults(id!),
    refetchInterval: 3_000,
    enabled: !!id,
  })

  const { data: votersData } = useQuery({
    queryKey: ['voters', 'all'],
    queryFn: () => votersApi.list({ pageSize: 200 }),
    enabled: election?.visibility === 'private',
  })

  const publishMutation = useMutation({
    mutationFn: () => electionsApi.publish(id!),
    onSuccess: () => {
      success('Election published!')
      qc.invalidateQueries({ queryKey: ['admin', 'election', id] })
    },
    onError: (e: Error) => error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: () => electionsApi.delete(id!),
    onSuccess: () => {
      success('Election deleted.')
      navigate('/admin/elections')
    },
    onError: (e: Error) => error(e.message),
  })

  const inviteMutation = useMutation({
    mutationFn: (voterId: string) => electionsApi.inviteVoter(id!, voterId),
    onSuccess: () => {
      success('Voter invited.')
      qc.invalidateQueries({ queryKey: ['admin', 'election', id] })
    },
    onError: (e: Error) => error(e.message),
  })

  const removeInviteMutation = useMutation({
    mutationFn: (voterId: string) => electionsApi.removeInvite(id!, voterId),
    onSuccess: () => {
      success('Invite removed.')
      qc.invalidateQueries({ queryKey: ['admin', 'election', id] })
    },
    onError: (e: Error) => error(e.message),
  })

  if (isLoading) return <ElectionDetailSkeleton />
  if (!election) return (
    <div className="text-center py-20">
      <p className="text-brand-grey">Election not found.</p>
      <Link to="/admin/elections" className="btn-secondary mt-4">← Back to Elections</Link>
    </div>
  )

  const status = deriveElectionStatus(election.startTime, election.endTime, election.status)
  const allVoters = votersData?.data ?? []
  const invitedIds = new Set(election.invitedVoters ?? [])
  const notInvited = allVoters.filter((v) => !invitedIds.has(v.id))
  const invited    = allVoters.filter((v) => invitedIds.has(v.id))

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'results',     label: 'Results',     icon: BarChart2 },
    { id: 'contestants', label: 'Contestants',  icon: Users     },
    { id: 'access',      label: 'Access',       icon: Settings  },
  ]

  return (
    <div className="max-w-4xl animate-fade-in">
      {/* Back */}
      <Link to="/admin/elections" className="btn-ghost mb-6 inline-flex">
        <ArrowLeft className="w-4 h-4" /> Elections
      </Link>

      {/* Header card */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <StatusBadge status={status} />
              <VisibilityBadge visibility={election.visibility} />
            </div>
            <h1 className="font-display text-3xl text-brand-white mb-1 leading-tight">{election.title}</h1>
            {election.description && <p className="text-brand-grey text-sm">{election.description}</p>}
            <div className="flex items-center gap-6 mt-3 flex-wrap">
              <div>
                <p className="text-brand-grey text-xs">Opens</p>
                <p className="text-brand-white-dim text-sm">{fmtDate(election.startTime)}</p>
              </div>
              <div>
                <p className="text-brand-grey text-xs">Closes</p>
                <p className="text-brand-white-dim text-sm">{fmtDate(election.endTime)}</p>
              </div>
              {status === 'active' && (
                <div>
                  <p className="text-brand-grey text-xs">Time left</p>
                  <p className="text-emerald-400 text-sm font-mono font-semibold">{fmtCountdown(election.endTime)}</p>
                </div>
              )}
              {status === 'upcoming' && (
                <div>
                  <p className="text-brand-grey text-xs">Starts in</p>
                  <p className="text-brand-blue-light text-sm font-mono font-semibold">{fmtCountdown(election.startTime)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 shrink-0">
            {election.status === 'draft' && (
              <button
                className="btn-primary"
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
              >
                <Send className="w-4 h-4" />
                {publishMutation.isPending ? 'Publishing…' : 'Publish'}
              </button>
            )}
            {(status === 'draft' || status === 'upcoming') && (
              <button
                className="btn-danger"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
          </div>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-white/[0.06]">
          <Stat label="Total Votes"  value={results?.totalVotes ?? 0} />
          <Stat label="Contestants"  value={election.contestants?.length ?? 0} />
          <Stat label="Eligible Voters" value={
            election.visibility === 'public' ? '—' : String(election.invitedVoters?.length ?? 0)
          } />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-brand-ink-soft border border-white/[0.06] rounded-2xl p-1">
        {TABS.map(({ id: tid, label, icon: Icon }) => (
          <button
            key={tid}
            onClick={() => setTab(tid)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              tab === tid
                ? 'bg-brand-blue text-white shadow-glow-sm'
                : 'text-brand-grey hover:text-brand-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div className="animate-fade-in" key={tab}>
        {tab === 'results'     && <ResultsTab election={election} results={results} />}
        {tab === 'contestants' && <ContestantsTab election={election} />}
        {tab === 'access'      && (
          <AccessTab
            election={election}
            invited={invited}
            notInvited={notInvited}
            onInvite={(id) => inviteMutation.mutate(id)}
            onRemove={(id) => removeInviteMutation.mutate(id)}
            pending={inviteMutation.isPending || removeInviteMutation.isPending}
          />
        )}
      </div>

      <ConfirmModal
        open={deleteOpen}
        title="Delete Election"
        description={`Are you sure you want to delete "${election.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteOpen(false)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="text-center">
      <p className="font-display text-2xl text-brand-white">{value}</p>
      <p className="text-brand-grey text-xs mt-0.5">{label}</p>
    </div>
  )
}

function ResultsTab({ election, results }: { election: Election; results?: { totalVotes: number; contestants: Array<{ id: string; name: string; party: string; passportUrl: string | null; votes: number; percentage: number }> } }) {
  const total = results?.totalVotes ?? 0
  const sorted = [...(results?.contestants ?? election.contestants.map((c) => ({ ...c, votes: 0, percentage: 0 })))]
    .sort((a, b) => b.votes - a.votes)

  if (sorted.length === 0) return (
    <EmptyState icon={<BarChart2 className="w-8 h-8" />} title="No contestants" description="Add contestants to see results." />
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-brand-grey text-sm">{pluralize(total, 'vote')} cast</p>
        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
          <RefreshCw className="w-3 h-3 animate-spin-slow" />
          Live
        </div>
      </div>

      {sorted.map((c, i) => (
        <div key={c.id} className="card p-5">
          <div className="flex items-center gap-4 mb-3">
            <div className="relative shrink-0">
              {i === 0 && total > 0 && (
                <span className="absolute -top-1 -right-1 text-sm">🥇</span>
              )}
              {c.passportUrl ? (
                <img src={c.passportUrl} alt={c.name} className="w-12 h-12 rounded-xl object-cover border border-white/10" />
              ) : (
                <Avatar name={c.name} size="lg" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-brand-white font-semibold">{c.name}</p>
              {c.party && <p className="text-brand-grey text-xs">{c.party}</p>}
            </div>
            <div className="text-right shrink-0">
              <p className="font-display text-2xl text-brand-white">{c.votes}</p>
              <p className="text-brand-grey text-xs">{c.percentage.toFixed(1)}%</p>
            </div>
          </div>
          <ProgressBar value={c.votes} max={Math.max(total, 1)} />
        </div>
      ))}
    </div>
  )
}

function ContestantsTab({ election }: { election: Election }) {
  if (!election.contestants?.length) return (
    <EmptyState icon={<Users className="w-8 h-8" />} title="No contestants" />
  )

  return (
    <div className="space-y-3">
      {election.contestants.map((c, i) => (
        <div key={c.id} className="card flex items-center gap-4 p-4">
          <span className="text-brand-grey font-mono text-sm w-5 text-center">{i + 1}</span>
          {c.passportUrl
            ? <img src={c.passportUrl} alt={c.name} className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0" />
            : <Avatar name={c.name} size="lg" />
          }
          <div className="flex-1 min-w-0">
            <p className="text-brand-white font-semibold">{c.name}</p>
            {c.party && <p className="text-brand-grey text-xs">{c.party}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

function AccessTab({ election, invited, notInvited, onInvite, onRemove, pending }: {
  election: Election
  invited: Voter[]
  notInvited: Voter[]
  onInvite: (id: string) => void
  onRemove: (id: string) => void
  pending: boolean
}) {
  if (election.visibility === 'public') {
    return (
      <div className="card p-8 text-center">
        <Globe className="w-10 h-10 text-sky-400 mx-auto mb-3" />
        <p className="text-brand-white font-semibold mb-1">Public Election</p>
        <p className="text-brand-grey text-sm max-w-sm mx-auto">
          All registered voters automatically have access to this election. No individual invitations are needed.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 bg-violet-400/[0.08] border border-violet-400/20 rounded-xl px-4 py-3">
        <Lock className="w-4 h-4 text-violet-400 shrink-0" />
        <p className="text-xs text-brand-grey-light">
          <strong className="text-violet-300">{invited.length}</strong> voter{invited.length !== 1 ? 's' : ''} invited to this private election.
        </p>
      </div>

      {/* Invited */}
      {invited.length > 0 && (
        <div>
          <h3 className="text-brand-grey text-xs font-bold uppercase tracking-widest mb-3">Invited ({invited.length})</h3>
          <div className="space-y-2">
            {invited.map((v) => (
              <div key={v.id} className="card flex items-center gap-3 px-4 py-3 border-brand-blue/20">
                <Avatar name={v.displayName} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-brand-white text-sm font-medium truncate">{v.displayName}</p>
                  <p className="text-brand-grey text-xs">@{v.username}</p>
                </div>
                <button
                  onClick={() => onRemove(v.id)}
                  disabled={pending}
                  className="btn-ghost text-red-400/60 hover:text-red-400 p-1.5"
                >
                  <UserMinus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Not invited */}
      {notInvited.length > 0 && (
        <div>
          <h3 className="text-brand-grey text-xs font-bold uppercase tracking-widest mb-3">Not Invited ({notInvited.length})</h3>
          <div className="space-y-2">
            {notInvited.map((v) => (
              <div key={v.id} className="card flex items-center gap-3 px-4 py-3 opacity-60 hover:opacity-100 transition-opacity">
                <Avatar name={v.displayName} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-brand-white text-sm font-medium truncate">{v.displayName}</p>
                  <p className="text-brand-grey text-xs">@{v.username}</p>
                </div>
                <button
                  onClick={() => onInvite(v.id)}
                  disabled={pending}
                  className="btn-ghost text-brand-blue-light p-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {notInvited.length === 0 && invited.length === 0 && (
        <EmptyState icon={<Users className="w-8 h-8" />} title="No voters registered" description="Add voters from the Voters page first." />
      )}
    </div>
  )
}

function ElectionDetailSkeleton() {
  return (
    <div className="max-w-4xl space-y-5 animate-fade-in">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-12 w-full" />
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    </div>
  )
}
