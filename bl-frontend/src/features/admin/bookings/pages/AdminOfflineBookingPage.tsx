import { useSearchParams } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { PageHeader } from '@/components/layout'
import { OfflineBookingForm } from '../components/OfflineBookingForm'

export function AdminOfflineBookingPage() {
  const [searchParams] = useSearchParams()
  const rawField = Number(searchParams.get('field_id'))
  const rawDate = searchParams.get('date') || undefined

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Buat Booking Offline"
        subtitle="Catat reservasi walk-in / telepon pelanggan Noel Futsal secara real-time."
        breadcrumbs={[
          { label: 'Dashboard', to: PATHS.ADMIN_DASHBOARD },
          { label: 'Booking', to: PATHS.ADMIN_BOOKINGS },
          { label: 'Booking Offline' },
        ]}
      />
      <OfflineBookingForm
        initialFieldId={Number.isFinite(rawField) && rawField > 0 ? rawField : undefined}
        initialDate={rawDate}
      />
    </div>
  )
}

export default AdminOfflineBookingPage
