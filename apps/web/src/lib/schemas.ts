import { z } from 'zod'
import { MIN_ELECTION_DURATION_MS, MAX_ELECTION_DURATION_MS } from '@/lib/utils'

// ── Auth ──────────────────────────────────────────────────────────────────────
export const adminLoginSchema = z.object({
  username: z.string().min(1, 'Username is required').max(64),
  password: z.string().min(1, 'Password is required'),
})
export type AdminLoginForm = z.infer<typeof adminLoginSchema>

export const voterLoginSchema = z.object({
  username: z.string().min(1, 'Username is required').max(64),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
export type VoterLoginForm = z.infer<typeof voterLoginSchema>

// ── Voter management ──────────────────────────────────────────────────────────
export const addVoterSchema = z.object({
  displayName: z.string().min(2, 'Full name must be at least 2 characters').max(120),
  username:    z.string().min(3, 'Username must be at least 3 characters').max(40)
               .regex(/^[a-z0-9_.-]+$/, 'Only lowercase letters, numbers, underscores, dots, hyphens'),
  password:    z.string().min(8, 'Password must be at least 8 characters').max(72),
})
export type AddVoterForm = z.infer<typeof addVoterSchema>

// ── Admin management ──────────────────────────────────────────────────────────
export const addAdminSchema = z.object({
  displayName: z.string().min(2).max(120),
  username:    z.string().min(3).max(40).regex(/^[a-z0-9_.-]+$/),
  email:       z.string().email('Must be a valid email'),
  password:    z.string().min(8).max(72),
})
export type AddAdminForm = z.infer<typeof addAdminSchema>

// ── Election multi-step ───────────────────────────────────────────────────────
export const step1Schema = z.object({
  title:       z.string().min(4, 'Title must be at least 4 characters').max(140),
  description: z.string().max(500, 'Description too long').optional(),
  visibility:  z.enum(['public', 'private']),
})
export type Step1Form = z.infer<typeof step1Schema>

export const step2Schema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  endDate:   z.string().min(1, 'End date is required'),
}).refine(({ startDate, endDate }) => {
  const start = new Date(startDate).getTime()
  const end   = new Date(endDate).getTime()
  return end > start
}, {
  message: 'End date must be after start date',
  path: ['endDate'],
}).refine(({ startDate, endDate }) => {
  const dur = new Date(endDate).getTime() - new Date(startDate).getTime()
  return dur >= MIN_ELECTION_DURATION_MS
}, {
  message: 'Election must be at least 15 minutes long',
  path: ['endDate'],
}).refine(({ startDate, endDate }) => {
  const dur = new Date(endDate).getTime() - new Date(startDate).getTime()
  return dur <= MAX_ELECTION_DURATION_MS
}, {
  message: 'Election cannot exceed 30 days',
  path: ['endDate'],
})
export type Step2Form = z.infer<typeof step2Schema>

export const contestantSchema = z.object({
  tempId:          z.string(),
  name:            z.string().min(2, 'Name must be at least 2 characters').max(120),
  party:           z.string().max(80).optional(),
  passportUrl:     z.string().nullable().optional(),
})
export type ContestantForm = z.infer<typeof contestantSchema>

export const step3Schema = z.object({
  contestants: z.array(contestantSchema)
    .min(2, 'At least 2 contestants are required')
    .refine(
      (arr) => new Set(arr.map((c) => c.name.trim().toLowerCase())).size === arr.length,
      { message: 'Contestant names must be unique' },
    ),
})
export type Step3Form = z.infer<typeof step3Schema>

export const step4Schema = z.object({
  invitedVoterIds: z.array(z.string()).optional(),
})
export type Step4Form = z.infer<typeof step4Schema>
