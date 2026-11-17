import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Textarea } from './Textarea'

describe('Textarea', () => {
  it('renders textarea with error state', () => {
    render(<Textarea placeholder="Catatan" error />)
    expect(screen.getByPlaceholderText('Catatan')).toHaveAttribute('aria-invalid', 'true')
  })
})
