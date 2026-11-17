import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatCard } from './StatCard'

describe('StatCard', () => {
  it('renders label, value, and trend delta', () => {
    render(
      <StatCard
        label="Pendapatan Bulan Ini"
        value="Rp 12.500.000"
        delta={{ value: '+14% vs bulan lalu', trend: 'up' }}
      />,
    )
    expect(screen.getByText('Pendapatan Bulan Ini')).toBeInTheDocument()
    expect(screen.getByText('Rp 12.500.000')).toBeInTheDocument()
    expect(screen.getByText('+14% vs bulan lalu')).toBeInTheDocument()
  })
})
