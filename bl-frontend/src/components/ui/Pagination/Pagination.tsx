import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { PaginationProps } from './Pagination.types'

function buildPages(current: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages: Array<number | 'ellipsis'> = [1]
  if (current > 3) pages.push('ellipsis')
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let p = start; p <= end; p++) {
    pages.push(p)
  }
  if (current < total - 2) pages.push('ellipsis')
  pages.push(total)
  return pages
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null

  const items = buildPages(page, totalPages)

  return (
    <nav aria-label="Paginasi" className={cn('flex flex-wrap items-center justify-center gap-1.5', className)}>
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="inline-flex h-9 items-center gap-1 rounded-md border border-line bg-surface px-3 text-xs font-medium text-fg transition hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Sebelumnya</span>
      </button>

      {items.map((item, idx) =>
        item === 'ellipsis' ? (
          <span key={`e-${idx}`} className="px-2 text-xs text-fg-muted">
            &hellip;
          </span>
        ) : (
          <button
            key={item}
            type="button"
            aria-current={item === page ? 'page' : undefined}
            onClick={() => onPageChange(item)}
            className={cn(
              'h-9 min-w-9 rounded-md px-2.5 font-mono text-xs font-semibold transition',
              item === page
                ? 'bg-primary-950 text-surface'
                : 'border border-line bg-surface text-fg hover:bg-surface-alt',
            )}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="inline-flex h-9 items-center gap-1 rounded-md border border-line bg-surface px-3 text-xs font-medium text-fg transition hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="hidden sm:inline">Selanjutnya</span>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </nav>
  )
}
