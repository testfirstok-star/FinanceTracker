import type { Period } from '../hooks/usePeriod'

export default function PeriodControls({ period }: { period: Period }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {period.mode === 'month' ? (
        <div className="flex items-center gap-3">
          <button onClick={() => period.shiftMonth(-1)} className="rounded-md px-2 py-1 text-xl text-muted hover:text-text">
            ‹
          </button>
          <span className="min-w-40 text-center text-base font-medium text-text">{period.label}</span>
          <button onClick={() => period.shiftMonth(1)} className="rounded-md px-2 py-1 text-xl text-muted hover:text-text">
            ›
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={period.customStart}
            onChange={(e) => period.setCustomStart(e.target.value)}
            className="rounded-md border border-line bg-panel-hover px-2 py-1 text-xs"
          />
          <span className="text-xs text-muted">to</span>
          <input
            type="date"
            value={period.customEnd}
            onChange={(e) => period.setCustomEnd(e.target.value)}
            className="rounded-md border border-line bg-panel-hover px-2 py-1 text-xs"
          />
        </div>
      )}
      <button
        onClick={() => period.setMode(period.mode === 'month' ? 'custom' : 'month')}
        className="text-xs text-gold hover:text-gold-dark"
      >
        {period.mode === 'month' ? 'Use custom range' : 'Use month view'}
      </button>
    </div>
  )
}
