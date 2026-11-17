import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui'
import { cn } from '@/utils/cn'
import type { SearchInputProps } from './SearchInput.types'

export function SearchInput({
  value,
  onChange,
  placeholder = 'Cari...',
  ariaLabel = 'Pencarian',
  clearLabel = 'Hapus pencarian',
  className,
}: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-fg-muted"
      />
      <Input
        type="search"
        value={value}
        aria-label={ariaLabel}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="pr-9 pl-10"
      />
      {value !== '' && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={clearLabel}
          className="absolute top-1/2 right-2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-sm text-fg-muted hover:bg-surface-alt hover:text-fg"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
