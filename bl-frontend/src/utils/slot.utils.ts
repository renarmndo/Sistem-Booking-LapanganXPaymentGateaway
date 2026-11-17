export interface SlotLike {
  start_time: string
  end_time: string
  price: number
  status?: string
}

export const DEFAULT_MAX_BOOKING_HOURS = 4

export function sortSlotsByStart<T extends SlotLike>(slots: T[]): T[] {
  return [...slots].sort((a, b) => a.start_time.localeCompare(b.start_time))
}

export function areSlotsConsecutive<T extends SlotLike>(slots: T[]): boolean {
  if (slots.length <= 1) return true
  const sorted = sortSlotsByStart(slots)
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].start_time !== sorted[i - 1].end_time) {
      return false
    }
  }
  return true
}

export function calculateSlotsTotal<T extends SlotLike>(slots: T[]): number {
  return slots.reduce((sum, slot) => sum + slot.price, 0)
}

export function formatSlotRange<T extends SlotLike>(slots: T[]): string {
  if (slots.length === 0) return ''
  const sorted = sortSlotsByStart(slots)
  return `${sorted[0].start_time} – ${sorted[sorted.length - 1].end_time}`
}

export interface SlotToggleResult<T extends SlotLike> {
  ok: boolean
  next: T[]
  error?: string
}

export function toggleSlotSelection<T extends SlotLike>(
  current: T[],
  target: T,
  maxHours = DEFAULT_MAX_BOOKING_HOURS,
): SlotToggleResult<T> {
  const exists = current.some((s) => s.start_time === target.start_time)

  if (exists) {
    const remaining = sortSlotsByStart(current.filter((s) => s.start_time !== target.start_time))
    if (!areSlotsConsecutive(remaining)) {
      return {
        ok: false,
        next: current,
        error: 'Batalkan pilihan dari jam paling awal atau paling akhir agar slot tetap berurutan.',
      }
    }
    return { ok: true, next: remaining }
  }

  if (target.status && target.status !== 'available') {
    return {
      ok: false,
      next: current,
      error: 'Slot ini sudah tidak tersedia.',
    }
  }

  if (current.length >= maxHours) {
    return {
      ok: false,
      next: current,
      error: `Maksimal ${maxHours} jam per pemesanan.`,
    }
  }

  const candidate = sortSlotsByStart([...current, target])
  if (!areSlotsConsecutive(candidate)) {
    return {
      ok: false,
      next: current,
      error: 'Slot yang dipilih harus berurutan.',
    }
  }

  return { ok: true, next: candidate }
}
