import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Checkbox } from './Checkbox'

describe('Checkbox', () => {
  it('toggles checked state when clicked', () => {
    render(<Checkbox label="Setuju syarat & ketentuan" />)
    const box = screen.getByRole('checkbox', { name: 'Setuju syarat & ketentuan' })
    expect(box).not.toBeChecked()
    fireEvent.click(box)
    expect(box).toBeChecked()
  })
})
