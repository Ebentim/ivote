import axios, { AxiosError } from 'axios'
import type {
  Admin, Voter, Election, ElectionResult, ElectionDraft,
  VotePayload, PaginatedResponse, ApiResponse,
} from '@/types'

// ── Axios instance ─────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,         // session cookie
  headers: { 'Content-Type': 'application/json' },
})

// Attach token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ivote_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Unified error normalizer
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ message: string }>) => {
    const msg = err.response?.data?.message ?? err.message ?? 'An unexpected error occurred'
    return Promise.reject(new Error(msg))
  },
)

// ── Auth ───────────────────────────────────────────────────────────────────
export const authApi = {
  adminLogin: async (username: string, password: string) => {
    const res = await api.post<ApiResponse<{ token: string; admin: Admin }>>('/auth/admin/login', { username, password })
    localStorage.setItem('ivote_token', res.data.data.token)
    return res.data.data
  },

  voterLogin: async (username: string, password: string) => {
    const res = await api.post<ApiResponse<{ token: string; voter: Voter }>>('/auth/voter/login', { username, password })
    localStorage.setItem('ivote_token', res.data.data.token)
    return res.data.data
  },

  logout: async () => {
    await api.post('/auth/logout')
    localStorage.removeItem('ivote_token')
  },

  me: async () => {
    const res = await api.get<ApiResponse<Admin | Voter>>('/auth/me')
    return res.data.data
  },
}

// ── Admin: Elections ───────────────────────────────────────────────────────
export const electionsApi = {
  list: async (params?: { status?: string; page?: number; pageSize?: number }) => {
    const res = await api.get<PaginatedResponse<Election>>('/elections', { params })
    return res.data
  },

  get: async (id: string) => {
    const res = await api.get<ApiResponse<Election>>(`/elections/${id}`)
    return res.data.data
  },

  create: async (payload: Partial<Election>) => {
    const res = await api.post<ApiResponse<Election>>('/elections', payload)
    return res.data.data
  },

  update: async (id: string, payload: Partial<Election>) => {
    const res = await api.put<ApiResponse<Election>>(`/elections/${id}`, payload)
    return res.data.data
  },

  publish: async (id: string) => {
    const res = await api.patch<ApiResponse<Election>>(`/elections/${id}/publish`)
    return res.data.data
  },

  delete: async (id: string) => {
    await api.delete(`/elections/${id}`)
  },

  getResults: async (id: string) => {
    const res = await api.get<ApiResponse<ElectionResult>>(`/elections/${id}/results`)
    return res.data.data
  },

  // Invite management for private elections
  inviteVoter: async (electionId: string, voterId: string) => {
    const res = await api.post(`/elections/${electionId}/invite`, { voterId })
    return res.data
  },

  removeInvite: async (electionId: string, voterId: string) => {
    await api.delete(`/elections/${electionId}/invite/${voterId}`)
  },

  // Draft persistence
  saveDraft: async (draft: ElectionDraft) => {
    const res = await api.post<ApiResponse<ElectionDraft>>('/elections/draft', draft)
    return res.data.data
  },

  getDraft: async (id: string) => {
    const res = await api.get<ApiResponse<ElectionDraft>>(`/elections/draft/${id}`)
    return res.data.data
  },
}

// ── Admin: Contestants ─────────────────────────────────────────────────────
export const contestantsApi = {
  uploadPassport: async (file: File): Promise<string> => {
    const form = new FormData()
    form.append('file', file)
    const res = await api.post<ApiResponse<{ url: string }>>('/upload/passport', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data.url
  },

  create: async (electionId: string, payload: { name: string; party: string; passportUrl?: string }) => {
    const res = await api.post(`/elections/${electionId}/contestants`, payload)
    return res.data.data
  },

  update: async (electionId: string, contestantId: string, payload: { name?: string; party?: string; passportUrl?: string }) => {
    const res = await api.put(`/elections/${electionId}/contestants/${contestantId}`, payload)
    return res.data.data
  },

  delete: async (electionId: string, contestantId: string) => {
    await api.delete(`/elections/${electionId}/contestants/${contestantId}`)
  },
}

// ── Admin: Voters ──────────────────────────────────────────────────────────
export const votersApi = {
  list: async (params?: { page?: number; pageSize?: number; search?: string }) => {
    const res = await api.get<PaginatedResponse<Voter>>('/voters', { params })
    return res.data
  },

  get: async (id: string) => {
    const res = await api.get<ApiResponse<Voter>>(`/voters/${id}`)
    return res.data.data
  },

  create: async (payload: { displayName: string; username: string; password: string }) => {
    const res = await api.post<ApiResponse<Voter>>('/voters', payload)
    return res.data.data
  },

  delete: async (id: string) => {
    await api.delete(`/voters/${id}`)
  },
}

// ── Admin: Admins (superadmin only) ───────────────────────────────────────
export const adminsApi = {
  list: async () => {
    const res = await api.get<ApiResponse<Admin[]>>('/admins')
    return res.data.data
  },

  create: async (payload: { displayName: string; username: string; email: string; password: string }) => {
    const res = await api.post<ApiResponse<Admin>>('/admins', payload)
    return res.data.data
  },

  delete: async (id: string) => {
    await api.delete(`/admins/${id}`)
  },
}

// ── Voter: Elections ───────────────────────────────────────────────────────
export const voterElectionsApi = {
  list: async () => {
    const res = await api.get<ApiResponse<Election[]>>('/voter/elections')
    return res.data.data
  },

  get: async (id: string) => {
    const res = await api.get<ApiResponse<Election>>(`/voter/elections/${id}`)
    return res.data.data
  },

  getResults: async (id: string) => {
    const res = await api.get<ApiResponse<ElectionResult>>(`/voter/elections/${id}/results`)
    return res.data.data
  },

  vote: async (payload: VotePayload) => {
    const res = await api.post<ApiResponse<{ message: string }>>(`/voter/elections/${payload.electionId}/vote`, {
      contestantId: payload.contestantId,
    })
    return res.data
  },

  hasVoted: async (electionId: string) => {
    const res = await api.get<ApiResponse<{ voted: boolean; contestantId?: string }>>(`/voter/elections/${electionId}/my-vote`)
    return res.data.data
  },
}
