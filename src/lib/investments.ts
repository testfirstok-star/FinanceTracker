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
