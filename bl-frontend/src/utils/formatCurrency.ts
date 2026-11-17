const numberFormatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 0,
})

export function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) {
    return 'Rp 0'
  }
  const rounded = Math.round(amount)
  if (rounded < 0) {
    return `-Rp ${numberFormatter.format(Math.abs(rounded))}`
  }
  return `Rp ${numberFormatter.format(rounded)}`
}
