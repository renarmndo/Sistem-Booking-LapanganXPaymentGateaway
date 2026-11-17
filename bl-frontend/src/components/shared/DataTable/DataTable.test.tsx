import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DataTable } from './DataTable'

interface Row {
  id: number
  name: string
  price: number
}

describe('DataTable', () => {
  it('renders desktop table, mobile card container, and triggers sort', () => {
    const onSort = vi.fn()
    const rows: Row[] = [
      { id: 1, name: 'Arena A', price: 175000 },
      { id: 2, name: 'Arena B', price: 200000 },
    ]

    render(
      <DataTable
        data={rows}
        keyExtractor={(r) => r.id}
        sortKey="name"
        sortDir="asc"
        onSort={onSort}
        columns={[
          { key: 'name', header: 'Nama', sortable: true, render: (r) => r.name },
          { key: 'price', header: 'Tarif', render: (r) => `Rp ${r.price}` },
        ]}
      />,
    )

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByTestId('datatable-mobile-cards')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Nama/i }))
    expect(onSort).toHaveBeenCalledWith('name')
  })
})
