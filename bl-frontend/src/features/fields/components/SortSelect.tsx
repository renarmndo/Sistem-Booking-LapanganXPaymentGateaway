import { Select } from '@/components/ui'

export type FieldSortValue = 'popular' | 'price_asc' | 'price_desc'

export interface SortSelectProps {
  value: FieldSortValue
  onChange: (value: FieldSortValue) => void
  className?: string
}

export function SortSelect({ value, onChange, className }: SortSelectProps) {
  return (
    <Select
      aria-label="Urutkan lapangan"
      value={value}
      onChange={(e) => onChange(e.target.value as FieldSortValue)}
      className={className}
      options={[
        { value: 'popular', label: 'Popularitas Tertinggi' },
        { value: 'price_asc', label: 'Harga Terendah' },
        { value: 'price_desc', label: 'Harga Tertinggi' },
      ]}
    />
  )
}
