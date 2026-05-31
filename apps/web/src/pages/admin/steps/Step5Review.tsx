import { ArrowLeft, Send, Save, Globe, Lock, User } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDraftStore } from '@/store/draft'
import { electionsApi, contestantsApi } from '@/api'
import { useToast } from '@/components/ui'
import { fmtDate } from '@/lib/utils'

export default function Step5Review() {
  const navigate            = useNavigate()
  const { draft, clearDraft, goToStep } = useDraftStore()
  const { success, error }  = useToast()
  const [saving, setSaving] = useState<'draft' | 'publish' | null>(null)

  const { step1, step2, step3, step4 } = draft ?? {}

  const handleSubmit = async (publish: boolean) => {
    if (!step1 || !step2 || !step3) {
      error('Please complete all required steps.')
      return
    }
    setSaving(publish ? 'publish' : 'draft')
    try {
      // 1. Create election
      const election = await electionsApi.create({
        title:       step1.title,
        description: step1.description,
        visibility:  step1.visibility,
        startTime:   new Date(step2.startDate).toISOString(),
        endTime:     new Date(step2.endDate).toISOString(),
        status:      'draft',
      })

      // 2. Upload passport photos & create contestants
      for (const c of step3.contestants) {
        let passportUrl: string | undefined
        if (c.passportFile) {
          try { passportUrl = await contestantsApi.uploadPassport(c.passportFile) } catch { /* proceed without */ }
        } else if (c.passportUrl && !c.passportUrl.startsWith('data:')) {
          passportUrl = c.passportUrl
        }
        await contestantsApi.create(election.id, { name: c.name, party: c.party ?? '', passportUrl })
      }

      // 3. Set invited voters (private)
      if (step1.visibility === 'private' && step4?.invitedVoterIds?.length) {
        for (const vid of step4.invitedVoterIds) {
          await electionsApi.inviteVoter(election.id, vid)
        }
      }

      // 4. Publish if requested
      if (publish) await electionsApi.publish(election.id)

      clearDraft()
      success(publish ? 'Election published successfully!' : 'Election saved as draft.')
      navigate(`/admin/elections/${election.id}`)
    } catch (err) {
      error((err as Error).message)
    } finally {
      setSaving(null)
    }
  }

  if (!step1 || !step2 || !step3) {
    return (
      <div className="text-center py-8 text-brand-grey">
        <p>Missing information. Please go back and complete all steps.</p>
        <button className="btn-secondary mt-4" onClick={() => goToStep(1)}>Start Over</button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-brand-white mb-1">Review & Publish</h2>
        <p className="text-brand-grey text-sm">Review all details before publishing. You can also save as draft.</p>
      </div>

      {/* Summary sections */}
      <div className="space-y-4">
        {/* Basic Info */}
        <ReviewSection title="Basic Info" onEdit={() => goToStep(1)}>
          <div className="flex items-start gap-3">
            {step1.visibility === 'public'
              ? <Globe className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
              : <Lock  className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />}
            <div>
              <p className="text-brand-white font-semibold">{step1.title}</p>
              {step1.description && <p className="text-brand-grey text-sm mt-1">{step1.description}</p>}
              <p className="text-brand-grey-light text-xs mt-1.5 capitalize">
                {step1.visibility} election
              </p>
            </div>
          </div>
        </ReviewSection>

        {/* Schedule */}
        <ReviewSection title="Schedule" onEdit={() => goToStep(2)}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-brand-grey text-xs mb-1">Opens</p>
              <p className="text-brand-white text-sm">{fmtDate(new Date(step2.startDate).toISOString())}</p>
            </div>
            <div>
              <p className="text-brand-grey text-xs mb-1">Closes</p>
              <p className="text-brand-white text-sm">{fmtDate(new Date(step2.endDate).toISOString())}</p>
            </div>
          </div>
        </ReviewSection>

        {/* Contestants */}
        <ReviewSection title={`Contestants (${step3.contestants.length})`} onEdit={() => goToStep(3)}>
          <div className="space-y-3">
            {step3.contestants.map((c, i) => (
              <div key={c.tempId} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
                  {(c.passportPreview ?? c.passportUrl) ? (
                    <img src={c.passportPreview ?? c.passportUrl!} alt={c.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-brand-ink-muted flex items-center justify-center">
                      <User className="w-4 h-4 text-brand-grey" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-brand-white text-sm font-medium">{c.name}</p>
                  {c.party && <p className="text-brand-grey text-xs">{c.party}</p>}
                </div>
                <span className="ml-auto text-brand-grey text-xs">#{i + 1}</span>
              </div>
            ))}
          </div>
        </ReviewSection>

        {/* Access */}
        <ReviewSection title="Access" onEdit={() => goToStep(4)}>
          {step1.visibility === 'public' ? (
            <p className="text-brand-grey text-sm">All registered voters — no invitations needed.</p>
          ) : (
            <p className="text-brand-grey text-sm">
              <span className="text-brand-white font-semibold">{step4?.invitedVoterIds?.length ?? 0}</span> voter{(step4?.invitedVoterIds?.length ?? 0) !== 1 ? 's' : ''} invited.
            </p>
          )}
        </ReviewSection>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button className="btn-secondary" onClick={() => goToStep(4)} disabled={!!saving}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex gap-3 sm:ml-auto">
          <button
            className="btn-secondary"
            onClick={() => handleSubmit(false)}
            disabled={!!saving}
          >
            {saving === 'draft'
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Save className="w-4 h-4" />}
            Save as Draft
          </button>
          <button
            className="btn-primary"
            onClick={() => handleSubmit(true)}
            disabled={!!saving}
          >
            {saving === 'publish'
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Send className="w-4 h-4" />}
            Publish Election
          </button>
        </div>
      </div>
    </div>
  )
}

function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="border border-white/[0.08] rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-brand-ink-muted/20">
        <h3 className="text-brand-grey-light text-xs font-bold uppercase tracking-widest">{title}</h3>
        <button onClick={onEdit} className="text-brand-blue-light text-xs hover:underline font-medium">Edit</button>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}
