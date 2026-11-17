import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SearchInput } from './SearchInput'

describe('SearchInput', () => {
  it('calls onChange on typing and clears when clear button is clicked', () => {
    const onChange = vi.fn()
    render(<SearchInput value="Arena" onChange={onChange} />)

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Stadion' } })
    expect(onChange).toHaveBeenCalledWith('Stadion')

    fireEvent.click(screen.getByRole('button', { name: 'Hapus pencarian' }))
    expect(onChange).toHaveBeenCalledWith('')
  })
})
