import { CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui'
import type { Facility } from '../types/field.types'

export interface FacilityListProps {
  facilities: Facility[]
}

export function FacilityList({ facilities }: FacilityListProps) {
  if (facilities.length === 0) {
    return <p className="text-sm text-fg-muted">Belum ada informasi fasilitas.</p>
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {facilities.map((fac) => (
        <Card key={fac.id} padding="sm" className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          </div>
          <span className="text-sm font-medium text-ink">{fac.name}</span>
        </Card>
      ))}
    </div>
  )
}
