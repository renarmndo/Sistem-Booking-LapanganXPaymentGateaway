import { Button, Checkbox, Input } from '@/components/ui'
import { cn } from '@/utils/cn'
import type { Facility } from '../types/field.types'

export interface FieldFilterValues {
  surface_type: string
  min_price: string
  max_price: string
  facility_ids: number[]
}

export interface FilterPanelProps {
  values: FieldFilterValues
  facilities: Facility[]
  onChange: (next: FieldFilterValues) => void
  onReset: () => void
  className?: string
}

const SURFACE_OPTIONS = [
  { value: '', label: 'Semua Jenis Rumput' },
  { value: 'Sintetis', label: 'Rumput Sintetis' },
  { value: 'Alami', label: 'Rumput Alami' },
]

export function FilterPanel({
  values,
  facilities,
  onChange,
  onReset,
  className,
}: FilterPanelProps) {
  const toggleFacility = (id: number) => {
    const exists = values.facility_ids.includes(id)
    const nextIds = exists
      ? values.facility_ids.filter((item) => item !== id)
      : [...values.facility_ids, id]
    onChange({ ...values, facility_ids: nextIds })
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between border-b border-line pb-3">
        <h2 className="font-display text-base font-bold text-ink">Filter Lapangan</h2>
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-semibold text-primary-700 hover:underline"
        >
          Reset Semua
        </button>
      </div>

      <div className="space-y-2.5">
        <p className="font-mono text-[11px] font-semibold text-fg-muted uppercase">
          Jenis Rumput
        </p>
        <div className="flex flex-wrap gap-2">
          {SURFACE_OPTIONS.map((opt) => {
            const active = values.surface_type === opt.value
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => onChange({ ...values, surface_type: opt.value })}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                  active
                    ? 'border-primary-950 bg-primary-950 text-surface'
                    : 'border-line-strong bg-surface text-fg hover:bg-surface-alt',
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2.5">
        <p className="font-mono text-[11px] font-semibold text-fg-muted uppercase">
          Tarif Sewa / Jam (Rp)
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            min={0}
            placeholder="Min"
            aria-label="Harga minimum"
            value={values.min_price}
            onChange={(e) => onChange({ ...values, min_price: e.target.value })}
          />
          <Input
            type="number"
            min={0}
            placeholder="Maks"
            aria-label="Harga maksimum"
            value={values.max_price}
            onChange={(e) => onChange({ ...values, max_price: e.target.value })}
          />
        </div>
      </div>

      {facilities.length > 0 && (
        <div className="space-y-2.5">
          <p className="font-mono text-[11px] font-semibold text-fg-muted uppercase">
            Fasilitas Arena
          </p>
          <div className="space-y-2">
            {facilities.map((fac) => (
              <Checkbox
                key={fac.id}
                label={fac.name}
                checked={values.facility_ids.includes(fac.id)}
                onChange={() => toggleFacility(fac.id)}
              />
            ))}
          </div>
        </div>
      )}

      <Button variant="secondary" size="sm" fullWidth onClick={onReset}>
        Reset Filter
      </Button>
    </div>
  )
}
