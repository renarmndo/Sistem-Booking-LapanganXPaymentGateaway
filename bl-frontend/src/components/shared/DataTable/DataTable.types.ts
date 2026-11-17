import type { ReactNode } from 'react'

export interface DataTableColumn<T> {
  key: string
  header: string
  sortable?: boolean
  render: (row: T) => ReactNode
  className?: string
  hideOnMobile?: boolean
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  keyExtractor: (row: T) => string | number
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (key: string) => void
  page?: number
  totalPages?: number
  totalItems?: number
  onPageChange?: (page: number) => void
  limit?: number
  limitOptions?: number[]
  onLimitChange?: (limit: number) => void
  loading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  className?: string
}
