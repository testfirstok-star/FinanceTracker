export default function StatTile({
  label,
  value,
  tone,
  accent,
  sublabel,
  big,
}: {
  label: string
  value: string
  tone?: 'good' | 'bad'
  /** Tailwind bg-* class for a small color dot next to the label, matching this stat's color elsewhere (e.g. the bar below). */
  accent?: string
  /** Small caption under the value, e.g. "65% of income". */
  sublabel?: string
  /** Larger type for the headline stat (Savings). */
  big?: boolean
}) {
  return (
    <div className={`rounded-lg bg-panel-hover p-3 ${big ? 'sm:p-4' : ''}`}>
      <div className="flex items-center gap-1.5 text-xs text-muted">
        {accent && <span className={`h-1.5 w-1.5 rounded-full ${accent}`} />}
        {label}
      </div>
      <div
        className={`font-figure font-semibold ${big ? 'text-2xl sm:text-3xl' : 'text-lg'} ${
          tone === 'good' ? 'text-accent-green' : tone === 'bad' ? 'text-accent-red' : 'text-text'
        }`}
      >
        {value}
      </div>
      {sublabel && <div className="mt-0.5 text-[10px] text-muted">{sublabel}</div>}
    </div>
  )
}
