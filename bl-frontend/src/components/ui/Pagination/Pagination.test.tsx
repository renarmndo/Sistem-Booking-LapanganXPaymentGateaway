import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('renders page numbers and navigates on click', () => {
    const onPageChange = vi.fn()
    render(<Pagination page={2} totalPages={5} onPageChange={onPageChange} />)

    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page')
    fireEvent.click(screen.getByRole('button', { name: '3' }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })
})
