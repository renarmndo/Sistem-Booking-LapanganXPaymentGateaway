import { create } from 'zustand'
import type { SlotAvailability } from '../types/booking.types'

const STORAGE_KEY = 'bl_checkout_draft'

export interface CheckoutDraft {
  fieldId: number
  fieldName: string
  surfaceType: string
  capacity: number
  date: string
  slots: SlotAvailability[]
  totalAmount: number
}

function readStoredDraft(): CheckoutDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CheckoutDraft
  } catch {
    return null
  }
}

function writeStoredDraft(draft: CheckoutDraft | null): void {
  if (typeof window === 'undefined') return
  try {
    if (draft) {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
    } else {
      window.sessionStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Ignore storage errors
  }
}

interface CheckoutDraftState {
  draft: CheckoutDraft | null
  setDraft: (draft: CheckoutDraft) => void
  clearDraft: () => void
}

export const useCheckoutDraftStore = create<CheckoutDraftState>((set) => ({
  draft: readStoredDraft(),
  setDraft: (draft) => {
    writeStoredDraft(draft)
    set({ draft })
  },
  clearDraft: () => {
    writeStoredDraft(null)
    set({ draft: null })
  },
}))
