export interface ApiFieldError {
  field: string
  message: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  code?: string
  data: T
  errors?: ApiFieldError[] | null
}

export interface ApiError {
  success: false
  message: string
  code?: string
  errors?: ApiFieldError[] | null
}

export interface PaginationMeta {
  page: number
  per_page: number
  total: number
  total_pages: number
}

export interface Paginated<T> {
  items: T[]
  meta: PaginationMeta
}

export type PaginatedResponse<T> = ApiResponse<Paginated<T>>
