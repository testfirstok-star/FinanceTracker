import { useState, type FormEvent } from 'react'
import { useData } from '../hooks/DataContext'
import type { EntryType } from '../types'
import { todayStr } from '../lib/format'

export default function TransactionForm({ type }: { type: EntryType }) {
  const { activeCategories, addCategory, addTransaction } = useData()
  const categories = activeCategories(type)

  const [date, setDate] = useState(todayStr())
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [newCategoryMode, setNewCategoryMode] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!description.trim() || Number.isNaN(amt) || amt <= 0) return

    let catId = categoryId
    if (newCategoryMode) {
      if (!newCategoryName.trim()) return
      catId = addCategory(newCategoryName, type).id
    }
    if (!catId) return

    addTransaction({ description, categoryId: catId, amount: amt, type, date })
    setDescription('')
    setAmount('')
    setNewCategoryName('')
    setNewCategoryMode(false)
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-2 sm:grid-cols-5">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="rounded-md border border-line px-3 py-1.5 text-xs bg-panel-hover"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        className="rounded-md border border-line px-3 py-1.5 text-xs sm:col-span-2 bg-panel-hover"
      />

      {newCategoryMode ? (
        <div className="flex gap-1">
          <input
            autoFocus
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="New category"
            className="w-full rounded-md border border-line px-3 py-1.5 text-xs bg-panel-hover"
          />
          <button type="button" onClick={() => setNewCategoryMode(false)} className="text-muted hover:text-accent-red">
            ✕
          </button>
        </div>
      ) : (
        <select
          value={categoryId}
          onChange={(e) => {
            if (e.target.value === '__new__') {
              setNewCategoryMode(true)
              setCategoryId('')
            } else {
              setCategoryId(e.target.value)
            }
          }}
          className="rounded-md border border-line px-3 py-1.5 text-xs bg-panel-hover"
        >
          <option value="">Category…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value="__new__">+ New category</option>
        </select>
      )}

      <div className="flex gap-2">
        <input
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          className="w-full rounded-md border border-line px-3 py-1.5 text-xs bg-panel-hover"
        />
        <button type="submit" className="shrink-0 rounded-md bg-gold px-3 py-1.5 text-xs font-medium text-ink hover:bg-gold-dark">
          Log
        </button>
      </div>
    </form>
  )
}
