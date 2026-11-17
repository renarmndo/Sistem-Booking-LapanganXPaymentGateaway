import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Select } from './Select'

describe('Select', () => {
  it('renders options list', () => {
    render(
      <Select
        aria-label="Jenis Rumput"
        defaultValue="sintetis"
        options={[
          { value: 'sintetis', label: 'Rumput Sintetis' },
          { value: 'alami', label: 'Rumput Alami' },
        ]}
      />,
    )
    expect(screen.getByRole('combobox', { name: 'Jenis Rumput' })).toHaveValue('sintetis')
    expect(screen.getByRole('option', { name: 'Rumput Alami' })).toBeInTheDocument()
  })
})
