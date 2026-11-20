import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OtpInput } from './OtpInput'

function ControlledOtp({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial)
  return (
    <div>
      <OtpInput value={value} onChange={setValue} />
      <output data-testid="otp-value">{value}</output>
    </div>
  )
}

describe('OtpInput', () => {
  it('renders 6 numeric input boxes and advances focus as digits are typed', () => {
    render(<ControlledOtp />)
    const boxes = screen.getAllByRole('textbox')
    expect(boxes).toHaveLength(6)

    fireEvent.change(boxes[0], { target: { value: '1' } })
    expect(document.activeElement).toBe(boxes[1])

    fireEvent.change(boxes[1], { target: { value: '2' } })
    expect(document.activeElement).toBe(boxes[2])
    expect(screen.getByTestId('otp-value')).toHaveTextContent('12')
  })

  it('ignores non-numeric characters and supports pasting 6 digits', () => {
    render(<ControlledOtp />)
    const boxes = screen.getAllByRole('textbox')

    fireEvent.change(boxes[0], { target: { value: 'a' } })
    expect(screen.getByTestId('otp-value')).toHaveTextContent('')

    fireEvent.paste(boxes[0], {
      clipboardData: {
        getData: () => '482-910',
      },
    })
    expect(screen.getByTestId('otp-value')).toHaveTextContent('482910')
    expect(document.activeElement).toBe(boxes[5])
  })

  it('moves focus back and clears previous digit on Backspace when box is empty', () => {
    render(<ControlledOtp initial="123" />)
    const boxes = screen.getAllByRole('textbox')

    boxes[3].focus()
    fireEvent.keyDown(boxes[3], { key: 'Backspace' })
    expect(screen.getByTestId('otp-value')).toHaveTextContent('12')
    expect(document.activeElement).toBe(boxes[2])
  })
})
