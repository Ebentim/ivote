import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, Plus, Trash2, Upload, User } from 'lucide-react'
import { useRef, useCallback } from 'react'
import { step3Schema, type Step3Form } from '@/lib/schemas'
import { useDraftStore } from '@/store/draft'
import { generateTempId, readFileAsDataURL, formatBytes } from '@/lib/utils'
import { cn } from '@/lib/utils'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 3 * 1024 * 1024 // 3 MB

export default function Step3Contestants() {
  const { draft, setStep3, goToStep } = useDraftStore()

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<Step3Form>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      contestants: draft?.step3?.contestants?.length
        ? draft.step3.contestants.map((c) => ({
            tempId:      c.tempId,
            name:        c.name,
            party:       c.party ?? '',
            passportUrl: c.passportUrl ?? null,
          }))
        : [
            { tempId: generateTempId(), name: '', party: '', passportUrl: null },
            { tempId: generateTempId(), name: '', party: '', passportUrl: null },
          ],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'contestants' })
  const contestants = watch('contestants')

  // Local preview state per contestant (not persisted to form, just for UI)
  const previewsRef = useRef<Record<string, string>>({})

  const handlePassportUpload = useCallback(async (index: number, file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('Only JPEG, PNG, and WebP images are allowed.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      alert(`File too large. Maximum size is ${formatBytes(MAX_FILE_SIZE)}.`)
      return
    }
    const dataUrl = await readFileAsDataURL(file)
    const tempId  = contestants[index].tempId
    previewsRef.current[tempId] = dataUrl
    // Store preview as passportUrl for now (backend will replace with real URL on save)
    setValue(`contestants.${index}.passportUrl`, dataUrl, { shouldValidate: true })
  }, [contestants, setValue])

  const onSubmit = (data: Step3Form) => {
    setStep3({
      contestants: data.contestants.map((c) => ({
        tempId:          c.tempId,
        name:            c.name,
        party:           c.party ?? '',
        passportUrl:     c.passportUrl ?? null,
        passportPreview: previewsRef.current[c.tempId] ?? c.passportUrl ?? null,
      })),
    })
    goToStep(4)
  }

  const topError = (errors.contestants as { message?: string } | undefined)?.message

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div>
        <h2 className="font-display text-2xl text-brand-white mb-1">Contestants</h2>
        <p className="text-brand-grey text-sm">Add at least 2 contestants. Upload a passport photo for each.</p>
      </div>

      {topError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
          {topError}
        </div>
      )}

      <div className="space-y-4">
        {fields.map((field, index) => {
          const preview  = previewsRef.current[field.tempId] ?? contestants[index]?.passportUrl
          const rowError = errors.contestants?.[index]

          return (
            <div key={field.id} className={cn(
              'relative border rounded-2xl p-5 transition-all duration-200',
              rowError ? 'border-red-500/40 bg-red-500/5' : 'border-white/[0.08] bg-brand-ink-muted/20',
            )}>
              {/* Index badge */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 rounded-full bg-brand-blue/30 flex items-center justify-center text-brand-blue-light text-xs font-bold shrink-0">
                  {index + 1}
                </div>
                <span className="text-brand-grey-light text-xs font-semibold uppercase tracking-widest">
                  Contestant {index + 1}
                </span>
                {fields.length > 2 && (
                  <button type="button" onClick={() => remove(index)}
                    className="ml-auto btn-ghost text-red-400/70 hover:text-red-400 p-1.5">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex gap-5">
                {/* Passport photo upload */}
                <PassportUploader
                  preview={typeof preview === 'string' ? preview : null}
                  onFile={(f) => handlePassportUpload(index, f)}
                />

                {/* Fields */}
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="field-label">Full Name *</label>
                    <input
                      {...register(`contestants.${index}.name`)}
                      placeholder="e.g., Jane Adeyemi"
                      className={`field-input ${rowError?.name ? 'error' : ''}`}
                    />
                    {rowError?.name && <p className="field-error"><span>⚠</span>{rowError.name.message}</p>}
                  </div>
                  <div>
                    <label className="field-label">Party / Group <span className="text-brand-grey/50 normal-case font-normal tracking-normal">(optional)</span></label>
                    <input
                      {...register(`contestants.${index}.party`)}
                      placeholder="e.g., Progressive Alliance"
                      className="field-input"
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add contestant */}
      <button
        type="button"
        onClick={() => append({ tempId: generateTempId(), name: '', party: '', passportUrl: null })}
        className="btn-secondary w-full gap-2 py-3"
      >
        <Plus className="w-4 h-4" /> Add Contestant
      </button>

      <div className="flex justify-between pt-2">
        <button type="button" className="btn-secondary" onClick={() => goToStep(2)}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button type="submit" className="btn-primary">
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  )
}

function PassportUploader({ preview, onFile }: { preview: string | null; onFile: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }, [onFile])

  return (
    <div
      className={cn(
        'relative w-24 h-24 shrink-0 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden group transition-all duration-200',
        preview ? 'border-brand-blue/40' : 'border-white/15 hover:border-brand-blue/40 bg-brand-ink-muted/30 hover:bg-brand-blue/5',
      )}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {preview ? (
        <>
          <img src={preview} alt="Passport" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Upload className="w-5 h-5 text-white" />
          </div>
        </>
      ) : (
        <>
          <User className="w-6 h-6 text-brand-grey mb-1" />
          <span className="text-[9px] text-brand-grey text-center leading-tight px-1">Upload photo</span>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }}
      />
    </div>
  )
}
