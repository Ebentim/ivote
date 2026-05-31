import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Globe, Lock, ArrowRight } from 'lucide-react'
import { step1Schema, type Step1Form } from '@/lib/schemas'
import { useDraftStore } from '@/store/draft'
import { cn } from '@/lib/utils'

export default function Step1BasicInfo() {
  const { draft, setStep1, goToStep } = useDraftStore()

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Step1Form>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      title:       draft?.step1?.title       ?? '',
      description: draft?.step1?.description ?? '',
      visibility:  draft?.step1?.visibility  ?? 'public',
    },
  })

  const visibility = watch('visibility')

  const onSubmit = (data: Step1Form) => {
    setStep1(data)
    goToStep(2)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div>
        <h2 className="font-display text-2xl text-brand-white mb-1">Basic Information</h2>
        <p className="text-brand-grey text-sm">Give your election a name and decide who can access it.</p>
      </div>

      {/* Title */}
      <div>
        <label className="field-label">Election Title *</label>
        <input
          {...register('title')}
          placeholder="e.g., Student Body President 2026"
          className={`field-input ${errors.title ? 'error' : ''}`}
        />
        {errors.title && <p className="field-error"><span>⚠</span>{errors.title.message}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="field-label">Description <span className="text-brand-grey/50 normal-case font-normal tracking-normal">(optional)</span></label>
        <textarea
          {...register('description')}
          rows={3}
          placeholder="Brief description of this election…"
          className="field-input resize-none"
        />
        {errors.description && <p className="field-error"><span>⚠</span>{errors.description.message}</p>}
      </div>

      {/* Visibility */}
      <div>
        <label className="field-label">Visibility *</label>
        <div className="grid grid-cols-2 gap-3">
          {([
            { val: 'public',  Icon: Globe, title: 'Public',  desc: 'All registered voters on the platform can participate.' },
            { val: 'private', Icon: Lock,  title: 'Private', desc: 'Only voters you explicitly invite can see and vote.' },
          ] as const).map(({ val, Icon, title, desc }) => (
            <button
              key={val}
              type="button"
              onClick={() => setValue('visibility', val, { shouldValidate: true })}
              className={cn(
                'flex flex-col items-start gap-2 p-4 rounded-2xl border text-left transition-all duration-200',
                visibility === val
                  ? 'bg-brand-blue/15 border-brand-blue/50 shadow-glow-sm'
                  : 'bg-brand-ink-muted/30 border-white/[0.08] hover:border-white/20',
              )}
            >
              <div className="flex items-center gap-2.5 w-full">
                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                  visibility === val ? 'bg-brand-blue/30' : 'bg-brand-ink-muted',
                )}>
                  <Icon className={cn('w-3.5 h-3.5', visibility === val ? 'text-brand-blue-light' : 'text-brand-grey')} />
                </div>
                <span className={cn('font-semibold text-sm', visibility === val ? 'text-brand-white' : 'text-brand-grey-light')}>
                  {title}
                </span>
                {visibility === val && (
                  <div className="ml-auto w-4 h-4 rounded-full bg-brand-blue flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </div>
              <p className="text-brand-grey text-xs leading-relaxed pl-[2.25rem]">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button type="submit" className="btn-primary">
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  )
}
