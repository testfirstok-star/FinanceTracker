import { useMemo, useState } from 'react'
import { useData } from '../hooks/DataContext'
import type { EntryType } from '../types'
import { formatMoney, formatMonthLabel, monthKey } from '../lib/format'

export default function TransactionTable({ type }: { type: EntryType }) {
  const { data, removeTransaction } = useData()
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')
  const [dayFilter, setDayFilter] = useState('')

  const transactions = useMemo(
    () => data.transactions.filter((t) => t.type === type).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
    [data.transactions, type],
  )

  const categoryNames = useMemo(() => {
    const names = new Set(transactions.map((t) => t.categoryName))
    return Array.from(names).sort()
  }, [transactions])

  const monthOptions = useMemo(() => {
    const months = new Set(transactions.map((t) => monthKey(t.date)))
    return Array.from(months).sort().reverse()
  }, [transactions])

  const filtered = transactions.filter(
    (t) =>
      (categoryFilter === 'all' || t.categoryName === categoryFilter) &&
      (dayFilter ? t.date === dayFilter : monthFilter === 'all' || monthKey(t.date) === monthFilter),
  )
  const total = filtered.reduce((sum, t) => sum + t.amount, 0)

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border border-line px-2 py-1 text-sm bg-panel-hover"
          >
            <option value="all">All categories</option>
            {categoryNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={monthFilter}
            onChange={(e) => {
              setMonthFilter(e.target.value)
              setDayFilter('')
            }}
            className="rounded-md border border-line px-2 py-1 text-sm bg-panel-hover"
          >
            <option value="all">All months</option>
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {formatMonthLabel(m)}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value)}
            className="rounded-md border border-line px-2 py-1 text-sm bg-panel-hover"
          />
          {dayFilter && (
            <button onClick={() => setDayFilter('')} className="text-xs text-muted hover:text-accent-red">
              Clear day
            </button>
          )}
        </div>
        <span className="text-sm font-medium text-text2">
          {filtered.length} entries · {formatMoney(total)}
        </span>
      </div>

      <div className="max-h-96 overflow-auto rounded-md border border-line">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-panel-hover">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-t border-line">
                <td className="whitespace-nowrap px-3 py-2">{t.date}</td>
                <td className="px-3 py-2">{t.description}</td>
                <td className="px-3 py-2">
                  <span className="rounded-full bg-panel-hover px-2 py-0.5 text-xs">{t.categoryName}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-medium">{formatMoney(t.amount)}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => removeTransaction(t.id)} className="text-muted hover:text-accent-red" title="Delete">
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted">
                  No entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
