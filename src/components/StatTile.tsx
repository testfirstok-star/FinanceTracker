export default function StatTile({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="rounded-lg bg-panel-hover p-3">
      <div className="text-xs text-muted">{label}</div>
      <div
        className={`font-figure text-lg font-semibold ${
          tone === 'good' ? 'text-accent-green' : tone === 'bad' ? 'text-accent-red' : 'text-text'
        }`}
      >
        {value}
      </div>
    </div>
  )
}
