import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Vote, Search } from 'lucide-react'
import { useState } from 'react'
import { electionsApi } from '@/api'
import { StatusBadge, VisibilityBadge, EmptyState, Skeleton } from '@/components/ui'
import { fmtDate, fmtCountdown, deriveElectionStatus } from '@/lib/utils'
import type { Election } from '@/types'

const FILTERS: { label: string; value: string }[] = [
  { label: 'All',      value: 'all'     },
  { label: 'Live',     value: 'active'  },
  { label: 'Upcoming', value: 'upcoming'},
  { label: 'Drafts',   value: 'draft'   },
  { label: 'Ended',    value: 'ended'   },
]

export default function AdminElectionsPage() {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'elections', 'all'],
    queryFn:  () => electionsApi.list({ pageSize: 100 }),
    refetchInterval: 15_000,
  })

  const elections = (data?.data ?? []).filter((e) => {
    const status = deriveElectionStatus(e.startTime, e.endTime, e.status)
    const matchFilter = filter === 'all' || status === filter
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <div className="max-w-5xl space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-brand-white mb-1">Elections</h1>
          <p className="text-brand-grey text-sm">{data?.total ?? 0} total elections</p>
        </div>
        <Link to="/admin/elections/create" className="btn-primary shrink-0">
          <Plus className="w-4 h-4" /> New Election
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-grey" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search elections…"
            className="field-input pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                filter === f.value
                  ? 'bg-brand-blue text-white shadow-glow-sm'
                  : 'bg-brand-ink-muted/40 text-brand-grey hover:text-brand-white border border-white/[0.07]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : elections.length === 0 ? (
        <EmptyState
          icon={<Vote className="w-8 h-8" />}
          title="No elections found"
          description={filter !== 'all' ? 'Try a different filter.' : 'Create your first election to get started.'}
          action={
            filter === 'all'
              ? <Link to="/admin/elections/create" className="btn-primary"><Plus className="w-4 h-4" />Create Election</Link>
              : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {elections.map((e) => <ElectionCard key={e.id} election={e} />)}
        </div>
      )}
    </div>
  )
}

function ElectionCard({ election }: { election: Election }) {
  const status = deriveElectionStatus(election.startTime, election.endTime, election.status)

  return (
    <Link
      to={`/admin/elections/${election.id}`}
      className="card flex items-center gap-5 p-5 hover:border-brand-blue/30 transition-colors group block"
    >
      {/* Icon */}
      <div className="w-11 h-11 rounded-2xl bg-brand-blue/15 flex items-center justify-center shrink-0 group-hover:bg-brand-blue/25 transition-colors">
        <Vote className="w-5 h-5 text-brand-blue-light" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <StatusBadge status={status} />
          <VisibilityBadge visibility={election.visibility} />
        </div>
        <h3 className="text-brand-white font-semibold truncate group-hover:text-brand-white-dim transition-colors">
          {election.title}
        </h3>
        {election.description && (
          <p className="text-brand-grey text-xs mt-0.5 truncate">{election.description}</p>
        )}
        <div className="flex items-center gap-4 mt-1.5 flex-wrap">
          <span className="text-brand-grey text-xs">{election.contestants?.length ?? 0} contestants</span>
          {status === 'active' && (
            <span className="text-emerald-400 text-xs font-mono font-semibold">
              ⏱ {fmtCountdown(election.endTime)} left
            </span>
          )}
          {(status === 'upcoming' || status === 'ended') && (
            <span className="text-brand-grey text-xs">
              {status === 'upcoming' ? 'Opens' : 'Closed'} {fmtDate(status === 'upcoming' ? election.startTime : election.endTime)}
            </span>
          )}
          {status === 'draft' && (
            <span className="text-amber-400/70 text-xs">Not published</span>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className="font-display text-2xl text-brand-white">{election.totalVotes ?? 0}</p>
        <p className="text-brand-grey text-xs">votes</p>
      </div>
    </Link>
  )
}
