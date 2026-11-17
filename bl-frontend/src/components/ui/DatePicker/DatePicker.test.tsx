import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DatePicker } from './DatePicker'

describe('DatePicker', () => {
  it('renders date input and handles value changes', () => {
    const onChange = vi.fn()
    render(<DatePicker aria-label="Tanggal Main" onChange={onChange} />)
    const input = screen.getByLabelText('Tanggal Main')
    fireEvent.change(input, { target: { value: '2026-11-20' } })
    expect(onChange).toHaveBeenCalled()
  })
})
