// ── Auth ──────────────────────────────────────────────────────────────────────
export type AdminRole = 'superadmin' | 'admin'

export interface Admin {
  id: string
  username: string
  email: string
  displayName: string
  role: AdminRole
  createdAt: string
}

export interface Voter {
  id: string
  username: string
  displayName: string
  createdAt: string
}

export type AuthUser = (Admin & { type: 'admin' }) | (Voter & { type: 'voter' })

// ── Election ──────────────────────────────────────────────────────────────────
export type ElectionStatus    = 'draft' | 'upcoming' | 'active' | 'ended'
export type ElectionVisibility = 'public' | 'private'

export interface Contestant {
  id: string
  electionId: string
  name: string
  party: string
  passportUrl: string | null
}

export interface Election {
  id: string
  title: string
  description: string
  visibility: ElectionVisibility
  status: ElectionStatus
  startTime: string
  endTime: string
  createdBy: string
  createdAt: string
  updatedAt: string
  contestants: Contestant[]
  invitedVoters?: string[]   // voter IDs (private elections)
  totalVotes?: number
}

export interface ElectionResult {
  electionId: string
  totalVotes: number
  contestants: Array<Contestant & { votes: number; percentage: number }>
}

// ── Draft ─────────────────────────────────────────────────────────────────────
export interface ElectionDraft {
  id?: string          // set once first step is saved
  currentStep: number  // 1-5
  step1?: DraftStep1
  step2?: DraftStep2
  step3?: DraftStep3
  step4?: DraftStep4
  savedAt?: string
}

export interface DraftStep1 {
  title: string
  description?: string
  visibility: ElectionVisibility
}

export interface DraftStep2 {
  startDate: string  // ISO datetime-local string
  endDate: string
}

export interface DraftContestant {
  tempId: string
  name: string
  party: string
  passportFile?: File | null
  passportPreview?: string | null
  passportUrl?: string | null
}

export interface DraftStep3 {
  contestants: DraftContestant[]
}

export interface DraftStep4 {
  invitedVoterIds: string[]
}

// ── API responses ─────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  message: string
  code?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

// ── Vote ──────────────────────────────────────────────────────────────────────
export interface VotePayload {
  electionId: string
  contestantId: string
}

export interface VoteRecord {
  id: string
  electionId: string
  contestantId: string
  createdAt: string
}
