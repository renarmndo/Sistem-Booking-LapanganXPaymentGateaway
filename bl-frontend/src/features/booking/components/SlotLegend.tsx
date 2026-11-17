import { Ban, CalendarX2, Check, CheckCircle2, Clock, Lock } from 'lucide-react'

export function SlotLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border border-line bg-surface-alt/60 px-4 py-2.5 text-xs text-fg-muted">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3.5 w-3.5 rounded-sm border border-line-strong bg-surface" />
        <CheckCircle2 className="h-3.5 w-3.5 text-success-ink" aria-hidden="true" />
        Tersedia
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3.5 w-3.5 rounded-sm bg-primary-950" />
        <Check className="h-3.5 w-3.5 text-ink" aria-hidden="true" />
        Dipilih
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3.5 w-3.5 rounded-sm border border-dashed border-warning/60 bg-warning-soft" />
        <Lock className="h-3.5 w-3.5 text-warning-ink" aria-hidden="true" />
        Diproses
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="pattern-hatch h-3.5 w-3.5 rounded-sm border border-line bg-surface-alt" />
        <CalendarX2 className="h-3.5 w-3.5 text-fg-muted" aria-hidden="true" />
        Terisi
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="pattern-blocked h-3.5 w-3.5 rounded-sm border border-line bg-surface-alt" />
        <Ban className="h-3.5 w-3.5 text-fg-muted" aria-hidden="true" />
        Tutup
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3.5 w-3.5 rounded-sm border border-line bg-surface-alt opacity-60" />
        <Clock className="h-3.5 w-3.5 text-fg-subtle" aria-hidden="true" />
        Lewat
      </span>
    </div>
  )
}
