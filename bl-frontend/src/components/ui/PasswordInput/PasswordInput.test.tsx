import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PasswordInput } from './PasswordInput'

describe('PasswordInput', () => {
  it('forwards ref to the underlying input', () => {
    const ref = createRef<HTMLInputElement>()
    render(<PasswordInput ref={ref} placeholder="Kata sandi" />)

    expect(ref.current).toBe(screen.getByPlaceholderText('Kata sandi'))
  })

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
