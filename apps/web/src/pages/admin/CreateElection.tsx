import { useEffect } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDraftStore } from '@/store/draft'
import Step1BasicInfo   from './steps/Step1BasicInfo'
import Step2Schedule    from './steps/Step2Schedule'
import Step3Contestants from './steps/Step3Contestants'
import Step4Access      from './steps/Step4Access'
import Step5Review      from './steps/Step5Review'

const STEPS = [
  { number: 1, label: 'Basic Info'   },
  { number: 2, label: 'Schedule'     },
  { number: 3, label: 'Contestants'  },
  { number: 4, label: 'Access'       },
  { number: 5, label: 'Review'       },
]

export default function CreateElectionPage() {
  const { draft, initDraft, goToStep } = useDraftStore()

  // Start fresh draft on mount if none exists
  useEffect(() => {
    if (!draft) initDraft()
  }, [draft, initDraft])

  const currentStep = draft?.currentStep ?? 1

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl text-brand-white mb-1">Create Election</h1>
        <p className="text-brand-grey text-sm">
          Your progress is saved automatically. You can leave and resume at any time.
        </p>
        {draft?.savedAt && (
          <p className="text-brand-grey/50 text-xs mt-1 font-mono">
            Last saved {new Date(draft.savedAt).toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Stepper */}
      <div className="flex items-center mb-8 overflow-x-auto no-scrollbar pb-2">
        {STEPS.map((step, i) => {
          const done   = step.number < currentStep
          const active = step.number === currentStep

          return (
            <div key={step.number} className="flex items-center shrink-0">
              <button
                onClick={() => done && goToStep(step.number)}
                disabled={!done}
                className="flex items-center gap-2.5 group"
              >
                <div className={cn(
                  'step-dot',
                  done   ? 'done'   : '',
                  active ? 'active' : '',
                  !done && !active ? 'pending' : '',
                  done ? 'cursor-pointer hover:scale-105 transition-transform' : '',
                )}>
                  {done ? <Check className="w-3.5 h-3.5" /> : step.number}
                </div>
                <span className={cn(
                  'text-xs font-semibold whitespace-nowrap transition-colors hidden sm:block',
                  active ? 'text-brand-blue-light' : done ? 'text-brand-grey-light' : 'text-brand-grey/50',
                )}>
                  {step.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="w-4 h-4 text-brand-grey/20 mx-2 shrink-0" />
              )}
            </div>
          )
        })}
      </div>

      {/* Step content */}
      <div className="glass p-8 animate-slide-up" key={currentStep}>
        {currentStep === 1 && <Step1BasicInfo />}
        {currentStep === 2 && <Step2Schedule />}
        {currentStep === 3 && <Step3Contestants />}
        {currentStep === 4 && <Step4Access />}
        {currentStep === 5 && <Step5Review />}
      </div>
    </div>
  )
}
