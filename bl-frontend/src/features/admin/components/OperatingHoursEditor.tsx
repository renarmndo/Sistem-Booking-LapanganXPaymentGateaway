import { Button, Input } from '@/components/ui'
import type { OperatingHourInput } from '../types/admin.types'

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export interface OperatingHoursEditorProps {
  value: OperatingHourInput[]
  onChange: (next: OperatingHourInput[]) => void
  error?: string
}

export function OperatingHoursEditor({ value, onChange, error }: OperatingHoursEditorProps) {
  const updateDay = (dayIndex: number, patch: Partial<OperatingHourInput>) => {
    onChange(value.map((item, idx) => (idx === dayIndex ? { ...item, ...patch } : item)))
  }

  const applyFirstOpenToAll = () => {
    const template = value.find((h) => !h.is_closed) ?? value[0]
    if (!template) return
    onChange(
      value.map((item) => ({
        ...item,
        open_time: template.open_time,
        close_time: template.close_time,
        is_closed: false,
      })),
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-base font-bold text-ink">Jam Operasional (7 Hari)</h3>
          <p className="text-xs text-fg-muted">
            Tentukan jam buka dan tutup lapangan untuk setiap hari dalam seminggu.
          </p>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={applyFirstOpenToAll}>
          Samakan Semua Hari
        </Button>
      </div>

      {error && <p className="text-xs font-medium text-danger">{error}</p>}

      <div className="divide-y divide-line rounded-lg border border-line bg-surface">
        {value.map((item, idx) => (
          <div
            key={item.day_of_week}
            className="grid items-center gap-3 p-3 sm:grid-cols-12"
          >
            <span className="text-sm font-semibold text-ink sm:col-span-3">
              {DAY_NAMES[item.day_of_week] ?? `Hari ${item.day_of_week}`}
            </span>

            <div className="sm:col-span-3">
              <Input
                type="time"
                aria-label={`Jam buka ${DAY_NAMES[item.day_of_week]}`}
                value={item.open_time}
                disabled={item.is_closed}
                onChange={(e) => updateDay(idx, { open_time: e.target.value })}
              />
            </div>

            <div className="sm:col-span-3">
              <Input
                type="time"
                aria-label={`Jam tutup ${DAY_NAMES[item.day_of_week]}`}
                value={item.close_time}
                disabled={item.is_closed}
                onChange={(e) => updateDay(idx, { close_time: e.target.value })}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-fg sm:col-span-3">
              <input
                type="checkbox"
                checked={item.is_closed}
                onChange={(e) => updateDay(idx, { is_closed: e.target.checked })}
                className="h-4 w-4 rounded border-line-strong text-primary-700"
              />
              <span>Hari Tutup</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}
