import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PitchPattern } from '@/components/ui'
import { cn } from '@/utils/cn'
import type { FieldPhoto } from '../types/field.types'

export interface FieldGalleryProps {
  name: string
  photos: FieldPhoto[]
  className?: string
}

export function FieldGallery({ name, photos, className }: FieldGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  if (photos.length === 0) {
    return (
      <div className={cn('overflow-hidden rounded-xl', className)}>
        <PitchPattern variant="lines" className="flex h-64 items-end p-6 sm:h-80">
          <p className="font-display text-lg font-semibold text-surface">{name}</p>
        </PitchPattern>
      </div>
    )
  }

  const current = photos[activeIndex] ?? photos[0]
  const prev = () => setActiveIndex((i) => (i === 0 ? photos.length - 1 : i - 1))
  const next = () => setActiveIndex((i) => (i === photos.length - 1 ? 0 : i + 1))

  return (
    <div className={cn('grid gap-3 lg:grid-cols-3', className)}>
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-primary-950 lg:col-span-2 lg:aspect-auto lg:h-96">
        <img src={current.url} alt={name} className="h-full w-full object-cover" />
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Foto sebelumnya"
              className="absolute top-1/2 left-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-ink/60 text-surface hover:bg-ink/80"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Foto berikutnya"
              className="absolute top-1/2 right-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-ink/60 text-surface hover:bg-ink/80"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="absolute right-3 bottom-3 rounded-full bg-ink/70 px-3 py-1 font-mono text-xs text-surface">
              {activeIndex + 1} / {photos.length}
            </span>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto lg:grid lg:grid-rows-3 lg:gap-3 lg:overflow-visible">
          {photos.slice(0, 4).map((photo, idx) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              aria-label={`Lihat foto ${idx + 1}`}
              className={cn(
                'relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border-2 transition lg:h-full lg:w-full',
                idx === activeIndex ? 'border-gold-500' : 'border-transparent opacity-75 hover:opacity-100',
              )}
            >
              <img src={photo.url} alt={`${name} ${idx + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
