import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isPast, isFuture, differenceInSeconds } from 'date-fns'
import type { ElectionStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Date helpers ──────────────────────────────────────────────────────────────
export function fmtDate(iso: string) {
  return format(new Date(iso), 'MMM d, yyyy · h:mm a')
}

export function fmtDateShort(iso: string) {
  return format(new Date(iso), 'MMM d, yyyy')
}

export function fmtRelative(iso: string) {
  return formatDistanceToNow(new Date(iso), { addSuffix: true })
}

export function fmtCountdown(isoEnd: string): string {
  const secs = differenceInSeconds(new Date(isoEnd), new Date())
  if (secs <= 0) return '0s'
  const d = Math.floor(secs / 86400)
  const h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function deriveElectionStatus(startTime: string, endTime: string, dbStatus: ElectionStatus): ElectionStatus {
  if (dbStatus === 'draft') return 'draft'
  if (isFuture(new Date(startTime))) return 'upcoming'
  if (isPast(new Date(endTime))) return 'ended'
  return 'active'
}

// ── Validation helpers ────────────────────────────────────────────────────────
export const MIN_ELECTION_DURATION_MS = 15 * 60 * 1000        // 15 minutes
export const MAX_ELECTION_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

// ── Avatar initials ───────────────────────────────────────────────────────────
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const AVATAR_COLORS = [
  '#1e4d8a', '#0f5f5a', '#4a2b8a', '#6b1a3a', '#2a5a2a', '#7a4410',
]

export function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash << 5) - hash + name.charCodeAt(i)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// ── File helpers ──────────────────────────────────────────────────────────────
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload  = () => res(r.result as string)
    r.onerror = () => rej(new Error('Failed to read file'))
    r.readAsDataURL(file)
  })
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Misc ──────────────────────────────────────────────────────────────────────
export function generateTempId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function pluralize(n: number, singular: string, plural?: string): string {
  return n === 1 ? `${n} ${singular}` : `${n} ${plural ?? singular + 's'}`
}
