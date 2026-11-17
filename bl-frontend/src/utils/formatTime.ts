const WIB_TIMEZONE = 'Asia/Jakarta'
const TIME_STRING_RE = /^(\d{2}):(\d{2})(?::\d{2})?$/

export function formatTime(input: Date | string | number): string {
  if (typeof input === 'string') {
    const match = TIME_STRING_RE.exec(input.trim())
    if (match) {
      return `${match[1]}:${match[2]}`
    }
  }

  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WIB_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace('.', ':')
}

export function formatTimeRange(
  start: Date | string | number,
  end: Date | string | number,
  withZone = true,
): string {
  const startText = formatTime(start)
  const endText = formatTime(end)
  if (startText === '-' || endText === '-') {
    return '-'
  }
  return withZone ? `${startText} - ${endText} WIB` : `${startText} - ${endText}`
}
