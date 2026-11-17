import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { PageHeader } from './PageHeader'

describe('PageHeader', () => {
  it('renders breadcrumb navigation visibly without any back button', () => {
    render(
      <MemoryRouter>
        <PageHeader
          title="Daftar Lapangan"
          subtitle="Pilih lapangan terbaik sesuai jadwal."
          breadcrumbs={[
            { label: 'Beranda', to: '/' },
            { label: 'Lapangan' },
          ]}
        />
      </MemoryRouter>,
    )

    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(nav).toBeInTheDocument()
    expect(nav.className).not.toContain('hidden')
    expect(screen.getByRole('link', { name: 'Beranda' })).toHaveAttribute('href', '/')
    expect(screen.getByText('Lapangan')).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('button', { name: /kembali/i })).not.toBeInTheDocument()
  })
})
