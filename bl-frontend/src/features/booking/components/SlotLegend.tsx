export function SlotLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border border-line bg-surface-alt/60 px-4 py-2.5 text-xs text-fg-muted">
      <span className="inline-flex items-center gap-2">
        <span className="h-3.5 w-3.5 rounded-sm border border-line-strong bg-surface" />
        Tersedia
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-3.5 w-3.5 rounded-sm bg-primary-950" />
        Dipilih
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-3.5 w-3.5 rounded-sm border border-warning/40 bg-warning-soft" />
        Diproses
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="pattern-hatch h-3.5 w-3.5 rounded-sm border border-line bg-surface-alt" />
        Terisi
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-3.5 w-3.5 rounded-sm border border-line bg-surface-alt opacity-60" />
        Lewat / Tutup
      </span>
    </div>
  )
}
