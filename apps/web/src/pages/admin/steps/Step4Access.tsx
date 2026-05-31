import { ArrowLeft, ArrowRight, Search, UserCheck, Globe, Lock } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDraftStore } from '@/store/draft'
import { votersApi } from '@/api'
import { Avatar, Skeleton } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { Voter } from '@/types'

export default function Step4Access() {
  const { draft, setStep4, goToStep } = useDraftStore()
  const isPublic = draft?.step1?.visibility === 'public'

  const [selected, setSelected] = useState<Set<string>>(
    new Set(draft?.step4?.invitedVoterIds ?? []),
  )
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['voters', 'all'],
    queryFn: () => votersApi.list({ pageSize: 200 }),
    enabled: !isPublic,
  })

  const voters = data?.data ?? []

  const filtered = useMemo(() =>
    voters.filter((v) =>
      v.displayName.toLowerCase().includes(search.toLowerCase()) ||
      v.username.toLowerCase().includes(search.toLowerCase()),
    ),
  [voters, search])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(voters.map((v) => v.id)))
  const clearAll  = () => setSelected(new Set())

  const handleNext = () => {
    setStep4({ invitedVoterIds: isPublic ? [] : Array.from(selected) })
    goToStep(5)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-brand-white mb-1">Access Control</h2>
        <p className="text-brand-grey text-sm">
          {isPublic
            ? 'This election is public — all registered voters will automatically have access.'
            : 'Invite specific registered voters to this private election.'}
        </p>
      </div>

      {isPublic ? (
        <div className="flex items-center gap-4 bg-sky-400/[0.08] border border-sky-400/20 rounded-2xl p-6">
          <div className="w-12 h-12 rounded-2xl bg-sky-400/15 flex items-center justify-center shrink-0">
            <Globe className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <p className="text-brand-white font-semibold mb-1">Public Election</p>
            <p className="text-brand-grey text-sm leading-relaxed">
              All registered voters on the platform will see and can vote in this election.
              No individual invitations needed.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Private header */}
          <div className="flex items-center gap-3 bg-violet-400/[0.08] border border-violet-400/20 rounded-xl px-4 py-3">
            <Lock className="w-4 h-4 text-violet-400 shrink-0" />
            <p className="text-xs text-brand-grey-light">
              <strong className="text-violet-300">{selected.size}</strong> voter{selected.size !== 1 ? 's' : ''} invited ·
              Only invited voters will see this election.
            </p>
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={selectAll}  className="text-xs text-brand-blue-light hover:underline">All</button>
              <button type="button" onClick={clearAll}   className="text-xs text-brand-grey hover:underline">None</button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-grey" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search voters…"
              className="field-input pl-10"
            />
          </div>

          {/* Voter list */}
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {isLoading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
            ) : filtered.length === 0 ? (
              <p className="text-center text-brand-grey text-sm py-8">
                {voters.length === 0 ? 'No voters registered yet.' : 'No voters match your search.'}
              </p>
            ) : (
              filtered.map((voter) => <VoterRow key={voter.id} voter={voter} selected={selected.has(voter.id)} onToggle={() => toggle(voter.id)} />)
            )}
          </div>
        </>
      )}

      <div className="flex justify-between pt-2">
        <button type="button" className="btn-secondary" onClick={() => goToStep(3)}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button type="button" className="btn-primary" onClick={handleNext}>
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function VoterRow({ voter, selected, onToggle }: { voter: Voter; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-150',
        selected
          ? 'bg-brand-blue/12 border-brand-blue/35'
          : 'bg-brand-ink-muted/20 border-white/[0.07] hover:border-white/15',
      )}
    >
      <Avatar name={voter.displayName} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-brand-white text-sm font-medium truncate">{voter.displayName}</p>
        <p className="text-brand-grey text-xs">@{voter.username}</p>
      </div>
      <div className={cn(
        'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
        selected ? 'bg-brand-blue border-brand-blue' : 'border-white/20',
      )}>
        {selected && <UserCheck className="w-3 h-3 text-white" />}
      </div>
    </button>
  )
}
