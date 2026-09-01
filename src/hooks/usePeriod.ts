import { useMemo, useState } from 'react'
import { daysInMonth, formatMonthLabel, monthKey, shiftMonth, todayStr } from '../lib/format'

export type PeriodMode = 'month' | 'custom'

export interface Period {
  mode: PeriodMode
  setMode: (mode: PeriodMode) => void
  month: string
  setMonth: (month: string) => void
  shiftMonth: (delta: number) => void
  customStart: string
  setCustomStart: (date: string) => void
  customEnd: string
  setCustomEnd: (date: string) => void
  /** Effective inclusive date range (YYYY-MM-DD) for the current mode — compare directly against transaction dates. */
  start: string
  end: string
  label: string
}

export function usePeriod(): Period {
  const [mode, setMode] = useState<PeriodMode>('month')
  const [month, setMonthState] = useState(monthKey(todayStr()))
  const [customStart, setCustomStart] = useState(`${monthKey(todayStr())}-01`)
  const [customEnd, setCustomEnd] = useState(todayStr())

  const { start, end, label } = useMemo(() => {
    if (mode === 'custom') return { start: customStart, end: customEnd, label: `${customStart} – ${customEnd}` }
    const end = `${month}-${String(daysInMonth(month)).padStart(2, '0')}`
    return { start: `${month}-01`, end, label: formatMonthLabel(month) }
  }, [mode, month, customStart, customEnd])

  return {
    mode,
    setMode,
    month,
    setMonth: setMonthState,
    shiftMonth: (delta) => setMonthState((m) => shiftMonth(m, delta)),
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    start,
    end,
    label,
  }
}
