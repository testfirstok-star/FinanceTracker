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
                  ? 'border-green-400 bg-green-50 dark:bg-green-950'
                  : 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 dark:border-slate-700 dark:hover:bg-slate-800'
              }`}
            >
              <div className="font-medium text-slate-900 dark:text-white">{item.name}</div>
              <div className="text-xs text-slate-400">
                {catName} · {formatMoney(item.amount)}
              </div>
            </button>
          )
        })}
        {items.length === 0 && <p className="text-sm text-slate-400">No fixed items yet — add some below.</p>}
      </div>

      <button onClick={() => setManageOpen((o) => !o)} className="text-xs text-indigo-500 hover:text-indigo-700">
        {manageOpen ? 'Close manage list' : '+ Manage fixed items'}
      </button>

      {manageOpen && (
        <div className="mt-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <form onSubmit={handleAdd} className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Item name"
              className="rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
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
              className="rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            <button type="submit" className="rounded-md bg-indigo-600 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-700">
              Add item
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            {items.map((item) =>
              editingId === item.id ? (
                <form key={item.id} onSubmit={saveEdit} className="flex items-center gap-1 rounded-full border border-indigo-300 px-2 py-1 dark:border-indigo-700">
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-20 border-b border-indigo-400 bg-transparent text-xs outline-none"
                  />
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="rounded border border-slate-300 bg-transparent text-xs dark:border-slate-700"
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
                    className="w-14 border-b border-indigo-400 bg-transparent text-xs outline-none"
                  />
                  <button type="submit" className="text-indigo-500 hover:text-indigo-700" title="Save">
                    ✓
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className="text-slate-400 hover:text-red-500" title="Cancel">
                    ✕
                  </button>
                </form>
              ) : (
                <span
                  key={item.id}
                  className="flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1 text-xs dark:border-slate-700"
                >
                  <span onClick={() => startEdit(item.id)} className="cursor-pointer" title="Click to edit">
                    {item.name} ({formatMoney(item.amount)})
                  </span>
                  <button onClick={() => removeFixedItem(item.id)} className="text-slate-400 hover:text-red-500" title="Remove">
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
