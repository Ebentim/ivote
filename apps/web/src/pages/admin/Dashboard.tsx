import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Vote, Users, TrendingUp, Plus, ArrowRight } from 'lucide-react'
import { electionsApi, votersApi } from '@/api'
import { StatusBadge, VisibilityBadge, Skeleton } from '@/components/ui'
import { fmtDate, fmtCountdown, deriveElectionStatus } from '@/lib/utils'
import type { Election } from '@/types'

export default function AdminDashboard() {
  const { data: electionsData, isLoading: loadingElections } = useQuery({
    queryKey: ['admin', 'elections'],
    queryFn: () => electionsApi.list({ pageSize: 20 }),
    refetchInterval: 10_000,
  })

  const { data: votersData, isLoading: loadingVoters } = useQuery({
    queryKey: ['admin', 'voters', 'count'],
    queryFn: () => votersApi.list({ pageSize: 1 }),
  })

  const elections = electionsData?.data ?? []
  const activeElections  = elections.filter((e) => deriveElectionStatus(e.startTime, e.endTime, e.status) === 'active')
  const draftElections   = elections.filter((e) => e.status === 'draft')
  const totalVoters      = votersData?.total ?? 0

  const stats = [
    { label: 'Total Elections',   value: elections.length,        icon: Vote,       color: 'text-brand-blue-light' },
    { label: 'Live Now',          value: activeElections.length,  icon: TrendingUp, color: 'text-emerald-400'      },
    { label: 'Drafts',            value: draftElections.length,   icon: Vote,       color: 'text-amber-400'        },
    { label: 'Registered Voters', value: totalVoters,             icon: Users,      color: 'text-violet-400'       },
  ]

  return (
    <div className="max-w-5xl space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-brand-white mb-1">Dashboard</h1>
          <p className="text-brand-grey text-sm">Overview of all elections and voter activity.</p>
        </div>
        <Link to="/admin/elections/create" className="btn-primary shrink-0">
          <Plus className="w-4 h-4" />
          New Election
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-xl bg-brand-ink-muted flex items-center justify-center">
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
            {loadingElections || loadingVoters
              ? <Skeleton className="h-8 w-16 mb-1" />
              : <p className="font-display text-3xl text-brand-white">{value}</p>
            }
            <p className="text-brand-grey text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Active elections live view */}
      {activeElections.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-dot" />
            <h2 className="font-display text-lg text-brand-white">Live Elections</h2>
          </div>
          <div className="space-y-3">
            {activeElections.map((election) => (
              <ElectionRow key={election.id} election={election} />
            ))}
          </div>
        </section>
      )}

      {/* Recent elections */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg text-brand-white">All Elections</h2>
          <Link to="/admin/elections" className="btn-ghost text-xs">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loadingElections ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : elections.length === 0 ? (
          <div className="card p-10 text-center">
            <Vote className="w-10 h-10 text-brand-grey mx-auto mb-3" />
            <p className="text-brand-grey text-sm">No elections yet.</p>
            <Link to="/admin/elections/create" className="btn-primary mt-4 mx-auto">
              <Plus className="w-4 h-4" />Create first election
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {elections.slice(0, 6).map((election) => (
              <ElectionRow key={election.id} election={election} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ElectionRow({ election }: { election: Election }) {
  const status = deriveElectionStatus(election.startTime, election.endTime, election.status)

  return (
    <Link to={`/admin/elections/${election.id}`} className="card block p-4 hover:border-brand-blue/30 transition-colors group">
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <StatusBadge status={status} />
            <VisibilityBadge visibility={election.visibility} />
          </div>
          <h3 className="text-brand-white font-semibold text-sm truncate group-hover:text-brand-white-dim transition-colors">
            {election.title}
          </h3>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-brand-grey text-xs">{election.contestants?.length ?? 0} contestants</span>
            {status === 'active' && (
              <span className="text-emerald-400 text-xs font-mono">⏱ {fmtCountdown(election.endTime)}</span>
            )}
            {status !== 'active' && status !== 'draft' && (
              <span className="text-brand-grey text-xs">{fmtDate(election.endTime)}</span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-brand-white font-display text-xl">{election.totalVotes ?? 0}</p>
          <p className="text-brand-grey text-xs">votes</p>
        </div>
        <ArrowRight className="w-4 h-4 text-brand-grey group-hover:text-brand-blue-light transition-colors" />
      </div>
    </Link>
  )
}
