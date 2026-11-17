export interface AdminFacility {
  id: number
  name: string
  icon: string
}

export interface AdminFieldPhoto {
  id: number
  url: string
  sort_order: number
  is_cover: boolean
}

export interface AdminFieldPrice {
  id: number
  day_type: 'weekday' | 'weekend' | 'holiday'
  start_time: string
  end_time: string
  price_per_slot: number
}

export interface AdminOperatingHour {
  id: number
  day_of_week: number
  open_time: string
  close_time: string
  is_closed: boolean
}

export interface AdminFieldSummary {
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
  facilities: AdminFacility[]
}

export interface AdminFieldDetail extends AdminFieldSummary {
  description: string
  latitude: number | null
  longitude: number | null
  photos: AdminFieldPhoto[]
  prices: AdminFieldPrice[]
  operating_hours: AdminOperatingHour[]
}

export interface AdminListFieldsParams {
  q?: string
  surface_type?: string
  is_active?: boolean
  sort?: 'popular' | 'price_asc' | 'price_desc'
  page?: number
  limit?: number
}

export interface FieldPriceInput {
  day_type: 'weekday' | 'weekend' | 'holiday'
  start_time: string
  end_time: string
  price_per_slot: number
}

export interface OperatingHourInput {
  day_of_week: number
  open_time: string
  close_time: string
  is_closed: boolean
}

export interface CreateFieldRequest {
  owner_id?: number
  name: string
  slug?: string
  description?: string
  surface_type: string
  capacity: number
  address?: string
  city?: string
  latitude?: number | null
  longitude?: number | null
  is_active?: boolean
  facility_ids?: number[]
  prices?: FieldPriceInput[]
  operating_hours?: OperatingHourInput[]
}

export interface UpdateFieldRequest {
  owner_id?: number
  name: string
  slug?: string
  description?: string
  surface_type: string
  capacity: number
  address?: string
  city?: string
  latitude?: number | null
  longitude?: number | null
  is_active?: boolean
  facility_ids?: number[]
  prices?: FieldPriceInput[]
  operating_hours?: OperatingHourInput[]
}

export interface FieldStatusResponse {
  id: number
  is_active: boolean
  upcoming_bookings_count: number
}

export interface FacilityRequest {
  name: string
  icon: string
}
