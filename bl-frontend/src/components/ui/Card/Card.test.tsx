import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Card, CardBody, CardFooter, CardHeader } from './Card'

describe('Card', () => {
  it('renders card sections', () => {
    render(
      <Card interactive>
        <CardHeader>Judul</CardHeader>
        <CardBody>Konten</CardBody>
        <CardFooter>Aksi</CardFooter>
      </Card>,
    )
    expect(screen.getByText('Judul')).toBeInTheDocument()
    expect(screen.getByText('Konten')).toBeInTheDocument()
    expect(screen.getByText('Aksi')).toBeInTheDocument()
  })
})
