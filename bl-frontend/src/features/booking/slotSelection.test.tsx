import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { calculateSlotsTotal, formatSlotRange, toggleSlotSelection } from '@/utils/slot.utils'
import { SlotItem } from './components/SlotItem'
import type { SlotAvailability } from './types/booking.types'

const SAMPLE_SLOTS: SlotAvailability[] = [
  { start_time: '18:00', end_time: '19:00', price: 200000, status: 'available' },
  { start_time: '19:00', end_time: '20:00', price: 250000, status: 'available' },
  { start_time: '20:00', end_time: '21:00', price: 250000, status: 'available' },
  { start_time: '21:00', end_time: '22:00', price: 300000, status: 'available' },
  { start_time: '22:00', end_time: '23:00', price: 300000, status: 'available' },
]

describe('slot.utils & SlotItem', () => {
  it('validates consecutive slots, max hours, and calculates total accurately', () => {
    const step1 = toggleSlotSelection([], SAMPLE_SLOTS[0], 4)
    expect(step1.ok).toBe(true)

    // Non-consecutive slot 20:00 after 18:00 must be rejected
    const nonConsec = toggleSlotSelection(step1.next, SAMPLE_SLOTS[2], 4)
    expect(nonConsec.ok).toBe(false)
    expect(nonConsec.error).toMatch(/berurutan/i)

    // Consecutive slot 19:00 succeeds
    const step2 = toggleSlotSelection(step1.next, SAMPLE_SLOTS[1], 4)
    expect(step2.ok).toBe(true)
    expect(calculateSlotsTotal(step2.next)).toBe(450000)
    expect(formatSlotRange(step2.next)).toBe('18:00 – 20:00')

    // Exceeding maxHours = 2 rejected
    const step3 = toggleSlotSelection(step2.next, SAMPLE_SLOTS[2], 2)
    expect(step3.ok).toBe(false)
    expect(step3.error).toMatch(/Maksimal 2 jam/i)
  })

  it('renders distinct text/labels and disabled states for locked, booked, blocked, and past slots', () => {
    render(
      <div>
        <SlotItem startTime="08:00" endTime="09:00" price={150000} status="past" />
        <SlotItem startTime="09:00" endTime="10:00" price={150000} status="locked" />
        <SlotItem startTime="10:00" endTime="11:00" price={150000} status="booked" />
        <SlotItem startTime="11:00" endTime="12:00" price={150000} status="blocked" />
      </div>,
    )

    expect(screen.getByText('Lewat')).toBeInTheDocument()
    expect(screen.getByText('Diproses')).toBeInTheDocument()
    expect(screen.getByText('Terisi')).toBeInTheDocument()
    expect(screen.getByText('Tutup')).toBeInTheDocument()
    expect(screen.getAllByRole('button').every((btn) => (btn as HTMLButtonElement).disabled)).toBe(
      true,
    )
  })
})
