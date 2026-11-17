import { Plus, Trash2 } from 'lucide-react'
import { Button, Input, Select } from '@/components/ui'
import type { FieldPriceInput } from '../types/admin.types'

export interface PriceRuleEditorProps {
  value: FieldPriceInput[]
  onChange: (next: FieldPriceInput[]) => void
  error?: string
}

const DAY_TYPE_OPTIONS = [
  { value: 'weekday', label: 'Hari Kerja (Senin-Jumat)' },
  { value: 'weekend', label: 'Akhir Pekan (Sabtu-Minggu)' },
  { value: 'holiday', label: 'Hari Libur Nasional' },
]

export function PriceRuleEditor({ value, onChange, error }: PriceRuleEditorProps) {
  const addRule = () => {
    onChange([
      ...value,
      { day_type: 'weekday', start_time: '17:00', end_time: '23:00', price_per_slot: 300000 },
    ])
  }

  const removeRule = (index: number) => {
    if (value.length <= 1) return
    onChange(value.filter((_, idx) => idx !== index))
  }

  const updateRule = (index: number, patch: Partial<FieldPriceInput>) => {
    onChange(value.map((row, idx) => (idx === index ? { ...row, ...patch } : row)))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-bold text-ink">Aturan Tarif per Jam</h3>
          <p className="text-xs text-fg-muted">
            Atur tarif berdasarkan tipe hari dan rentang jam bermain.
          </p>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={addRule}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tambah Aturan
        </Button>
      </div>

      {error && <p className="text-xs font-medium text-danger">{error}</p>}

      <div className="space-y-2.5">
        {value.map((rule, idx) => (
          <div
            key={idx}
            className="grid gap-3 rounded-lg border border-line bg-surface-alt/50 p-3 sm:grid-cols-12 sm:items-end"
          >
            <div className="sm:col-span-4">
              <label className="mb-1 block text-xs font-medium text-fg-muted">Tipe Hari</label>
              <Select
                options={DAY_TYPE_OPTIONS}
                value={rule.day_type}
                onChange={(e) =>
                  updateRule(idx, { day_type: e.target.value as FieldPriceInput['day_type'] })
                }
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-fg-muted">Mulai</label>
              <Input
                type="time"
                value={rule.start_time}
                onChange={(e) => updateRule(idx, { start_time: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-fg-muted">Selesai</label>
              <Input
                type="time"
                value={rule.end_time}
                onChange={(e) => updateRule(idx, { end_time: e.target.value })}
              />
            </div>

            <div className="sm:col-span-3">
              <label className="mb-1 block text-xs font-medium text-fg-muted">Tarif (Rp)</label>
              <Input
                type="number"
                min={1000}
                step={5000}
                value={rule.price_per_slot}
                onChange={(e) =>
                  updateRule(idx, { price_per_slot: Number(e.target.value) || 0 })
                }
              />
            </div>

            <div className="flex justify-end sm:col-span-1">
              <Button
                type="button"
                size="sm"
                variant="danger"
                disabled={value.length <= 1}
                aria-label={`Hapus aturan harga ${idx + 1}`}
                onClick={() => removeRule(idx)}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
