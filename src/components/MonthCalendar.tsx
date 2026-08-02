import { formatMoney, todayStr } from '../lib/format'

interface Props {
  monthKeyStr: string // YYYY-MM
  totalsByDay: Record<string, number> // 'YYYY-MM-DD' -> amount
  limits?: { weekday?: number; weekend?: number }
  selectedDate?: string | null
  onDayClick?: (date: string) => void
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function isWeekend(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number)
  const day = new Date(y, m - 1, d).getDay()
  return day === 0 || day === 6
}

export default function MonthCalendar({ monthKeyStr, totalsByDay, limits, selectedDate, onDayClick }: Props) {
  const [year, month] = monthKeyStr.split('-').map(Number)
  const firstDay = new Date(year, month - 1, 1)
  const numDays = new Date(year, month, 0).getDate()
  const startOffset = firstDay.getDay()
  const today = todayStr()

  const cells: Array<{ day: number; date: string } | null> = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= numDays; d++) {
    cells.push({ day: d, date: `${monthKeyStr}-${String(d).padStart(2, '0')}` })
  }

  return (
    <div className="calendar-surface">
      <div className="mb-1.5 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="section-label !text-[10px]">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`empty-${i}`} />
          const amount = totalsByDay[cell.date] ?? 0
          const isToday = cell.date === today
          const isSelected = cell.date === selectedDate

          let boxClass = 'bg-white/5'
          let dayClass = 'text-muted'
          let amountClass = 'text-text2'
          if (limits && amount > 0) {
            const limit = isWeekend(cell.date) ? limits.weekend : limits.weekday
            if (limit != null && limit > 0) {
              const over = amount > limit
              boxClass = over ? 'bg-accent-red/25' : 'bg-accent-green/25'
              dayClass = over ? 'text-accent-red' : 'text-accent-green'
              amountClass = over ? 'text-accent-red' : 'text-accent-green'
            }
          } else if (!limits && amount > 0) {
            boxClass = 'bg-accent-green/25'
            dayClass = 'text-accent-green'
            amountClass = 'text-accent-green'
          }

          return (
            <button
              type="button"
              key={cell.date}
              onClick={() => onDayClick?.(cell.date)}
              title={`${cell.date}: ${formatMoney(amount)}`}
              className={`flex aspect-square flex-col items-center justify-center rounded-xl text-xs transition-colors ${boxClass} ${
                isToday ? 'outline outline-2 outline-offset-1 outline-gold' : ''
              } ${isSelected ? 'ring-2 ring-text2 ring-offset-1 ring-offset-panel' : ''}`}
            >
              <span className={dayClass}>{cell.day}</span>
              {amount > 0 && <span className={`font-figure text-[10px] ${amountClass}`}>{Math.round(amount)}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
