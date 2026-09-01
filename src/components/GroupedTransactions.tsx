import { useMemo, useState } from 'react'
import { useData } from '../hooks/DataContext'
import type { EntryType, Transaction } from '../types'
import { formatMoney } from '../lib/format'
import Collapsible from './Collapsible'

const UNASSIGNED_KEY = '__unassigned__'

export default function GroupedTransactions({
  type,
  start,
  end,
  groupBy,
}: {
  type: EntryType
  start: string
  end: string
  /** 'account' groups expenses by where the money came from; 'category' groups by what it was for. */
  groupBy: 'account' | 'category'
}) {
  const { data, activeCategories, activeAccounts, updateTransaction, removeTransaction } = useData()
  const categories = activeCategories(type)
  const accounts = activeAccounts()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [editAccountId, setEditAccountId] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editDate, setEditDate] = useState('')

  const inRange = useMemo(
    () => data.transactions.filter((t) => t.type === type && t.date >= start && t.date <= end),
    [data.transactions, type, start, end],
  )

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; transactions: Transaction[] }>()
    for (const t of inRange) {
      let key: string
      let label: string
      if (groupBy === 'account') {
        key = t.accountId ?? UNASSIGNED_KEY
        label = t.accountId ? (data.accounts.find((a) => a.id === t.accountId)?.name ?? 'Unknown account') : 'Unassigned'
      } else {
        key = t.categoryId
        label = data.categories.find((c) => c.id === t.categoryId)?.name ?? t.categoryName
      }
      const existing = map.get(key)
      if (existing) existing.transactions.push(t)
      else map.set(key, { label, transactions: [t] })
    }
    return Array.from(map.entries())
      .map(([key, g]) => ({
        key,
        label: g.label,
        transactions: g.transactions.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
        total: g.transactions.reduce((s, t) => s + t.amount, 0),
      }))
      .sort((a, b) => (a.key === UNASSIGNED_KEY ? 1 : b.key === UNASSIGNED_KEY ? -1 : b.total - a.total))
  }, [inRange, groupBy, data.accounts, data.categories])

  function startEdit(t: Transaction) {
    setEditingId(t.id)
    setEditDescription(t.description)
    setEditCategoryId(t.categoryId)
    setEditAccountId(t.accountId ?? '')
    setEditAmount(String(t.amount))
    setEditDate(t.date)
  }

  function saveEdit(id: string) {
    const amt = parseFloat(editAmount)
    if (!editDescription.trim() || Number.isNaN(amt) || amt <= 0 || !editCategoryId || !editDate) return
    const category = data.categories.find((c) => c.id === editCategoryId)
    updateTransaction(id, {
      description: editDescription.trim(),
      categoryId: editCategoryId,
      categoryName: category?.name ?? 'Uncategorized',
      amount: amt,
      date: editDate,
      ...(type === 'expense' ? { accountId: editAccountId || undefined } : {}),
    })
    setEditingId(null)
  }

  if (inRange.length === 0) {
    return <p className="text-sm text-muted">No entries in this period.</p>
  }

  return (
    <div className="space-y-2">
      {groups.map((g) => (
        <Collapsible
          key={g.key}
          defaultOpen
          title={
            <span className="flex items-center gap-2 normal-case">
              {g.label}
              <span className="text-muted">· {g.transactions.length}</span>
            </span>
          }
          right={<span className="font-figure text-sm font-medium text-text">{formatMoney(g.total)}</span>}
        >
          <div className="space-y-1.5">
            {g.transactions.map((t) =>
              editingId === t.id ? (
                <div key={t.id} className="grid grid-cols-1 gap-2 rounded-md border border-gold/40 p-3 sm:grid-cols-2">
                  <input
                    autoFocus
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Description"
                    className="rounded-md border border-line bg-panel-hover px-2 py-1.5 text-sm sm:col-span-2"
                  />
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="rounded-md border border-line bg-panel-hover px-2 py-1.5 text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    placeholder="Amount"
                    className="rounded-md border border-line bg-panel-hover px-2 py-1.5 text-sm"
                  />
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="rounded-md border border-line bg-panel-hover px-2 py-1.5 text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {type === 'expense' && (
                    <select
                      value={editAccountId}
                      onChange={(e) => setEditAccountId(e.target.value)}
                      className="rounded-md border border-line bg-panel-hover px-2 py-1.5 text-sm"
                    >
                      <option value="">Unassigned</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="flex gap-2 sm:col-span-2">
                    <button
                      onClick={() => saveEdit(t.id)}
                      className="flex-1 rounded-md bg-gold px-3 py-2 text-sm font-medium text-ink hover:bg-gold-dark"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 rounded-md border border-line px-3 py-2 text-sm text-muted hover:border-accent-red/40 hover:text-accent-red"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div key={t.id} className="flex items-center justify-between gap-2 rounded-md border border-line px-3 py-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-text">
                      {t.description}
                      {t.recurringExpenseId && (
                        <span className="rounded-full bg-gold/15 px-1.5 py-0.5 text-[10px] text-gold" title="Logged from a recurring item">
                          Recurring
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted">
                      <span className="rounded-full bg-panel-hover px-2 py-0.5">{groupBy === 'account' ? t.categoryName : t.date}</span>
                      {groupBy === 'account' && <span>{t.date}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-figure text-sm font-medium">{formatMoney(t.amount)}</span>
                    <button onClick={() => startEdit(t)} className="text-muted hover:text-gold" title="Edit">
                      ✎
                    </button>
                    <button onClick={() => removeTransaction(t.id)} className="text-muted hover:text-accent-red" title="Delete">
                      ✕
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>
        </Collapsible>
      ))}
    </div>
  )
}
