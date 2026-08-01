import { useMemo, useState } from 'react'
import { useData } from '../hooks/DataContext'
import type { EntryType } from '../types'
import { formatMoney } from '../lib/format'

export default function TransactionTable({ type }: { type: EntryType }) {
  const { data, removeTransaction } = useData()
  const [categoryFilter, setCategoryFilter] = useState('all')

  const transactions = useMemo(
    () => data.transactions.filter((t) => t.type === type).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
    [data.transactions, type],
  )

  const categoryNames = useMemo(() => {
    const names = new Set(transactions.map((t) => t.categoryName))
    return Array.from(names).sort()
  }, [transactions])

  const filtered = categoryFilter === 'all' ? transactions : transactions.filter((t) => t.categoryName === categoryFilter)
  const total = filtered.reduce((sum, t) => sum + t.amount, 0)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="all">All categories</option>
          {categoryNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {filtered.length} entries · {formatMoney(total)}
        </span>
      </div>

      <div className="max-h-96 overflow-auto rounded-md border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
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
              <tr key={t.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="whitespace-nowrap px-3 py-2">{t.date}</td>
                <td className="px-3 py-2">{t.description}</td>
                <td className="px-3 py-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">{t.categoryName}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-medium">{formatMoney(t.amount)}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => removeTransaction(t.id)} className="text-slate-400 hover:text-red-500" title="Delete">
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
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
