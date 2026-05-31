import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Lock, Trophy } from 'lucide-react'
import { useState } from 'react'
import { voterElectionsApi } from '@/api'
import {
  Avatar, StatusBadge, VisibilityBadge, ProgressBar,
  Skeleton, useToast
} from '@/components/ui'
import { fmtDate, fmtCountdown, deriveElectionStatus, pluralize } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function VoterElectionPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const { success, error } = useToast()
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const { data: election, isLoading: loadingElection } = useQuery({
    queryKey: ['voter', 'election', id],
    queryFn: () => voterElectionsApi.get(id!),
    refetchInterval: 5_000,
    enabled: !!id,
  })

  const { data: results } = useQuery({
    queryKey: ['voter', 'election', id, 'results'],
    queryFn: () => voterElectionsApi.getResults(id!),
    refetchInterval: 5_000,
    enabled: !!id,
  })

  const { data: myVoteData } = useQuery({
    queryKey: ['voter', 'election', id, 'my-vote'],
    queryFn: () => voterElectionsApi.hasVoted(id!),
    enabled: !!id,
  })

  const voteMutation = useMutation({
    mutationFn: (contestantId: string) =>
      voterElectionsApi.vote({ electionId: id!, contestantId }),
    onSuccess: () => {
      success('Your vote has been cast anonymously. ✓')
      qc.invalidateQueries({ queryKey: ['voter', 'election', id] })
      setConfirmId(null)
    },
    onError: (e: Error) => {
      error(e.message)
      setConfirmId(null)
    },
  })

  if (loadingElection) return <ElectionPageSkeleton />
  if (!election) return (
    <div className="text-center py-20">
      <p className="text-brand-grey">Election not found or you don't have access.</p>
      <Link to="/dashboard" className="btn-secondary mt-4">← Dashboard</Link>
    </div>
  )

  const status      = deriveElectionStatus(election.startTime, election.endTime, election.status)
  const hasVoted    = myVoteData?.voted ?? false
  const myContestantId = myVoteData?.contestantId
  const totalVotes  = results?.totalVotes ?? 0
  const isActive    = status === 'active'
  const canVote     = isActive && !hasVoted

  const sorted = [...(results?.contestants ?? election.contestants.map((c) => ({ ...c, votes: 0, percentage: 0 })))]
    .sort((a, b) => b.votes - a.votes)

  const myContestant = sorted.find((c) => c.id === myContestantId)
  const confirmContestant = sorted.find((c) => c.id === confirmId)

  return (
    <div className="animate-fade-in space-y-6">
      {/* Back */}
      <Link to="/dashboard" className="btn-ghost inline-flex">
        <ArrowLeft className="w-4 h-4" /> Dashboard
      </Link>

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <StatusBadge status={status} />
              <VisibilityBadge visibility={election.visibility} />
              {hasVoted && (
                <span className="badge bg-emerald-400/12 text-emerald-400 border border-emerald-400/25">
                  <CheckCircle2 className="w-3 h-3" /> Voted
                </span>
              )}
            </div>
            <h1 className="font-display text-3xl text-brand-white leading-tight mb-1">{election.title}</h1>
            {election.description && <p className="text-brand-grey text-sm">{election.description}</p>}

            <div className="flex items-center gap-5 mt-3 flex-wrap">
              <div>
                <p className="text-brand-grey text-xs">Opens</p>
                <p className="text-brand-white-dim text-sm">{fmtDate(election.startTime)}</p>
              </div>
              <div>
                <p className="text-brand-grey text-xs">Closes</p>
                <p className="text-brand-white-dim text-sm">{fmtDate(election.endTime)}</p>
              </div>
              {isActive && (
                <div>
                  <p className="text-brand-grey text-xs">Time remaining</p>
                  <p className="text-emerald-400 font-mono font-semibold text-sm">{fmtCountdown(election.endTime)}</p>
                </div>
              )}
            </div>
          </div>

          <div className="text-center shrink-0">
            <p className="font-display text-4xl text-brand-white">{totalVotes}</p>
            <p className="text-brand-grey text-xs">{totalVotes === 1 ? 'vote' : 'votes'} cast</p>
          </div>
        </div>

        {/* My vote banner */}
        {hasVoted && myContestant && (
          <div className="flex items-center gap-3 mt-5 pt-5 border-t border-white/[0.06] bg-emerald-400/6 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-sm text-brand-white-dim">
              You voted for{' '}
              <strong className="text-emerald-400">{myContestant.name}</strong>.
              This is final and cannot be changed.
            </p>
          </div>
        )}

        {/* Status messages */}
        {status === 'upcoming' && (
          <div className="flex items-center gap-3 mt-5 pt-5 border-t border-white/[0.06]">
            <p className="text-brand-grey-light text-sm">
              Voting opens in <strong className="text-brand-blue-light">{fmtCountdown(election.startTime)}</strong>
            </p>
          </div>
        )}
        {status === 'ended' && !hasVoted && (
          <div className="flex items-center gap-3 mt-5 pt-5 border-t border-white/[0.06]">
            <p className="text-brand-grey text-sm">This election has ended. You did not cast a vote.</p>
          </div>
        )}
      </div>

      {/* Contestants */}
      <div>
        <h2 className="font-display text-xl text-brand-white mb-4">
          {canVote ? 'Cast your vote' : 'Results'}
        </h2>

        {canVote && (
          <div className="flex items-center gap-2 bg-brand-blue/[0.08] border border-brand-blue/20 rounded-xl px-4 py-3 mb-4">
            <Lock className="w-4 h-4 text-brand-blue-light shrink-0" />
            <p className="text-xs text-brand-grey-light">
              Your vote is anonymous. Once cast, it cannot be changed.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {sorted.map((c, i) => {
            const isLeading = i === 0 && totalVotes > 0
            const isMyVote  = c.id === myContestantId

            return (
              <div
                key={c.id}
                className={cn(
                  'card p-5 transition-all duration-200',
                  isMyVote && 'border-emerald-400/30',
                  canVote && 'hover:border-brand-blue/40 cursor-pointer group',
                  !canVote && isLeading && status === 'ended' && 'border-amber-400/25',
                )}
                onClick={() => canVote && setConfirmId(c.id)}
              >
                <div className="flex items-center gap-4 mb-3">
                  {/* Passport or avatar */}
                  <div className="relative shrink-0">
                    {isLeading && status === 'ended' && (
                      <Trophy className="absolute -top-1.5 -right-1.5 w-4 h-4 text-amber-400" />
                    )}
                    {c.passportUrl ? (
                      <img
                        src={c.passportUrl}
                        alt={c.name}
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-white/10"
                      />
                    ) : (
                      <Avatar name={c.name} size="lg" className="rounded-2xl" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-brand-white font-semibold">{c.name}</p>
                      {isMyVote && (
                        <span className="badge bg-emerald-400/12 text-emerald-400 border border-emerald-400/22 text-[9px]">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Your Vote
                        </span>
                      )}
                    </div>
                    {c.party && <p className="text-brand-grey text-xs mt-0.5">{c.party}</p>}
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-display text-2xl text-brand-white">{c.percentage.toFixed(1)}%</p>
                    <p className="text-brand-grey text-xs">{pluralize(c.votes, 'vote')}</p>
                  </div>
                </div>

                <ProgressBar value={c.votes} max={Math.max(totalVotes, 1)} />

                {canVote && (
                  <div className="mt-3 pt-3 border-t border-white/[0.06]">
                    <p className="text-brand-blue-light text-xs font-semibold group-hover:text-brand-white transition-colors">
                      Vote for {c.name.split(' ')[0]} →
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Confirm modal */}
      {confirmContestant && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setConfirmId(null)}
        >
          <div className="absolute inset-0 bg-brand-ink/85 backdrop-blur-sm" />
          <div
            className="glass relative z-10 max-w-sm w-full p-8 shadow-modal animate-slide-up text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-5">
              {confirmContestant.passportUrl ? (
                <img
                  src={confirmContestant.passportUrl}
                  alt={confirmContestant.name}
                  className="w-20 h-20 rounded-3xl object-cover border-2 border-brand-blue/40"
                />
              ) : (
                <Avatar name={confirmContestant.name} size="xl" />
              )}
            </div>

            <h3 className="font-display text-xl text-brand-white mb-1">Confirm Vote</h3>
            <p className="text-brand-grey text-sm mb-4">You are about to vote for:</p>

            <div className="bg-brand-blue/12 border border-brand-blue/25 rounded-2xl px-5 py-4 mb-2">
              <p className="text-brand-white font-bold text-lg">{confirmContestant.name}</p>
              {confirmContestant.party && (
                <p className="text-brand-grey text-sm mt-0.5">{confirmContestant.party}</p>
              )}
            </div>

            <p className="text-red-400/70 text-xs mb-6">
              ⚠ This action is permanent and cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                className="btn-secondary flex-1"
                onClick={() => setConfirmId(null)}
                disabled={voteMutation.isPending}
              >
                Cancel
              </button>
              <button
                className="btn-primary flex-1"
                onClick={() => voteMutation.mutate(confirmContestant.id)}
                disabled={voteMutation.isPending}
              >
                {voteMutation.isPending
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <CheckCircle2 className="w-4 h-4" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ElectionPageSkeleton() {
  return (
    <div className="space-y-5 animate-fade-in">
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-48 w-full" />
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
      </div>
    </div>
  )
}
