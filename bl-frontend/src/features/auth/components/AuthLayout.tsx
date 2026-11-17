import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'

export interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-bg px-4 py-12 sm:px-6">
      <div className="w-full max-w-[540px] space-y-6">
        <div className="text-center">
          <Link
            to={PATHS.HOME}
            className="inline-block font-display text-2xl font-bold tracking-tight text-ink hover:text-primary-800"
          >
            Noel Futsal
          </Link>
        </div>

        <div className="rounded-xl border border-line bg-surface p-7 shadow-sm sm:p-10">
          <div className="mb-7 space-y-1.5">
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {title}
            </h1>
            <p className="text-sm text-fg-muted sm:text-base">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
