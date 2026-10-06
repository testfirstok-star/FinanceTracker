import type { InvestmentAccount, InvestmentTransaction, InvestmentValueEntry } from '../types'

/**
 * Portfolio value over time. The money you put in is known from deposits and withdrawals; what it's
 * actually worth is only known when you log it, so the series is anchored on the dates you logged.
 */

/** This portfolio's value snapshots, oldest first. */
export function valuesFor(entries: InvestmentValueEntry[], accountId: string): InvestmentValueEntry[] {
  return entries.filter((e) => e.accountId === accountId).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
}

/** What the portfolio is worth now: the most recent snapshot, falling back to the legacy field. */
export function latestValue(account: InvestmentAccount, entries: InvestmentValueEntry[]): number | undefined {
  const rows = valuesFor(entries, account.id)
  return rows.length > 0 ? rows[rows.length - 1].value : account.currentValue
}

/** Net money put in on or before a date: deposits less withdrawals. Dividends and fees aren't capital. */
export function investedAsOf(transactions: InvestmentTransaction[], accountId: string, date: string): number {
  return transactions
    .filter((t) => t.accountId === accountId && t.date <= date)
    .reduce((s, t) => s + (t.type === 'deposit' ? t.amount : t.type === 'withdrawal' ? -t.amount : 0), 0)
}

export interface ValuePoint {
  date: string
  /** Net capital in the portfolio on that date. */
  invested: number
  /** What you said it was worth on that date. */
  value: number
  /** value - invested. The whole question: is it actually ahead of what you fed it? */
  gain: number
  /** Gain as a share of what was invested, or undefined before any money went in. */
  gainPct: number | undefined
}

/**
 * One point per logged value, which is the only date we know both halves. Invested is a step
 * function sampled at those same dates, so the two lines are always directly comparable.
 */
export function valueSeries(
  accountId: string,
  transactions: InvestmentTransaction[],
  entries: InvestmentValueEntry[],
): ValuePoint[] {
  return valuesFor(entries, accountId).map((e) => {
    const invested = investedAsOf(transactions, accountId, e.date)
    const gain = e.value - invested
    return { date: e.date, invested, value: e.value, gain, gainPct: invested > 0 ? (gain / invested) * 100 : undefined }
  })
}

/** Charts are per portfolio and on unless switched off in Settings. */
export function chartShown(account: InvestmentAccount): boolean {
  return account.chartEnabled !== false
}

/** The figures for one date range, plus the points a chart should highlight for it. */
export interface PeriodView {
  /** Snapshot used as the opening mark: the last one before the range, else the first one inside it. */
  opening?: ValuePoint
  /** Snapshot used as the closing mark: the last one at or before the end of the range. */
  closing?: ValuePoint
  /** What the market made over the window, with your own contributions cancelled out. */
  gain: number
  /** Net deposits less withdrawals between the two marks. */
  deposited: number
  /** gain over the money actually at work: the opening value plus anything added. */
  returnPct: number | undefined
  /** True when the range holds too few snapshots to measure between. */
  tooFewPoints: boolean
}

/**
 * Gain over a window, which is NOT just the change in value: topping up raises the value without
 * earning a penny. Because each point already carries value - invested, the difference between two
 * points' gains cancels every deposit in between and leaves only what the market did.
 *
 * The window is measured between real snapshots, never interpolated, so callers should show which
 * dates were actually used.
 */
function daysApart(a: string, b: string): number {
  return Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000
}

export function periodView(series: ValuePoint[], start: string, end: string): PeriodView {
  const inRange = series.filter((p) => p.date >= start && p.date <= end)
  const before = series.filter((p) => p.date < start)
  const closing = inRange.length > 0 ? inRange[inRange.length - 1] : undefined
  // Open from whichever snapshot sits closest to the start of the range, before it or inside it.
  // Reaching back to the last known value is right when nothing was logged near the start, but
  // doing it unconditionally would widen a window the user picked to land on their own log dates.
  const lastBefore = before.length > 0 ? before[before.length - 1] : undefined
  const firstInside = inRange.length > 0 ? inRange[0] : undefined
  let pick =
    lastBefore && firstInside
      ? daysApart(firstInside.date, start) < daysApart(lastBefore.date, start)
        ? firstInside
        : lastBefore
      : (lastBefore ?? firstInside)
  // A single in-range snapshot can't be both ends; fall back to the last known value before it.
  if (pick && pick === closing && lastBefore) pick = lastBefore
  const opening = pick
  const measurable = opening !== undefined && closing !== undefined && opening !== closing
  if (!measurable) {
    return { opening, closing, gain: 0, deposited: 0, returnPct: undefined, tooFewPoints: true }
  }
  const gain = closing.gain - opening.gain
  const deposited = closing.invested - opening.invested
  const atWork = opening.value + Math.max(deposited, 0)
  return { opening, closing, gain, deposited, returnPct: atWork > 0 ? (gain / atWork) * 100 : undefined, tooFewPoints: false }
}

/** The money that was at work over the window, which the return percentage is measured against. */
export function moneyAtWork(view: PeriodView): number {
  return view.opening ? view.opening.value + Math.max(view.deposited, 0) : 0
}
