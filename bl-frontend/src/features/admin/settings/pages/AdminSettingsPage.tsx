import { useState, type FormEvent } from 'react'
import { PATHS } from '@/app/router/paths'
import { PageHeader } from '@/components/layout'
import { PageLoader } from '@/components/shared'
import { Button, Card, CardBody, CardHeader, FormField, Input } from '@/components/ui'
import { useAdminSettings, useUpdateAdminSettings } from '../../hooks/useAdminOps'

const SETTING_DEFAULTS: Record<string, { label: string; value: string; description: string }> = {
  'booking.payment_ttl_minutes': {
    label: 'Batas Waktu Pembayaran (Menit)',
    value: '15',
    description: 'Batas waktu pembayaran booking online dalam menit',
  },
  'booking.max_days_ahead': {
    label: 'Batas Hari Pemesanan ke Depan',
    value: '30',
    description: 'Batas maksimal hari pemesanan ke depan',
  },
  'booking.slot_minutes': {
    label: 'Durasi per Slot (Menit)',
    value: '60',
    description: 'Durasi satu slot pemesanan dalam menit',
  },
  'booking.max_hours': {
    label: 'Maksimal Jam per Booking',
    value: '4',
    description: 'Maksimal durasi jam dalam satu transaksi booking',
  },
  'booking.max_pending_per_user': {
    label: 'Maksimal Booking Pending per User',
    value: '3',
    description: 'Batas maksimal booking pending per pengguna',
  },
  'booking.cancel_full_hours': {
    label: 'Batas Jam Refund 100%',
    value: '24',
    description: 'Minimal sisa jam sebelum main untuk refund penuh',
  },
  'booking.cancel_partial_hours': {
    label: 'Batas Jam Refund Parsial',
    value: '6',
    description: 'Minimal sisa jam sebelum main untuk refund sebagian',
  },
  'booking.cancel_partial_percent': {
    label: 'Persentase Refund Parsial (%)',
    value: '50',
    description: 'Persentase pengembalian dana untuk pembatalan parsial',
  },
}

export function AdminSettingsPage() {
  const settingsQuery = useAdminSettings()
  const updateSettings = useUpdateAdminSettings()
  const [draft, setDraft] = useState<Record<string, string> | null>(null)

  if (settingsQuery.isLoading) {
    return <PageLoader label="Memuat pengaturan Noel Futsal..." />
  }

  const serverValues: Record<string, string> = {}
  Object.entries(SETTING_DEFAULTS).forEach(([k, meta]) => {
    const found = (settingsQuery.data ?? []).find((s) => s.setting_key === k)
    serverValues[k] = found?.setting_value ?? meta.value
  })
  const values = draft ?? serverValues

  const patch = (key: string, val: string) => {
    setDraft({ ...values, [key]: val })
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const payload = Object.entries(SETTING_DEFAULTS).map(([key, meta]) => ({
      key,
      value: values[key] ?? meta.value,
      description: meta.description,
    }))
    updateSettings.mutate(payload)
  }

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Pengaturan Operasional Noel Futsal"
        subtitle="Atur batas waktu pembayaran, kuota pemesanan, dan kebijakan pembatalan."
        breadcrumbs={[
          { label: 'Dashboard', to: PATHS.ADMIN_DASHBOARD },
          { label: 'Pengaturan' },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="font-display text-base font-bold text-ink">
              Aturan Pemesanan &amp; Pembayaran
            </h2>
          </CardHeader>
          <CardBody className="grid gap-4 sm:grid-cols-2">
            {[
              'booking.payment_ttl_minutes',
              'booking.max_days_ahead',
              'booking.slot_minutes',
              'booking.max_hours',
              'booking.max_pending_per_user',
            ].map((key) => (
              <FormField key={key} label={SETTING_DEFAULTS[key].label} htmlFor={key}>
                <Input
                  id={key}
                  type="number"
                  min={1}
                  value={values[key]}
                  onChange={(e) => patch(key, e.target.value)}
                />
              </FormField>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-base font-bold text-ink">
              Tabel Kebijakan Pembatalan &amp; Refund
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                'booking.cancel_full_hours',
                'booking.cancel_partial_hours',
                'booking.cancel_partial_percent',
              ].map((key) => (
                <FormField key={key} label={SETTING_DEFAULTS[key].label} htmlFor={key}>
                  <Input
                    id={key}
                    type="number"
                    min={0}
                    max={key === 'booking.cancel_partial_percent' ? 100 : undefined}
                    value={values[key]}
                    onChange={(e) => patch(key, e.target.value)}
                  />
                </FormField>
              ))}
            </div>
            <div className="rounded-md bg-surface-alt p-3 text-xs text-fg-muted">
              <p className="font-semibold text-ink">Simulasi Kebijakan Saat Ini:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                <li>≥ {values['booking.cancel_full_hours']} jam sebelum main → Refund 100%</li>
                <li>
                  {values['booking.cancel_partial_hours']}–{values['booking.cancel_full_hours']} jam
                  sebelum main → Refund {values['booking.cancel_partial_percent']}%
                </li>
                <li>&lt; {values['booking.cancel_partial_hours']} jam sebelum main → Tidak dapat refund (0%)</li>
              </ul>
            </div>
          </CardBody>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={updateSettings.isPending}>
            Simpan Pengaturan
          </Button>
        </div>
      </form>
    </div>
  )
}

export default AdminSettingsPage
