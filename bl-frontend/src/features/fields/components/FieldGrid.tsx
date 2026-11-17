import { EmptyState, ErrorState, LoadingState } from '@/components/shared'
import { Button, Pagination } from '@/components/ui'
import type { PaginationMeta } from '@/types/api.types'
import type { FieldSummary } from '../types/field.types'
import { FieldCard } from './FieldCard'

export interface FieldGridProps {
  items: FieldSummary[]
  meta?: PaginationMeta
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  onResetFilters: () => void
  onPageChange: (page: number) => void
}

export function FieldGrid({
  items,
  meta,
  isLoading,
  isError,
  onRetry,
  onResetFilters,
  onPageChange,
}: FieldGridProps) {
  if (isLoading) {
    return <LoadingState variant="cards" count={6} label="Memuat daftar lapangan..." />
  }

  if (isError) {
    return (
      <ErrorState
        message="Gagal memuat daftar lapangan. Silakan coba lagi."
        onRetry={onRetry}
      />
    )
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Tidak ada lapangan yang cocok"
        description="Coba ubah kata kunci atau reset filter untuk melihat semua lapangan yang tersedia."
        action={
          <Button variant="secondary" size="sm" onClick={onResetFilters}>
            Reset Filter
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((field) => (
          <FieldCard key={field.id} field={field} layout="responsive" />
        ))}
      </div>

      {meta && meta.total_pages > 1 && (
        <Pagination
          page={meta.page}
          totalPages={meta.total_pages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  )
}
