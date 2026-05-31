import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ElectionDraft, DraftStep1, DraftStep2, DraftStep3, DraftStep4 } from '@/types'

interface DraftState {
  draft: ElectionDraft | null
  initDraft: () => void
  setStep1: (data: DraftStep1) => void
  setStep2: (data: DraftStep2) => void
  setStep3: (data: DraftStep3) => void
  setStep4: (data: DraftStep4) => void
  goToStep: (step: number) => void
  setDraftId: (id: string) => void
  clearDraft: () => void
  loadDraft: (draft: ElectionDraft) => void
}

const emptyDraft = (): ElectionDraft => ({
  currentStep: 1,
})

export const useDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      draft: null,

      initDraft: () => set({ draft: emptyDraft() }),

      setStep1: (data) =>
        set((s) => ({
          draft: s.draft ? { ...s.draft, step1: data, savedAt: new Date().toISOString() } : s.draft,
        })),

      setStep2: (data) =>
        set((s) => ({
          draft: s.draft ? { ...s.draft, step2: data, savedAt: new Date().toISOString() } : s.draft,
        })),

      setStep3: (data) =>
        set((s) => ({
          draft: s.draft ? { ...s.draft, step3: data, savedAt: new Date().toISOString() } : s.draft,
        })),

      setStep4: (data) =>
        set((s) => ({
          draft: s.draft ? { ...s.draft, step4: data, savedAt: new Date().toISOString() } : s.draft,
        })),

      goToStep: (step) =>
        set((s) => ({
          draft: s.draft ? { ...s.draft, currentStep: step } : s.draft,
        })),

      setDraftId: (id) =>
        set((s) => ({
          draft: s.draft ? { ...s.draft, id } : s.draft,
        })),

      clearDraft: () => set({ draft: null }),

      loadDraft: (draft) => set({ draft }),
    }),
    {
      name: 'ivote-draft',
      // Don't persist File objects (not serializable)
      partialize: (state) => ({
        draft: state.draft
          ? {
              ...state.draft,
              step3: state.draft.step3
                ? {
                    contestants: state.draft.step3.contestants.map((c) => ({
                      ...c,
                      passportFile: null,
                    })),
                  }
                : undefined,
            }
          : null,
      }),
    },
  ),
)
