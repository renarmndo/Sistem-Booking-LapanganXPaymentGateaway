import type { ComponentPropsWithoutRef, ReactNode } from 'react'

export interface BreadcrumbProps extends ComponentPropsWithoutRef<'nav'> {
  separator?: ReactNode
}

export interface BreadcrumbLinkProps extends ComponentPropsWithoutRef<'a'> {
  asChild?: boolean
}
