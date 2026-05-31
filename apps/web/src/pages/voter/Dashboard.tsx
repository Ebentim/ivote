import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Vote, ArrowRight } from 'lucide-react'
import { voterElectionsApi } from '@/api'
import { StatusBadge, VisibilityBadge, Skeleton, EmptyState } from '@/components/ui'
import { fmtDate, fmtCountdown, deriveElectionStatus } from '@/lib/utils'
import { useCurrentUser } from '@/store/auth'
import type { Election, Voter } from '@/types'

export default function VoterDashboard() {
  const user = useCurrentUser() as (Voter & { userType: 'voter' }) | null

  const { data: elections = [], isLoading } = useQuery({
    queryKey: ['voter', 'elections'],
    queryFn: voterElectionsApi.list,
    refetchInterval: 5_000,
  })

  const active   = elections.filter((e) => deriveElectionStatus(e.startTime, e.endTime, e.status) === 'active')
  const upcoming = elections.filter((e) => deriveElectionStatus(e.startTime, e.endTime, e.status) === 'upcoming')
  const ended    = elections.filter((e) => deriveElectionStatus(e.startTime, e.endTime, e.status) === 'ended')

  return (
    <div className="animate-fade-in space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="font-display text-3xl text-brand-white mb-1">
          Welcome{user ? `, ${user.displayName.split(' ')[0]}` : ''}
        </h1>
        <p className="text-brand-grey text-sm">
          {elections.length === 0
            ? 'No elections available to you yet.'
            : `You have access to ${elections.length} election${elections.length !== 1 ? 's' : ''}.`}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : elections.length === 0 ? (
        <EmptyState
          icon={<Vote className="w-8 h-8" />}
          title="No elections available"
          description="You haven't been invited to any elections yet. Check back soon."
        />
      ) : (
        <>
          {active.length > 0 && (
            <Section title="Open for Voting" dot="bg-emerald-400" elections={active} />
          )}
          {upcoming.length > 0 && (
            <Section title="Upcoming" elections={upcoming} />
          )}
          {ended.length > 0 && (
            <Section title="Ended" elections={ended} muted />
          )}
        </>
      )}
    </div>
  )
}

function Section({ title, dot, elections, muted }: {
  title: string
  dot?: string
  elections: Election[]
  muted?: boolean
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        {dot && <span className={`w-2 h-2 rounded-full ${dot} animate-pulse-dot`} />}
        <h2 className="font-display text-lg text-brand-white">{title}</h2>
        <span className="text-brand-grey text-sm">({elections.length})</span>
      </div>
      <div className={`space-y-3 ${muted ? 'opacity-70' : ''}`}>
        {elections.map((e) => <ElectionCard key={e.id} election={e} />)}
      </div>
    </section>
  )
}

function ElectionCard({ election }: { election: Election }) {
  const status = deriveElectionStatus(election.startTime, election.endTime, election.status)

  return (
    <Link
      to={`/election/${election.id}`}
      className="card block p-5 hover:border-brand-blue/30 transition-all duration-200 group"
    >
      <div className="flex items-start gap-4">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
          status === 'active'
            ? 'bg-emerald-400/15 group-hover:bg-emerald-400/25'
            : 'bg-brand-blue/12 group-hover:bg-brand-blue/20'
        }`}>
          <Vote className={`w-5 h-5 ${status === 'active' ? 'text-emerald-400' : 'text-brand-blue-light'}`} />
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
            <p className="text-brand-grey text-xs mt-0.5 line-clamp-1">{election.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <span className="text-brand-grey text-xs">{election.contestants?.length ?? 0} contestants</span>
            <span className="text-brand-grey text-xs">{election.totalVotes ?? 0} votes</span>
            {status === 'active' && (
              <span className="text-emerald-400 text-xs font-mono font-semibold">
                ⏱ {fmtCountdown(election.endTime)} left
              </span>
            )}
            {status === 'upcoming' && (
              <span className="text-brand-blue-light text-xs">
                Opens {fmtDate(election.startTime)}
              </span>
            )}
            {status === 'ended' && (
              <span className="text-brand-grey text-xs">Ended {fmtDate(election.endTime)}</span>
            )}
          </div>
        </div>

        <ArrowRight className="w-4 h-4 text-brand-grey group-hover:text-brand-blue-light transition-colors shrink-0 mt-1" />
      </div>
    </Link>
  )
}
