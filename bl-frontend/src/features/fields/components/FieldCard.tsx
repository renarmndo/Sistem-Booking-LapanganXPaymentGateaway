import { Link } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { CurrencyText } from '@/components/shared'
import { Badge, Button, Card, CardBody, PitchPattern } from '@/components/ui'
import { cn } from '@/utils/cn'
import type { FieldSummary } from '../types/field.types'

export interface FieldCardProps {
  field: FieldSummary
  badgeLabel?: string
  layout?: 'vertical' | 'responsive'
  className?: string
}

export function FieldCard({
  field,
  badgeLabel,
  layout = 'vertical',
  className,
}: FieldCardProps) {
  const isResponsive = layout === 'responsive'

  return (
    <Card
      padding="none"
      interactive
      className={cn(
        'group flex overflow-hidden',
        isResponsive ? 'flex-row sm:flex-col' : 'flex-col',
        className,
      )}
    >
      <Link
        to={PATHS.FIELD_DETAIL(field.id)}
        className={cn(
          'block shrink-0 overflow-hidden',
          isResponsive ? 'w-28 sm:w-full' : 'w-full',
        )}
      >
        <div
          className={cn(
            'relative overflow-hidden bg-primary-950',
            isResponsive ? 'h-full min-h-32 sm:aspect-[4/3] sm:h-auto' : 'aspect-[4/3] w-full',
          )}
        >
          {field.cover_url ? (
            <img
              src={field.cover_url}
              alt={field.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <PitchPattern variant="lines" className="h-full w-full" />
          )}
          {badgeLabel && (
            <div className="absolute top-2.5 left-2.5">
              <Badge variant="gold" size="sm">
                {badgeLabel}
              </Badge>
            </div>
          )}
        </div>
      </Link>

      <CardBody className="flex min-w-0 flex-1 flex-col justify-between p-4 sm:p-5">
        <div>
          <Link to={PATHS.FIELD_DETAIL(field.id)}>
            <h3 className="truncate font-display text-base font-bold text-ink transition-colors group-hover:text-primary-700 sm:text-lg">
              {field.name}
            </h3>
          </Link>
          <p className="mt-1 text-xs font-medium text-fg-muted">
            {field.surface_type} &middot; Kapasitas {field.capacity} pemain
          </p>
          {field.facilities.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {field.facilities.slice(0, 4).map((fac) => (
                <Badge key={fac.id} variant="neutral" size="sm">
                  {fac.name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-2 border-t border-line pt-3">
          <div>
            <p className="font-mono text-[10px] font-semibold text-fg-muted uppercase">
              Tarif Mulai
            </p>
            <CurrencyText
              value={field.min_price}
              suffix="/jam"
              className="text-base font-bold text-ink sm:text-lg"
            />
          </div>
          <Link to={PATHS.FIELD_DETAIL(field.id)}>
            <Button size="sm">Pilih Jadwal</Button>
          </Link>
        </div>
      </CardBody>
    </Card>
  )
}
