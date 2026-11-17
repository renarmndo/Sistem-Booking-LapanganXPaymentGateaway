import type { ReactNode } from 'react'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { cn } from '@/utils/cn'

export interface BreadcrumbItem {
  label: string
  to?: string
}

export interface PageHeaderProps {
  title: string
  subtitle?: string
  breadcrumbs?: BreadcrumbItem[]
  showBack?: boolean
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  showBack = false,
  actions,
  className,
}: PageHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className={cn('space-y-2', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-xs text-fg-muted sm:flex">
          {breadcrumbs.map((item, index) => (
            <span key={item.label} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
              {item.to ? (
                <Link to={item.to} className="hover:text-primary-700">
                  {item.label}
                </Link>
              ) : (
                <span className="font-medium text-fg">{item.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Kembali"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-surface text-fg hover:bg-surface-alt sm:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div>
            <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
