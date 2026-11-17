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

  const sidePhotos = photos.slice(0, 4)

  return (
    <div className={cn('grid gap-3 lg:grid-cols-12', className)}>
      <div
        className={cn(
          'relative aspect-[16/10] overflow-hidden rounded-2xl bg-primary-950 shadow-sm lg:aspect-auto lg:h-[420px]',
          photos.length > 1 ? 'lg:col-span-8' : 'lg:col-span-12',
        )}
      >
        <img src={current.url} alt={name} className="h-full w-full object-cover transition duration-300" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-ink/80 via-ink/25 to-transparent"
        />
        <div className="absolute right-4 bottom-4 left-4 flex items-end justify-between gap-3">
          <div className="space-y-1">
            <span className="inline-block rounded-md bg-ink/70 px-2.5 py-1 text-[11px] font-medium text-gold-300 backdrop-blur-xs">
              Arena Utama
            </span>
            <p className="font-display text-base font-bold text-surface sm:text-lg">{name}</p>
          </div>
          <span className="rounded-full bg-ink/75 px-3 py-1 font-mono text-xs font-medium text-surface backdrop-blur-xs">
            {activeIndex + 1} / {photos.length} Foto
          </span>
        </div>

        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Foto sebelumnya"
              className="absolute top-1/2 left-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-ink/60 text-surface backdrop-blur-xs transition hover:bg-ink/85"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Foto berikutnya"
              className="absolute top-1/2 right-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-ink/60 text-surface backdrop-blur-xs transition hover:bg-ink/85"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto lg:col-span-4 lg:grid lg:h-[420px] lg:grid-rows-3 lg:gap-3 lg:overflow-visible">
          {sidePhotos.slice(0, 3).map((photo, idx) => {
            const isExtraTrigger = idx === 2 && photos.length > 3
            return (
              <button
                key={photo.id}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={`Lihat foto ${idx + 1}`}
                className={cn(
                  'group relative h-24 w-36 shrink-0 overflow-hidden rounded-xl border-2 transition lg:h-full lg:w-full',
                  idx === activeIndex
                    ? 'border-gold-500 ring-2 ring-gold-500/30'
                    : 'border-transparent opacity-85 hover:opacity-100',
                )}
              >
                <img
                  src={photo.url}
                  alt={`${name} ${idx + 1}`}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-ink/70 to-transparent"
                />
                <span className="absolute bottom-2 left-2.5 text-[11px] font-medium text-surface">
                  Foto {idx + 1}
                </span>
                {isExtraTrigger && (
                  <span className="absolute right-2.5 bottom-2 rounded-full bg-surface/95 px-2.5 py-0.5 text-[11px] font-semibold text-ink shadow-xs">
                    +{photos.length - 3} Foto Lainnya
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
