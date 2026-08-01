import { useState, type FormEvent } from 'react'
import { useData } from '../hooks/DataContext'
import type { EntryType } from '../types'
import { formatMoney } from '../lib/format'

export default function FixedItemPanel({ type }: { type: EntryType }) {
  const { data, activeCategories, addFixedItem, updateFixedItem, removeFixedItem, addTransaction } = useData()
  const categories = activeCategories(type)
  const items = data.fixedItems.filter((f) => f.type === type)

  const [manageOpen, setManageOpen] = useState(false)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [justLogged, setJustLogged] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!name.trim() || Number.isNaN(amt) || amt <= 0 || !categoryId) return
    addFixedItem(name, amt, categoryId, type)
    setName('')
    setAmount('')
    setCategoryId('')
  }

  function startEdit(itemId: string) {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    setEditingId(itemId)
    setEditName(item.name)
    setEditAmount(String(item.amount))
    setEditCategoryId(item.categoryId)
  }

  function saveEdit(e: FormEvent) {
    e.preventDefault()
    if (!editingId) return
    const amt = parseFloat(editAmount)
    if (!editName.trim() || Number.isNaN(amt) || amt <= 0 || !editCategoryId) return
    updateFixedItem(editingId, editName, amt, editCategoryId)
    setEditingId(null)
  }

  function quickLog(itemId: string) {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    addTransaction({ description: item.name, categoryId: item.categoryId, amount: item.amount, type })
    setJustLogged(itemId)
    setTimeout(() => setJustLogged((cur) => (cur === itemId ? null : cur)), 1200)
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {items.map((item) => {
          const catName = data.categories.find((c) => c.id === item.categoryId)?.name ?? 'Uncategorized'
          return (
            <button
              key={item.id}
              onClick={() => quickLog(item.id)}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                justLogged === item.id
                  ? 'border-accent-green bg-accent-green/15'
                  : 'border-line hover:border-gold hover:bg-panel-hover'
              }`}
            >
              <div className="font-medium text-text">{item.name}</div>
              <div className="text-xs text-muted">
                {catName} · {formatMoney(item.amount)}
              </div>
            </button>
          )
        })}
        {items.length === 0 && <p className="text-sm text-muted">No fixed items yet — add some below.</p>}
      </div>

      <button onClick={() => setManageOpen((o) => !o)} className="text-xs text-gold hover:text-gold-dark">
        {manageOpen ? 'Close manage list' : '+ Manage fixed items'}
      </button>

      {manageOpen && (
        <div className="mt-3 rounded-lg border border-line p-3">
          <form onSubmit={handleAdd} className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Item name"
              className="rounded-md border border-line px-2 py-1 text-sm bg-panel-hover"
            />
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="rounded-md border border-line px-2 py-1 text-sm bg-panel-hover"
            >
              <option value="">Category…</option>
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
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              className="rounded-md border border-line px-2 py-1 text-sm bg-panel-hover"
            />
            <button type="submit" className="rounded-md bg-gold px-3 py-1 text-sm font-medium text-ink hover:bg-gold-dark">
              Add item
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            {items.map((item) =>
              editingId === item.id ? (
                <form key={item.id} onSubmit={saveEdit} className="flex items-center gap-1 rounded-full border border-gold/40 px-2 py-1">
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-20 border-b border-gold bg-transparent text-xs outline-none"
                  />
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="rounded border border-line bg-transparent text-xs"
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
                    className="w-14 border-b border-gold bg-transparent text-xs outline-none"
                  />
                  <button type="submit" className="text-gold hover:text-gold-dark" title="Save">
                    ✓
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className="text-muted hover:text-accent-red" title="Cancel">
                    ✕
                  </button>
                </form>
              ) : (
                <span
                  key={item.id}
                  className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs"
                >
                  <span onClick={() => startEdit(item.id)} className="cursor-pointer" title="Click to edit">
                    {item.name} ({formatMoney(item.amount)})
                  </span>
                  <button onClick={() => removeFixedItem(item.id)} className="text-muted hover:text-accent-red" title="Remove">
                    ✕
                  </button>
                </span>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  )
}
