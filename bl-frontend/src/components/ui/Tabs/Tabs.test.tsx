import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Tabs } from './Tabs'

describe('Tabs', () => {
  it('renders tabs and calls onChange when clicked', () => {
    const onChange = vi.fn()
    render(
      <Tabs
        activeId="jadwal"
        onChange={onChange}
        items={[
          { id: 'jadwal', label: 'Jadwal' },
          { id: 'fasilitas', label: 'Fasilitas', badge: 6 },
        ]}
      />,
    )

    expect(screen.getByRole('tab', { name: 'Jadwal' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(screen.getByRole('tab', { name: /Fasilitas/i }))
    expect(onChange).toHaveBeenCalledWith('fasilitas')
  })
})
