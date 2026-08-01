import { formatMoney } from '../lib/format'

interface Props {
  monthKeyStr: string // YYYY-MM
  totalsByDay: Record<string, number> // 'YYYY-MM-DD' -> amount
  hue: 'blue' | 'green'
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function MonthCalendar({ monthKeyStr, totalsByDay, hue }: Props) {
  const [year, month] = monthKeyStr.split('-').map(Number)
  const firstDay = new Date(year, month - 1, 1)
  const numDays = new Date(year, month, 0).getDate()
  const startOffset = firstDay.getDay()
  const max = Math.max(1, ...Object.values(totalsByDay))
  const hueVar = hue === 'blue' ? 'var(--series-1)' : 'var(--series-6)'

  const cells: Array<{ day: number; date: string } | null> = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= numDays; d++) {
    cells.push({ day: d, date: `${monthKeyStr}-${String(d).padStart(2, '0')}` })
  }

  return (
    <div className="calendar-surface">
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`empty-${i}`} />
          const amount = totalsByDay[cell.date] ?? 0
          const ratio = amount / max
          const bg = amount > 0 ? `color-mix(in oklab, ${hueVar} ${8 + ratio * 82}%, var(--calendar-surface))` : undefined
          const textDark = ratio > 0.45
          return (
            <div
              key={cell.date}
              title={`${cell.date}: ${formatMoney(amount)}`}
              style={{ background: bg }}
              className="flex aspect-square flex-col items-center justify-center rounded-md border border-slate-100 text-xs dark:border-slate-800"
            >
              <span className={textDark ? 'text-white' : 'text-slate-500 dark:text-slate-400'}>{cell.day}</span>
              {amount > 0 && (
                <span className={`text-[10px] font-medium ${textDark ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                  {Math.round(amount)}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
