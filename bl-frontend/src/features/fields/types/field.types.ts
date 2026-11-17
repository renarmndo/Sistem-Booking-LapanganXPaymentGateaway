export interface Facility {
  id: number
  name: string
  icon: string
}

export interface FieldPhoto {
  id: number
  url: string
  sort_order: number
  is_cover: boolean
}

export interface FieldPrice {
  id: number
  day_type: 'weekday' | 'weekend' | 'holiday'
  start_time: string
  end_time: string
  price_per_slot: number
}

export interface OperatingHour {
  id: number
  day_of_week: number
  open_time: string
  close_time: string
  is_closed: boolean
}

export interface FieldSummary {
  id: number
  owner_id: number
  name: string
  slug: string
  surface_type: string
  capacity: number
  address: string
  city: string
  is_active: boolean
  cover_url: string
  min_price: number
  facilities: Facility[]
}

export interface FieldDetail extends FieldSummary {
  description: string
  latitude: number | null
  longitude: number | null
  photos: FieldPhoto[]
  prices: FieldPrice[]
  operating_hours: OperatingHour[]
}

export interface ListFieldsParams {
  q?: string
  surface_type?: string
  facility_ids?: number[]
  min_price?: number
  max_price?: number
  sort?: 'popular' | 'price_asc' | 'price_desc'
  page?: number
  limit?: number
}

export type SlotStatus = 'available' | 'past' | 'locked' | 'booked' | 'blocked'

export interface AvailabilitySlot {
  start_time: string
  end_time: string
  price: number
  status: SlotStatus
}
