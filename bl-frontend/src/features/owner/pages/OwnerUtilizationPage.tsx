import { useState } from 'react'
import { PATHS } from '@/app/router/paths'
import { PageHeader } from '@/components/layout'
import { Card, CardBody, CardHeader, Input, Select, Skeleton } from '@/components/ui'
import { useOwnerFields, useOwnerUtilization } from '../hooks/useOwner'

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const HOURS = Array.from({ length: 15 }, (_, idx) => `${String(idx + 8).padStart(2, '0')}:00`)

function defaultRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(to.getDate() - 29)
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

function heatColor(count: number, maxCount: number) {
  if (count <= 0 || maxCount <= 0) return 'bg-surface-alt text-fg-muted'
  const ratio = count / maxCount
  if (ratio >= 0.75) return 'bg-primary-700 text-surface font-semibold'
  if (ratio >= 0.5) return 'bg-primary-500 text-surface font-semibold'
  if (ratio >= 0.25) return 'bg-primary-300 text-primary-950'
  return 'bg-primary-100 text-primary-900'
}

export function OwnerUtilizationPage() {
  const initial = defaultRange()
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [fieldId, setFieldId] = useState('')

  const fieldsQuery = useOwnerFields()
  const utilQuery = useOwnerUtilization({
    field_id: fieldId ? Number(fieldId) : undefined,
    from,
    to,
  })

  const data = utilQuery.data
  const cellMap = new Map<string, number>()
  let maxCount = 0
  ;(data?.heatmap ?? []).forEach((c) => {
    cellMap.set(`${c.day_of_week}:${c.hour}`, c.count)
    if (c.count > maxCount) maxCount = c.count
  })

  const rankedFields = [...(data?.fields ?? [])].sort(
    (a, b) => b.utilization_percent - a.utilization_percent,
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilisasi & Heatmap Lapangan"
        subtitle="Rumus: Jam Terpakai (CONFIRMED + COMPLETED) ÷ (Jam Operasional − Jam Diblokir)."
        breadcrumbs={[
          { label: 'Dashboard', to: PATHS.OWNER_DASHBOARD },
          { label: 'Utilisasi' },
        ]}
      />

      <div className="grid gap-3 rounded-lg border border-line bg-surface p-3 sm:grid-cols-3">
        <Select
          value={fieldId}
          onChange={(e) => setFieldId(e.target.value)}
          options={[
            { value: '', label: 'Semua Lapangan' },
            ...(fieldsQuery.data ?? []).map((f) => ({ value: String(f.id), label: f.name })),
          ]}
        />
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <h2 className="font-display text-base font-bold text-ink">Ranking Lapangan</h2>
            <p className="text-xs text-fg-muted">
              Rata-rata utilisasi: <strong>{data?.average_utilization ?? 0}%</strong>
            </p>
          </CardHeader>
          <CardBody className="space-y-3">
            {utilQuery.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              rankedFields.map((f, idx) => (
                <div key={f.field_id} className="rounded-md border border-line p-2.5 text-xs">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-ink">
                      #{idx + 1} {f.field_name}
                    </span>
                    <span className="text-primary-900">{f.utilization_percent}%</span>
                  </div>
                  <p className="mt-1 text-fg-muted">
                    Terpakai {f.used_hours} jam / {f.available_hours} jam tersedia (Blokir{' '}
                    {f.blocked_hours} jam)
                  </p>
                </div>
              ))
            )}

            <div className="border-t border-line pt-3">
              <p className="text-xs font-semibold text-ink">Jam Sepi (Peluang Promo)</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(data?.quiet_hours ?? []).map((h) => (
                  <span
                    key={h}
                    className="rounded border border-gold-300 bg-gold-50 px-2 py-0.5 font-mono text-xs text-gold-900"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="font-display text-base font-bold text-ink">
              Heatmap Okupansi (Hari × Jam)
            </h2>
            <p className="text-xs text-fg-muted">
              Skala warna dari sepi (abu-abu) hingga padat (hijau tua)
            </p>
          </CardHeader>
          <CardBody>
            {utilQuery.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr>
                      <th className="w-12 p-1 text-left text-fg-muted">Hari</th>
                      {HOURS.map((h) => (
                        <th key={h} className="min-w-7 p-1 text-center font-mono text-fg-muted">
                          {h.slice(0, 2)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map((dayLabel, dow) => (
                      <tr key={dayLabel}>
                        <td className="p-1 font-semibold text-ink">{dayLabel}</td>
                        {HOURS.map((h) => {
                          const count = cellMap.get(`${dow}:${h}`) ?? 0
                          return (
                            <td key={h} className="p-0.5">
                              <div
                                title={`${dayLabel} ${h}: ${count} slot`}
                                className={`flex h-7 min-w-7 items-center justify-center rounded-xs font-mono ${heatColor(count, maxCount)}`}
                              >
                                {count > 0 ? count : ''}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

export default OwnerUtilizationPage
