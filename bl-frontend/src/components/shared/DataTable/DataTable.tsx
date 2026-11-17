import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Card, Pagination } from '@/components/ui'
import { cn } from '@/utils/cn'
import { EmptyState } from '../EmptyState'
import { LoadingState } from '../LoadingState'
import type { DataTableProps } from './DataTable.types'

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  sortKey,
  sortDir,
  onSort,
  page,
  totalPages,
  totalItems,
  onPageChange,
  limit,
  limitOptions = [10, 20, 50],
  onLimitChange,
  loading = false,
  emptyTitle = 'Belum ada data',
  emptyDescription = 'Data akan muncul di sini setelah tersedia.',
  className,
}: DataTableProps<T>) {
  if (loading) {
    return <LoadingState variant="list" count={4} className={className} />
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} className={className} />
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Desktop Table (md and up: >= 768px) */}
      <div className="hidden overflow-x-auto rounded-lg border border-line bg-surface shadow-xs md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-alt">
              {columns.map((col) => {
                const isSorted = sortKey === col.key
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={
                      isSorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                    className={cn(
                      'px-4 py-3 text-xs font-semibold tracking-wider text-fg-muted uppercase',
                      col.className,
                    )}
                  >
                    {col.sortable && onSort ? (
                      <button
                        type="button"
                        onClick={() => onSort(col.key)}
                        className="inline-flex items-center gap-1.5 hover:text-ink"
                      >
                        <span>{col.header}</span>
                        {isSorted ? (
                          sortDir === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.map((row) => (
              <tr key={keyExtractor(row)} className="h-[52px] transition-colors hover:bg-primary-50/50">
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3 text-fg', col.className)}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards (< 768px) */}
      <div className="space-y-3 md:hidden" data-testid="datatable-mobile-cards">
        {data.map((row) => (
          <Card key={keyExtractor(row)} padding="sm" className="space-y-2.5">
            {columns
              .filter((col) => !col.hideOnMobile)
              .map((col) => (
                <div key={col.key} className="flex items-start justify-between gap-4 text-sm">
                  <span className="text-xs font-semibold text-fg-muted uppercase">
                    {col.header}
                  </span>
                  <div className="text-right text-fg">{col.render(row)}</div>
                </div>
              ))}
          </Card>
        ))}
      </div>

      {(onLimitChange || (page !== undefined && totalPages !== undefined && onPageChange)) && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-line pt-3 sm:flex-row">
          <div className="flex flex-wrap items-center gap-3 text-xs text-fg-muted">
            {limit !== undefined && onLimitChange && (
              <label className="inline-flex items-center gap-2">
                <span>Tampilkan</span>
                <select
                  aria-label="Jumlah data per halaman"
                  value={limit}
                  onChange={(e) => onLimitChange(Number(e.target.value))}
                  className="h-8 rounded-md border border-line bg-surface px-2 text-xs font-medium text-ink focus:border-primary-700 focus:outline-none"
                >
                  {limitOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <span>data</span>
              </label>
            )}
            {totalItems !== undefined && (
              <span>
                Total <strong className="font-semibold text-ink">{totalItems}</strong> data
                {page !== undefined && totalPages !== undefined && totalPages > 0
                  ? ` · Halaman ${page} dari ${totalPages}`
                  : ''}
              </span>
            )}
          </div>
          {page !== undefined && totalPages !== undefined && onPageChange && (
            <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
          )}
        </div>
      )}
    </div>
  )
}
