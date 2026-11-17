import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Input } from './Input'

describe('Input', () => {
  it('sets aria-invalid when error is true', () => {
    render(<Input placeholder="Email" error />)
    expect(screen.getByPlaceholderText('Email')).toHaveAttribute('aria-invalid', 'true')
  })
})
