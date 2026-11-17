import { useMemo } from 'react'
import { cn } from '@/utils/cn'

export interface DateStripProps {
  selectedDate: string
  onSelectDate: (date: string) => void
  maxDaysAhead?: number
  className?: string
}

function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const SHORT_DAYS = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB']
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export function DateStrip({
  selectedDate,
  onSelectDate,
  maxDaysAhead = 30,
  className,
}: DateStripProps) {
  const days = useMemo(() => {
    const today = new Date()
    const list: Array<{ ymd: string; dayLabel: string; dateNum: number; monthLabel: string }> = []
    for (let i = 0; i <= maxDaysAhead; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)
      list.push({
        ymd: toYMD(d),
        dayLabel: SHORT_DAYS[d.getDay()],
        dateNum: d.getDate(),
        monthLabel: SHORT_MONTHS[d.getMonth()],
      })
    }
    return list
  }, [maxDaysAhead])

  return (
    <div
      role="listbox"
      aria-label="Pilih tanggal booking"
      className={cn('flex gap-2 overflow-x-auto pb-2', className)}
    >
      {days.map((item) => {
        const isSelected = item.ymd === selectedDate
        return (
          <button
            key={item.ymd}
            type="button"
            role="option"
            aria-selected={isSelected}
            onClick={() => onSelectDate(item.ymd)}
            className={cn(
              'flex min-w-16 shrink-0 flex-col items-center rounded-md border px-3 py-2.5 transition',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300',
              isSelected
                ? 'border-primary-950 bg-primary-950 text-surface shadow-xs'
                : 'border-line bg-surface text-fg hover:border-primary-400 hover:bg-primary-50/40',
            )}
          >
            <span
              className={cn(
                'font-mono text-[10px] font-semibold uppercase',
                isSelected ? 'text-gold-300' : 'text-fg-muted',
              )}
            >
              {item.dayLabel}
            </span>
            <span className="mt-0.5 font-display text-lg font-bold">{item.dateNum}</span>
            <span className={cn('text-[11px]', isSelected ? 'text-primary-200' : 'text-fg-muted')}>
              {item.monthLabel}
            </span>
          </button>
        )
      })}
    </div>
  )
}
