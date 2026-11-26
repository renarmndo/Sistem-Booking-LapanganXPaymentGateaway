import { Link } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { CurrencyText } from '@/components/shared'
import { Badge, Button, Card, CardBody, PitchPattern } from '@/components/ui'
import { cn } from '@/utils/cn'
import type { FieldSummary } from '../types/field.types'

export interface FieldCardProps {
  field: FieldSummary
  badgeLabel?: string
  layout?: 'vertical' | 'responsive' | 'horizontal'
  className?: string
}

export function FieldCard({
  field,
  badgeLabel,
  layout = 'vertical',
  className,
}: FieldCardProps) {
  const isResponsive = layout === 'responsive'
  const isHorizontal = layout === 'horizontal'

  return (
    <Card
      padding="none"
      interactive
      className={cn(
        'group flex h-full overflow-hidden',
        isHorizontal
          ? 'flex-col sm:flex-row'
          : isResponsive
            ? 'flex-row sm:flex-col'
            : 'flex-col',
        className,
      )}
    >
      <Link
        to={PATHS.FIELD_DETAIL(field.id)}
        className={cn(
          'block shrink-0 overflow-hidden',
          isHorizontal
            ? 'w-full sm:w-64 md:w-72'
            : isResponsive
              ? 'w-28 sm:w-full'
              : 'w-full',
        )}
      >
        <div
          className={cn(
            'relative overflow-hidden bg-primary-950',
            isHorizontal
              ? 'h-48 w-full sm:h-full sm:min-h-44'
              : isResponsive
                ? 'h-full min-h-32 sm:h-48 sm:w-full'
                : 'h-48 w-full',
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

      <CardBody
        className={cn(
          'flex min-w-0 flex-1 p-4 sm:p-5',
          isHorizontal
            ? 'flex-col justify-between gap-4 sm:flex-row sm:items-center sm:gap-6'
            : 'flex-col justify-between',
        )}
      >
        <div className="min-w-0 flex-1">
          <Link to={PATHS.FIELD_DETAIL(field.id)}>
            <h3 className="truncate font-display text-base font-bold text-ink transition-colors group-hover:text-primary-700 sm:text-xl">
              {field.name}
            </h3>
          </Link>
          <p className="mt-1 text-xs font-medium text-fg-muted sm:text-sm">
            {field.surface_type} &middot; Kapasitas {field.capacity} pemain
          </p>
          {field.facilities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {field.facilities.slice(0, isHorizontal ? 6 : 4).map((fac) => (
                <Badge key={fac.id} variant="neutral" size="sm">
                  {fac.name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div
          className={cn(
            isHorizontal
              ? 'flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 sm:w-48 sm:shrink-0 sm:flex-col sm:items-end sm:justify-center sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6'
              : 'mt-4 flex flex-wrap items-end justify-between gap-2 border-t border-line pt-3',
          )}
        >
          <div className={isHorizontal ? 'sm:text-right' : undefined}>
            <p className="font-mono text-[10px] font-semibold text-fg-muted uppercase">
              Tarif Mulai
            </p>
            <CurrencyText
              value={field.min_price}
              suffix="/jam"
              className="text-base font-bold text-ink sm:text-lg"
            />
          </div>
          <Link to={PATHS.FIELD_DETAIL(field.id)} className={isHorizontal ? 'sm:w-full' : undefined}>
            <Button size="sm" fullWidth={isHorizontal}>
              Pilih Jadwal
            </Button>
          </Link>
        </div>
      </CardBody>
    </Card>
  )
}
