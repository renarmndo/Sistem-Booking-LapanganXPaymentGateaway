import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Input } from '../Input'
import { FormField } from './FormField'

describe('FormField', () => {
  it('renders label, hint, and error message', () => {
    const { rerender } = render(
      <FormField label="Email" htmlFor="email" hint="Gunakan email aktif" required>
        <Input id="email" />
      </FormField>,
    )
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument()
    expect(screen.getByText('Gunakan email aktif')).toBeInTheDocument()

    rerender(
      <FormField label="Email" htmlFor="email" error="Format email tidak valid">
        <Input id="email" error />
      </FormField>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Format email tidak valid')
    expect(screen.queryByText('Gunakan email aktif')).not.toBeInTheDocument()
  })
})
