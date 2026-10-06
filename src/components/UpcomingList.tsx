import { useState } from 'react'
import { useData } from '../hooks/DataContext'
import type { EntryType, RecurringExpense, Transaction } from '../types'
import { formatMoney, daysInMonth, monthKey, todayStr } from '../lib/format'
import { getDueOccurrences } from '../lib/recurrence'
import { hasTag } from '../lib/tags'
import { accountKindSuffix } from '../lib/cashflow'
import Collapsible from './Collapsible'

/**
 * Everything still to come, in one list: occurrences a recurring item says are due, and entries you
 * logged ahead with a future date. They used to live in two separate components on two separate
 * pages, so the Dashboard could not see recurring items at all and ticking something off in one
 * place left the other looking stale.
 *
 * Both kinds read and write the same state through useData, so this list is identical wherever it
 * is rendered and an item ticked on any page leaves every other page at the same moment.
 */

type Row =
  | {
      kind: 'recurring'
      key: string
      date: string
      name: string
      categoryName: string
      amount: number
      item: RecurringExpense
      moreOverdue: number
      /** Where confirming it will post, and how that account's spend is counted. */
      target?: { name: string; suffix: string }
    }
  | { kind: 'planned'; key: string; date: string; name: string; categoryName: string; amount: number; tx: Transaction }

