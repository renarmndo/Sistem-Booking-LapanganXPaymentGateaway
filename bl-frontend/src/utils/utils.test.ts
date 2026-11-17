import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { cn } from '@/utils/cn'
import { getErrorMessage, getFieldErrors } from '@/utils/error'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate, formatDateTime } from '@/utils/formatDate'
import { formatTime, formatTimeRange } from '@/utils/formatTime'

describe('cn', () => {
  it('merges conditional and conflicting tailwind classes', () => {
    const isHidden = false
    expect(cn('px-2 py-1', isHidden && 'hidden', 'px-4')).toBe('py-1 px-4')
  })
})

describe('formatCurrency', () => {
  it('formats positive, zero, negative, and invalid numbers in IDR', () => {
    expect(formatCurrency(150000)).toBe('Rp 150.000')
    expect(formatCurrency(0)).toBe('Rp 0')
    expect(formatCurrency(-25000)).toBe('-Rp 25.000')
    expect(formatCurrency(Number.NaN)).toBe('Rp 0')
  })
})

describe('formatDate & formatDateTime', () => {
  it('formats Indonesian dates in WIB', () => {
    expect(formatDate('2026-11-17T05:00:00Z')).toBe('17 November 2026')
    expect(formatDate('2026-11-17T05:00:00Z', { includeDay: true, shortMonth: true })).toBe(
      'Selasa, 17 Nov 2026',
    )
    expect(formatDateTime('2026-11-17T07:30:00Z')).toBe('17 Nov 2026, 14:30 WIB')
    expect(formatDate('invalid-date')).toBe('-')
  })
})

describe('formatTime & formatTimeRange', () => {
  it('formats time strings and ISO timestamps in WIB', () => {
    expect(formatTime('08:00:00')).toBe('08:00')
    expect(formatTime('19:30')).toBe('19:30')
    expect(formatTime('2026-11-17T07:45:00Z')).toBe('14:45')
    expect(formatTimeRange('08:00', '10:00')).toBe('08:00 - 10:00 WIB')
    expect(formatTimeRange('08:00', '10:00', false)).toBe('08:00 - 10:00')
    expect(formatTimeRange('invalid', '10:00')).toBe('-')
  })
})

describe('error utils', () => {
  it('extracts API message and field errors from AxiosError', () => {
    const axiosErr = new AxiosError(
      'Request failed',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 400,
        statusText: 'Bad Request',
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
        data: {
          success: false,
          message: 'Data tidak valid',
          errors: [
            { field: 'email', message: 'Format email tidak valid' },
            { field: 'password', message: 'Nilai terlalu pendek' },
          ],
        },
      },
    )

    expect(getErrorMessage(axiosErr)).toBe('Data tidak valid')
    expect(getFieldErrors(axiosErr)).toEqual({
      email: 'Format email tidak valid',
      password: 'Nilai terlalu pendek',
    })
  })

  it('handles generic errors and fallbacks', () => {
    expect(getErrorMessage(new Error('Boom'))).toBe('Boom')
    expect(getErrorMessage(null, 'Fallback pesan')).toBe('Fallback pesan')
    expect(getFieldErrors(new Error('Not axios'))).toEqual({})
  })
})
