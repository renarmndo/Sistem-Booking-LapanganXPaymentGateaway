import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PasswordInput } from './PasswordInput'

describe('PasswordInput', () => {
  it('toggles password visibility', () => {
    render(<PasswordInput placeholder="Kata sandi" />)
    const input = screen.getByPlaceholderText('Kata sandi')
    const toggle = screen.getByRole('button', { name: 'Tampilkan kata sandi' })

    expect(input).toHaveAttribute('type', 'password')
    fireEvent.click(toggle)
    expect(input).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Sembunyikan kata sandi' })).toBeInTheDocument()
  })
})