export default function UpcomingList({ type, filterTag, title }: { type: EntryType; filterTag?: string; title?: string }) {
  const { data, activeCategories, resolveRecurringOccurrence, updateTransaction, removeTransaction } = useData()
  const [dueAmounts, setDueAmounts] = useState<Record<string, string>>({})
  const [showDone, setShowDone] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [editAmount, setEditAmount] = useState('')

  const categories = activeCategories(type)
  const today = todayStr()
  // Show everything expected this month from the 1st, not just what's strictly due as of today, so
  // the list reads as "what to expect this month" and can be confirmed any time during it.
  const thisMonth = monthKey(today)
  const monthEnd = `${thisMonth}-${String(daysInMonth(thisMonth)).padStart(2, '0')}`

  const recurringRows: Row[] = data.recurringExpenses
    .filter((r) => r.type === type && !r.paused && (!filterTag || hasTag(r, filterTag)))
    .flatMap((item) => {
      const due = getDueOccurrences(item, monthEnd)
      if (due.length === 0) return []
      const account = item.accountId
        ? data.accounts.find((a) => a.id === item.accountId)
        : data.accounts.find((a) => a.id === data.settings.defaultRecurringAccountId)
      return [
        {
          kind: 'recurring' as const,
          key: `r-${item.id}`,
          date: due[0],
          name: item.name,
          categoryName: data.categories.find((c) => c.id === item.categoryId)?.name ?? 'Uncategorized',
          amount: item.amount,
          item,
          moreOverdue: due.length - 1,
          target: account ? { name: account.name, suffix: accountKindSuffix(account.kind) } : undefined,
        },
      ]
    })

  // Entries logged ahead of their date. A tag filter only applies to recurring items, which are the
  // only things that carry tags.
  const plannedTx = filterTag ? [] : data.transactions.filter((t) => t.type === type && t.confirmed === false)
  const plannedRows: Row[] = plannedTx.map((t) => ({
    kind: 'planned',
    key: `p-${t.id}`,
    date: t.date,
    name: t.description,
    categoryName: t.categoryName,
    amount: t.amount,
    tx: t,
  }))

  const rows = [...recurringRows, ...plannedRows].sort((a, b) => a.date.localeCompare(b.date))
  const done = filterTag ? [] : data.transactions.filter((t) => t.type === type && t.confirmed === true).sort((a, b) => b.date.localeCompare(a.date))

  function markIncurred(item: RecurringExpense, dueDate: string) {
    const raw = dueAmounts[item.id]
    const amt = raw !== undefined && raw !== '' ? parseFloat(raw) : item.amount
    resolveRecurringOccurrence(item.id, dueDate, true, Number.isNaN(amt) ? item.amount : amt)
    setDueAmounts((cur) => {
      const next = { ...cur }
      delete next[item.id]
      return next
    })
  }

  function startEdit(t: Transaction) {
    setEditingId(t.id)
    setEditDescription(t.description)
    setEditCategoryId(t.categoryId)
    setEditAmount(String(t.amount))
  }

  function saveEdit(id: string) {
    const amt = parseFloat(editAmount)
    if (!editDescription.trim() || Number.isNaN(amt) || amt <= 0 || !editCategoryId) return
    updateTransaction(id, {
      description: editDescription.trim(),
      categoryId: editCategoryId,
      categoryName: data.categories.find((c) => c.id === editCategoryId)?.name ?? 'Uncategorized',
      amount: amt,
    })
    setEditingId(null)
  }

  const list = (
    <div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gold/40 bg-panel-hover px-3 py-2"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-medium text-text">{row.name}</span>
                {row.kind === 'recurring'
                  ? (row.item.tags ?? [])
                      .filter((t) => t !== filterTag)
                      .map((t) => (
                        <span key={t} className="rounded-full bg-gold/15 px-1.5 py-0.5 text-[10px] text-gold">
                          {t}
                        </span>
                      ))
                  : null}
                <span className="rounded-full bg-panel px-1.5 py-0.5 text-[10px] text-muted">
                  {row.kind === 'recurring' ? 'recurring' : 'planned'}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-muted">
                <span className="rounded-full bg-panel px-2 py-0.5">{row.categoryName}</span>
                <span>
                  {row.date <= today ? 'Due' : 'Expected'} {row.date}
                </span>
                {row.date < today && <span className="text-accent-red">overdue</span>}
                {row.kind === 'recurring' && row.moreOverdue > 0 && (
                  <span className="text-accent-red">+{row.moreOverdue} more overdue</span>
                )}
                {row.kind === 'recurring' && row.target && (
                  <span>
                    → {row.target.name}
                    {row.target.suffix}
                  </span>
                )}
              </div>
            </div>

            {row.kind === 'recurring' ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={dueAmounts[row.item.id] ?? String(row.amount)}
                  onChange={(e) => setDueAmounts((cur) => ({ ...cur, [row.item.id]: e.target.value }))}
                  className="w-20 rounded-md border border-line bg-panel px-2 py-1 text-xs"
                />
                <button
                  onClick={() => markIncurred(row.item, row.date)}
                  className="rounded-md bg-accent-green/20 px-2.5 py-1 text-xs font-medium text-accent-green hover:bg-accent-green/30"
                  title={`Yes, this happened — log it as ${type === 'expense' ? 'an expense' : 'income'}`}
                >
                  ✓ Log it
                </button>
                <button
                  onClick={() => resolveRecurringOccurrence(row.item.id, row.date, false)}
                  className="rounded-md border border-line px-2.5 py-1 text-xs text-muted hover:border-accent-red/40 hover:text-accent-red"
                  title="Didn't happen this cycle — skip without logging"
                >
                  Skip
                </button>
              </div>
            ) : editingId === row.tx.id ? (
              <div className="flex w-full flex-wrap items-center gap-1.5">
                <input
                  autoFocus
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="min-w-32 flex-1 rounded-md border border-line bg-panel px-2 py-1 text-xs"
                />
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  className="rounded-md border border-line bg-panel px-2 py-1 text-xs"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-20 rounded-md border border-line bg-panel px-2 py-1 text-xs"
                />
                <button
                  onClick={() => saveEdit(row.tx.id)}
                  className="rounded-md bg-gold px-2.5 py-1 text-xs font-medium text-ink hover:bg-gold-dark"
                >
                  Save
                </button>
                <button onClick={() => setEditingId(null)} className="px-2 py-1 text-xs text-muted hover:text-accent-red">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-figure text-sm font-medium">{formatMoney(row.amount)}</span>
                <button
                  onClick={() => updateTransaction(row.tx.id, { confirmed: true })}
                  className="rounded-md bg-accent-green/20 px-2.5 py-1 text-xs font-medium text-accent-green hover:bg-accent-green/30"
                  title="It happened — count it from now on"
                >
                  ✓ Confirm
                </button>
                <button
                  onClick={() => startEdit(row.tx)}
                  className="-m-1.5 rounded-md p-1.5 text-muted transition-colors hover:bg-panel hover:text-gold"
                  title="Edit"
                >
                  ✎
                </button>
                <button
                  onClick={() => removeTransaction(row.tx.id)}
                  className="-m-1.5 rounded-md p-1.5 text-muted transition-colors hover:bg-panel hover:text-accent-red"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        ))}

        {rows.length === 0 && (
          <p className="text-sm text-muted">
            {filterTag ? `No ${filterTag} due this month` : `Nothing expected this month`} — you're all caught up.
          </p>
        )}
      </div>

      {done.length > 0 && (
        <>
          <button onClick={() => setShowDone((s) => !s)} className="mt-3 text-xs text-muted hover:text-text2">
            {showDone ? 'Hide confirmed' : `Show confirmed (${done.length})`}
          </button>
          {showDone && (
            <div className="mt-2 space-y-1 border-t border-line pt-2">
              {done.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 text-xs text-muted">
                  <span>
                    {t.description} <span className="text-[10px]">{t.date}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-figure">{formatMoney(t.amount)}</span>
                    <button
                      onClick={() => updateTransaction(t.id, { confirmed: false })}
                      className="hover:text-gold"
                      title="Put it back on the list"
                    >
                      ↺
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )

  if (!title) return list
  return (
    <div className="mt-4">
      <Collapsible title={title} defaultOpen={rows.length > 0}>
        {list}
      </Collapsible>
    </div>
  )
}
