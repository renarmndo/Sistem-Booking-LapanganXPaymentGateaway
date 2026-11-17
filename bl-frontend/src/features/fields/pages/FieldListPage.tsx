import { useEffect, useMemo, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { PageHeader } from '@/components/layout'
import { SearchInput } from '@/components/shared'
import { Badge, Button, Card, Modal } from '@/components/ui'
import { useDebounce } from '@/hooks/useDebounce'
import { FieldGrid } from '../components/FieldGrid'
import { FilterPanel, type FieldFilterValues } from '../components/FilterPanel'
import { SortSelect, type FieldSortValue } from '../components/SortSelect'
import { useFacilities, useFields } from '../hooks/useFields'
import type { ListFieldsParams } from '../types/field.types'

function parseNumberList(raw: string | null): number[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isInteger(n) && n > 0)
}

function parsePositiveInt(raw: string | null, fallback: number): number {
  if (!raw) return fallback
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

export function FieldListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)

  const urlQuery = searchParams.get('q') ?? ''
  const [searchInput, setSearchInput] = useState(urlQuery)
  const debouncedSearch = useDebounce(searchInput, 400)

  useEffect(() => {
    if (debouncedSearch === urlQuery) return
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (debouncedSearch.trim()) {
          next.set('q', debouncedSearch.trim())
        } else {
          next.delete('q')
        }
        next.delete('page')
        return next
      },
      { replace: true },
    )
  }, [debouncedSearch, urlQuery, setSearchParams])

  const filterValues: FieldFilterValues = useMemo(
    () => ({
      surface_type: searchParams.get('surface_type') ?? '',
      min_price: searchParams.get('min_price') ?? '',
      max_price: searchParams.get('max_price') ?? '',
      facility_ids: parseNumberList(searchParams.get('facility_ids')),
    }),
    [searchParams],
  )

  const rawSort = searchParams.get('sort')
  const sort: FieldSortValue =
    rawSort === 'price_asc' || rawSort === 'price_desc' ? rawSort : 'popular'
  const page = parsePositiveInt(searchParams.get('page'), 1)

  const queryParams: ListFieldsParams = useMemo(
    () => ({
      q: urlQuery || undefined,
      surface_type: filterValues.surface_type || undefined,
      min_price: filterValues.min_price ? Number(filterValues.min_price) : undefined,
      max_price: filterValues.max_price ? Number(filterValues.max_price) : undefined,
      facility_ids:
        filterValues.facility_ids.length > 0 ? filterValues.facility_ids : undefined,
      sort,
      page,
      limit: 9,
    }),
    [urlQuery, filterValues, sort, page],
  )

  const fieldsQuery = useFields(queryParams)
  const facilitiesQuery = useFacilities()

  const updateFilters = (nextValues: FieldFilterValues) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (nextValues.surface_type) next.set('surface_type', nextValues.surface_type)
      else next.delete('surface_type')

      if (nextValues.min_price) next.set('min_price', nextValues.min_price)
      else next.delete('min_price')

      if (nextValues.max_price) next.set('max_price', nextValues.max_price)
      else next.delete('max_price')

      if (nextValues.facility_ids.length > 0) {
        next.set('facility_ids', nextValues.facility_ids.join(','))
      } else {
        next.delete('facility_ids')
      }
      next.delete('page')
      return next
    })
  }

  const updateSort = (nextSort: FieldSortValue) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (nextSort === 'popular') next.delete('sort')
      else next.set('sort', nextSort)
      next.delete('page')
      return next
    })
  }

  const updatePage = (nextPage: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (nextPage <= 1) next.delete('page')
      else next.set('page', String(nextPage))
      return next
    })
  }

  const resetAll = () => {
    setSearchInput('')
    setSearchParams({})
  }

  const total = fieldsQuery.data?.meta.total ?? 0
  const activeFilterCount =
    (filterValues.surface_type ? 1 : 0) +
    (filterValues.min_price || filterValues.max_price ? 1 : 0) +
    filterValues.facility_ids.length

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="Daftar Lapangan"
        subtitle="Pilih lapangan yang sesuai dengan format pertandingan dan fasilitas tim Anda."
        breadcrumbs={[{ label: 'Beranda', to: PATHS.HOME }, { label: 'Lapangan' }]}
        showBack
      />

      {/* Top Search + Sort + Mobile Filter Trigger */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Cari nama lapangan..."
          className="min-w-0 flex-1"
        />
        <Button
          variant="secondary"
          size="md"
          onClick={() => setMobileFilterOpen(true)}
          className="lg:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          <span>Filter</span>
          {activeFilterCount > 0 && (
            <Badge variant="primary" size="sm">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
        <div className="w-full sm:w-56">
          <SortSelect value={sort} onChange={updateSort} />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-fg-muted">
        <span className="font-mono">
          {fieldsQuery.isLoading ? 'Memuat...' : `${total} lapangan tersedia`}
        </span>
        {(urlQuery || activeFilterCount > 0) && (
          <button
            type="button"
            onClick={resetAll}
            className="font-semibold text-primary-700 hover:underline"
          >
            Hapus Semua Filter
          </button>
        )}
      </div>

      {/* Main Content: Desktop Sidebar + Field Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        <aside className="hidden lg:col-span-3 lg:block">
          <Card padding="md" className="sticky top-20">
            <FilterPanel
              values={filterValues}
              facilities={facilitiesQuery.data ?? []}
              onChange={updateFilters}
              onReset={resetAll}
            />
          </Card>
        </aside>

        <div className="lg:col-span-9">
          <FieldGrid
            items={fieldsQuery.data?.items ?? []}
            meta={fieldsQuery.data?.meta}
            isLoading={fieldsQuery.isLoading}
            isError={fieldsQuery.isError}
            onRetry={() => void fieldsQuery.refetch()}
            onResetFilters={resetAll}
            onPageChange={updatePage}
          />
        </div>
      </div>

      {/* Mobile Filter Bottom Sheet */}
      <Modal
        open={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        title="Filter Lapangan"
      >
        <FilterPanel
          values={filterValues}
          facilities={facilitiesQuery.data ?? []}
          onChange={updateFilters}
          onReset={() => {
            resetAll()
            setMobileFilterOpen(false)
          }}
        />
      </Modal>
    </div>
  )
}

export default FieldListPage
