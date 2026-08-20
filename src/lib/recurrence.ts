import {
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarMonths,
  differenceInCalendarWeeks,
  differenceInCalendarYears,
  format,
  isAfter,
  isBefore,
  parseISO,
} from 'date-fns'
import type { RecurrenceFrequency, RecurringExpense } from '../types'

/** Safety cap so a very old start date + short interval can't spin out a huge backlog. */
const MAX_DUE_OCCURRENCES = 24

/**
 * The k-th occurrence, always measured as an offset from the anchor `start` date (not chained
 * from the previous occurrence) so a day-of-month anchor like the 31st snaps back to the 31st
 * every month it exists in, instead of permanently drifting to the 28th after a short February.
 */
function occurrenceForIndex(start: Date, frequency: RecurrenceFrequency, interval: number, k: number): Date {
  const n = k * Math.max(1, interval)
  switch (frequency) {
    case 'weekly':
      return addWeeks(start, n)
    case 'monthly':
      return addMonths(start, n)
    case 'yearly':
      return addYears(start, n)
  }
}

/** Smallest occurrence index k >= 0 whose date is not before `target`. */
function indexAtOrAfter(start: Date, frequency: RecurrenceFrequency, interval: number, target: Date): number {
  const step = Math.max(1, interval)
  let approx: number
  switch (frequency) {
    case 'weekly':
      approx = Math.floor(differenceInCalendarWeeks(target, start) / step)
      break
    case 'monthly':
      approx = Math.floor(differenceInCalendarMonths(target, start) / step)
      break
    case 'yearly':
      approx = Math.floor(differenceInCalendarYears(target, start) / step)
      break
  }
  let k = Math.max(0, approx - 1)
  while (isBefore(occurrenceForIndex(start, frequency, interval, k), target)) k++
  return k
}

export const frequencyLabels: Record<RecurrenceFrequency, string> = {
  weekly: 'week(s)',
  monthly: 'month(s)',
  yearly: 'year(s)',
}

export function describeSchedule(item: Pick<RecurringExpense, 'frequency' | 'interval'>): string {
  const unit = frequencyLabels[item.frequency]
  return item.interval > 1 ? `Every ${item.interval} ${unit}` : `Every ${unit.replace('(s)', '')}`
}

/**
 * All occurrence dates (YYYY-MM-DD, oldest first) that are due on or before `today` and
 * haven't been resolved (logged or skipped) yet.
 */
export function getDueOccurrences(item: RecurringExpense, today: string): string[] {
  if (item.paused) return []
  const start = parseISO(item.startDate)
  const todayDate = parseISO(today)

  // Start searching just after the last resolved occurrence, or from the very first one.
  let k = item.lastResolvedDate ? indexAtOrAfter(start, item.frequency, item.interval, parseISO(item.lastResolvedDate)) + 1 : 0

  const due: string[] = []
  let guard = 0
  let occurrence = occurrenceForIndex(start, item.frequency, item.interval, k)
  while (!isAfter(occurrence, todayDate) && guard < MAX_DUE_OCCURRENCES) {
    due.push(format(occurrence, 'yyyy-MM-dd'))
    k++
    occurrence = occurrenceForIndex(start, item.frequency, item.interval, k)
    guard++
  }
  return due
}

/** The next occurrence date (YYYY-MM-DD) after the last resolved one — due or not. */
export function getNextOccurrence(item: RecurringExpense): string {
  const start = parseISO(item.startDate)
  const k = item.lastResolvedDate ? indexAtOrAfter(start, item.frequency, item.interval, parseISO(item.lastResolvedDate)) + 1 : 0
  return format(occurrenceForIndex(start, item.frequency, item.interval, k), 'yyyy-MM-dd')
}
