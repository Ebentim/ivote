import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, Clock, CalendarClock } from 'lucide-react'
import { step2Schema, type Step2Form } from '@/lib/schemas'
import { useDraftStore } from '@/store/draft'
import { formatDistanceStrict } from 'date-fns'

// Min datetime-local value = now + 1 min
function nowPlusMinutes(m: number) {
  const d = new Date(Date.now() + m * 60_000)
  return d.toISOString().slice(0, 16)
}

export default function Step2Schedule() {
  const { draft, setStep2, goToStep } = useDraftStore()

  const { register, handleSubmit, watch, formState: { errors } } = useForm<Step2Form>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      startDate: draft?.step2?.startDate ?? nowPlusMinutes(5),
      endDate:   draft?.step2?.endDate   ?? nowPlusMinutes(65),
    },
  })

  const [startDate, endDate] = watch(['startDate', 'endDate'])

  const duration = (() => {
    try {
      const s = new Date(startDate).getTime()
      const e = new Date(endDate).getTime()
      if (e > s) return formatDistanceStrict(new Date(endDate), new Date(startDate))
      return null
    } catch { return null }
  })()

  const onSubmit = (data: Step2Form) => {
    setStep2(data)
    goToStep(3)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div>
        <h2 className="font-display text-2xl text-brand-white mb-1">Schedule</h2>
        <p className="text-brand-grey text-sm">Set when the election opens and closes. Duration must be 15 minutes to 30 days.</p>
      </div>

      {/* Duration hint */}
      <div className="flex items-center gap-3 bg-brand-blue/[0.08] border border-brand-blue/20 rounded-xl px-4 py-3">
        <Clock className="w-4 h-4 text-brand-blue-light shrink-0" />
        <div className="text-xs text-brand-grey-light">
          {duration
            ? <span>Duration: <strong className="text-brand-white">{duration}</strong></span>
            : <span>Minimum 15 minutes · Maximum 30 days</span>
          }
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Start */}
        <div>
          <label className="field-label">
            <CalendarClock className="inline w-3.5 h-3.5 mr-1.5 opacity-70" />
            Start Date & Time *
          </label>
          <input
            type="datetime-local"
            {...register('startDate')}
            min={nowPlusMinutes(0)}
            className={`field-input [color-scheme:dark] ${errors.startDate ? 'error' : ''}`}
          />
          {errors.startDate && <p className="field-error"><span>⚠</span>{errors.startDate.message}</p>}
        </div>

        {/* End */}
        <div>
          <label className="field-label">
            <CalendarClock className="inline w-3.5 h-3.5 mr-1.5 opacity-70" />
            End Date & Time *
          </label>
          <input
            type="datetime-local"
            {...register('endDate')}
            min={startDate || nowPlusMinutes(15)}
            className={`field-input [color-scheme:dark] ${errors.endDate ? 'error' : ''}`}
          />
          {errors.endDate && <p className="field-error"><span>⚠</span>{errors.endDate.message}</p>}
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button type="button" className="btn-secondary" onClick={() => goToStep(1)}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button type="submit" className="btn-primary">
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  )
}
