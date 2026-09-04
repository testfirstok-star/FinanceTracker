import { useState } from 'react'
import { useData } from '../hooks/DataContext'
import type { EntryType, RecurringExpense } from '../types'
import { daysInMonth, monthKey, todayStr } from '../lib/format'
import { getDueOccurrences } from '../lib/recurrence'
import { findFirstAccountWithTag, hasTag } from '../lib/tags'

export default function RecurringDueChecklist({ type, filterTag }: { type: EntryType; filterTag?: string }) {
  const { data, resolveRecurringOccurrence } = useData()
  const items = data.recurringExpenses.filter((r) => r.type === type && (!filterTag || hasTag(r, filterTag)))
  const today = todayStr()
  // Show everything expected this month from the 1st, not just what's strictly due as of today —
  // so the checklist reads as "what to expect this month," confirmable any time during the month.
  const thisMonth = monthKey(today)
  const monthEnd = `${thisMonth}-${String(daysInMonth(thisMonth)).padStart(2, '0')}`
  const [dueAmounts, setDueAmounts] = useState<Record<string, string>>({})

  const dueRows = items
    .filter((item) => !item.paused)
    .map((item) => {
      const due = getDueOccurrences(item, monthEnd)
      if (due.length === 0) return null
      return { item, dueDate: due[0], moreOverdue: due.length - 1 }
    })
    .filter((row): row is { item: RecurringExpense; dueDate: string; moreOverdue: number } => row !== null)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  function markIncurred(itemId: string, dueDate: string, fallbackAmount: number) {
    const raw = dueAmounts[itemId]
    const amt = raw !== undefined && raw !== '' ? parseFloat(raw) : fallbackAmount
    resolveRecurringOccurrence(itemId, dueDate, true, Number.isNaN(amt) ? fallbackAmount : amt)
    setDueAmounts((cur) => {
      const next = { ...cur }
      delete next[itemId]
      return next
    })
  }

  function markSkipped(itemId: string, dueDate: string) {
    resolveRecurringOccurrence(itemId, dueDate, false)
  }

  const recurAccount = type === 'expense' ? findFirstAccountWithTag(data.accounts, 'recur') : undefined

  return (
    <div>
      {type === 'expense' && (
        <p className="mb-2 text-xs text-muted">
          {recurAccount ? (
            <>
              Confirmed items post to <span className="text-text2">{recurAccount.name}</span> and aren't counted in your Expenses
              total — same treatment as Investment.
            </>
          ) : (
            <>No account is tagged "recur" yet — confirmed items will be Unassigned until you tag one under Manage Accounts.</>
          )}
        </p>
      )}
      <div className="space-y-2">
        {dueRows.map(({ item, dueDate, moreOverdue }) => {
          const catName = data.categories.find((c) => c.id === item.categoryId)?.name ?? 'Uncategorized'
          return (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gold/40 bg-panel-hover px-3 py-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-text">{item.name}</span>
                  {(item.tags ?? [])
                    .filter((t) => t !== filterTag)
                    .map((t) => (
                      <span key={t} className="rounded-full bg-gold/15 px-1.5 py-0.5 text-[10px] text-gold">
                        {t}
                      </span>
                    ))}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-muted">
                  <span className="rounded-full bg-panel px-2 py-0.5">{catName}</span>
                  <span>{dueDate <= today ? 'Due' : 'Expected'} {dueDate}</span>
                  {moreOverdue > 0 && <span className="text-accent-red">+{moreOverdue} more overdue</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={dueAmounts[item.id] ?? String(item.amount)}
                  onChange={(e) => setDueAmounts((cur) => ({ ...cur, [item.id]: e.target.value }))}
                  className="w-20 rounded-md border border-line bg-panel px-2 py-1 text-xs"
                />
                <button
                  onClick={() => markIncurred(item.id, dueDate, item.amount)}
                  className="rounded-md bg-accent-green/20 px-2.5 py-1 text-xs font-medium text-accent-green hover:bg-accent-green/30"
                  title="Yes, this was incurred — log it as an expense"
                >
                  ✓ Incurred
                </button>
                <button
                  onClick={() => markSkipped(item.id, dueDate)}
                  className="rounded-md border border-line px-2.5 py-1 text-xs text-muted hover:border-accent-red/40 hover:text-accent-red"
                  title="Not incurred this cycle — skip without logging"
                >
                  Skip
                </button>
              </div>
            </div>
          )
        })}
        {dueRows.length === 0 && (
          <p className="text-sm text-muted">
            {filterTag ? `No ${filterTag} due this month` : 'Nothing expected this month'} — you're all caught up.
          </p>
        )}
      </div>
    </div>
  )
}
