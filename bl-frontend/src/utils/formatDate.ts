const WIB_TIMEZONE = 'Asia/Jakarta'

export interface FormatDateOptions {
  includeDay?: boolean
  shortMonth?: boolean
}

function toDate(input: Date | string | number): Date | null {
  const date = input instanceof Date ? input : new Date(input)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(
  input: Date | string | number,
  options: FormatDateOptions = {},
): string {
  const date = toDate(input)
  if (!date) return '-'

  const { includeDay = false, shortMonth = false } = options
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WIB_TIMEZONE,
    weekday: includeDay ? 'long' : undefined,
    day: 'numeric',
    month: shortMonth ? 'short' : 'long',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(input: Date | string | number): string {
  const date = toDate(input)
  if (!date) return '-'

  const datePart = formatDate(date, { shortMonth: true })
  const timePart = new Intl.DateTimeFormat('id-ID', {
    timeZone: WIB_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace('.', ':')

  return `${datePart}, ${timePart} WIB`
}
