import { CurrencyText } from '@/components/shared'
import { Badge, Card } from '@/components/ui'
import type { FieldPrice, OperatingHour } from '../types/field.types'

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

const DAY_TYPE_LABELS: Record<FieldPrice['day_type'], string> = {
  weekday: 'Hari Kerja (Sen–Jum)',
  weekend: 'Akhir Pekan (Sab–Min)',
  holiday: 'Hari Libur',
}

export interface PriceInfoProps {
  prices: FieldPrice[]
  operatingHours: OperatingHour[]
}

export function PriceInfo({ prices, operatingHours }: PriceInfoProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card padding="md" className="space-y-3">
        <h3 className="font-display text-base font-bold text-ink">Daftar Tarif per Jam</h3>
        {prices.length === 0 ? (
          <p className="text-sm text-fg-muted">Tarif belum dikonfigurasi.</p>
        ) : (
          <div className="divide-y divide-line">
            {prices.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                <div>
                  <p className="font-medium text-ink">{DAY_TYPE_LABELS[p.day_type]}</p>
                  <p className="font-mono text-xs text-fg-muted">
                    {p.start_time} – {p.end_time} WIB
                  </p>
                </div>
                <CurrencyText value={p.price_per_slot} className="font-bold text-ink" />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card padding="md" className="space-y-3">
        <h3 className="font-display text-base font-bold text-ink">Jam Operasional</h3>
        {operatingHours.length === 0 ? (
          <p className="text-sm text-fg-muted">Jam operasional belum diatur.</p>
        ) : (
          <div className="divide-y divide-line">
            {operatingHours.map((h) => (
              <div key={h.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium text-ink">{DAY_NAMES[h.day_of_week] ?? `Hari ${h.day_of_week}`}</span>
                {h.is_closed ? (
                  <Badge variant="neutral" size="sm">
                    Tutup
                  </Badge>
                ) : (
                  <span className="font-mono text-xs text-fg-muted">
                    {h.open_time} – {h.close_time} WIB
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
