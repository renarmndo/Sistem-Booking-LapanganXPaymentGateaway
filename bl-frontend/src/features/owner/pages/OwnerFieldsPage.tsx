import { PATHS } from '@/app/router/paths'
import { PageHeader } from '@/components/layout'
import { CurrencyText, PageLoader } from '@/components/shared'
import { Badge, Card, CardBody, PitchPattern } from '@/components/ui'
import { useOwnerFields } from '../hooks/useOwner'

export function OwnerFieldsPage() {
  const fieldsQuery = useOwnerFields()

  if (fieldsQuery.isLoading) {
    return <PageLoader label="Memuat daftar lapangan Noel Futsal..." />
  }

  const fields = fieldsQuery.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lapangan Noel Futsal (Read-Only)"
        subtitle="Ringkasan performa pendapatan dan utilisasi bulan berjalan untuk setiap lapangan milik Anda."
        breadcrumbs={[
          { label: 'Dashboard', to: PATHS.OWNER_DASHBOARD },
          { label: 'Lapangan Saya' },
        ]}
      />

      {fields.length === 0 ? (
        <Card>
          <CardBody className="py-10 text-center text-sm text-fg-muted">
            Belum ada lapangan yang tertaut ke akun Owner ini.
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((field) => (
            <Card key={field.id} className="overflow-hidden">
              <div className="h-36 w-full bg-surface-alt">
                {field.cover_url ? (
                  <img src={field.cover_url} alt={field.name} className="h-full w-full object-cover" />
                ) : (
                  <PitchPattern variant="lines" className="h-full w-full" />
                )}
              </div>
              <CardBody className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display text-base font-bold text-ink">{field.name}</h3>
                    <p className="text-xs text-fg-muted">
                      {field.surface_type} &middot; {field.capacity} pemain
                    </p>
                  </div>
                  <Badge variant={field.is_active ? 'success' : 'neutral'} size="sm">
                    {field.is_active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-md bg-surface-alt p-2.5 text-xs">
                  <div>
                    <p className="text-fg-muted">Pendapatan Bulan Ini</p>
                    <CurrencyText value={field.month_revenue} className="font-bold text-ink" />
                  </div>
                  <div>
                    <p className="text-fg-muted">Utilisasi Bulan Ini</p>
                    <p className="font-bold text-primary-900">{field.month_utilization}%</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default OwnerFieldsPage
