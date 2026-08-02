import { useState } from 'react'
import { useData } from '../hooks/DataContext'
import type { EntryType, Transaction } from '../types'
import { formatMoney } from '../lib/format'
import Collapsible from './Collapsible'

export default function UpcomingEntries({ type }: { type: EntryType }) {
  const { data, activeCategories, updateTransaction, removeTransaction } = useData()
  const [showConfirmed, setShowConfirmed] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [editAmount, setEditAmount] = useState('')

  const categories = activeCategories(type)

  const all = data.transactions.filter((t) => t.type === type && t.confirmed !== undefined)
  const unconfirmed = all.filter((t) => !t.confirmed).sort((a, b) => a.date.localeCompare(b.date))
  const confirmed = all.filter((t) => t.confirmed).sort((a, b) => b.date.localeCompare(a.date))

  if (all.length === 0) return null

  function startEdit(id: string, description: string, categoryId: string, amount: number) {
    setEditingId(id)
    setEditDescription(description)
    setEditCategoryId(categoryId)
    setEditAmount(String(amount))
  }

  function saveEdit(id: string) {
    const amt = parseFloat(editAmount)
    if (!editDescription.trim() || Number.isNaN(amt) || amt <= 0 || !editCategoryId) return
    const category = data.categories.find((c) => c.id === editCategoryId)
    updateTransaction(id, {
      description: editDescription.trim(),
      categoryId: editCategoryId,
      categoryName: category?.name ?? 'Uncategorized',
      amount: amt,
    })
    setEditingId(null)
  }

  function renderRow(t: Transaction) {
    return (
      <div key={t.id} className="flex items-start gap-2 rounded-md border border-line px-3 py-2">
        <input
          type="checkbox"
          checked={!!t.confirmed}
          onChange={(e) => updateTransaction(t.id, { confirmed: e.target.checked })}
          className="mt-0.5 h-4 w-4 shrink-0 accent-gold"
        />
        {editingId === t.id ? (
          <div className="flex-1 space-y-1">
            <input
              autoFocus
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full rounded-md border border-line bg-panel-hover px-2 py-1 text-xs"
            />
            <div className="flex gap-1">
              <select
                value={editCategoryId}
                onChange={(e) => setEditCategoryId(e.target.value)}
                className="flex-1 rounded-md border border-line bg-panel-hover px-2 py-1 text-xs"
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
                className="w-20 rounded-md border border-line bg-panel-hover px-2 py-1 text-xs"
              />
              <button onClick={() => saveEdit(t.id)} className="text-gold hover:text-gold-dark" title="Save">
                ✓
              </button>
              <button onClick={() => setEditingId(null)} className="text-muted hover:text-accent-red" title="Cancel">
                ✕
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-start justify-between gap-2">
            <div>
              <div className="text-xs text-text">{t.description}</div>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted">
                <span className="rounded-full bg-panel-hover px-2 py-0.5">{t.categoryName}</span>
                <span className="font-figure">{formatMoney(t.amount)}</span>
                <span>{t.date}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => startEdit(t.id, t.description, t.categoryId, t.amount)}
                className="text-muted hover:text-gold"
                title="Edit"
              >
                ✎
              </button>
              <button onClick={() => removeTransaction(t.id)} className="text-muted hover:text-accent-red" title="Delete">
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mt-4">
      <Collapsible title={`Upcoming ${type === 'expense' ? 'expenses' : 'income'}`} defaultOpen={unconfirmed.length > 0}>
        <div className="space-y-2">
          {unconfirmed.map(renderRow)}
          {unconfirmed.length === 0 && <p className="text-xs text-muted">Nothing to review.</p>}
        </div>

        <button onClick={() => setShowConfirmed((s) => !s)} className="mt-3 text-xs text-muted hover:text-text2">
          {showConfirmed ? 'Hide confirmed' : 'Show confirmed'}
        </button>

        {showConfirmed && (
          <div className="mt-3 space-y-2 border-t border-line pt-3">
            <div className="section-label">Confirmed</div>
            {confirmed.map(renderRow)}
            {confirmed.length === 0 && <p className="text-xs text-muted">No confirmed entries yet.</p>}
          </div>
        )}
      </Collapsible>
    </div>
  )
}
