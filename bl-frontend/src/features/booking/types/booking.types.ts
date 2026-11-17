export type SlotStatus = 'available' | 'past' | 'locked' | 'booked' | 'blocked'

export interface SlotAvailability {
  start_time: string
  end_time: string
  price: number
  status: SlotStatus
}
