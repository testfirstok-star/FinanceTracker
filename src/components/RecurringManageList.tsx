import { useState, type FormEvent } from 'react'
import { useData } from '../hooks/DataContext'
import type { EntryType, RecurrenceFrequency, RecurringExpense } from '../types'
import { formatMoney, todayStr } from '../lib/format'
import { describeSchedule, getNextOccurrence } from '../lib/recurrence'

export default function RecurringManageList({ type }: { type: EntryType }) {
  const {
    data,
    activeCategories,
    addRecurringExpense,
    updateRecurringExpense,
    removeRecurringExpense,
    toggleRecurringExpensePaused,
    resolveRecurringOccurrence,
  } = useData()
  const categories = activeCategories(type)
  const items = data.recurringExpenses.filter((r) => r.type === type)
  const today = todayStr()

  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly')
  const [interval, setInterval] = useState('1')
  const [startDate, setStartDate] = useState(today)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [editFrequency, setEditFrequency] = useState<RecurrenceFrequency>('monthly')
  const [editInterval, setEditInterval] = useState('1')
  const [editStartDate, setEditStartDate] = useState('')

  function resetForm() {
    setName('')
    setAmount('')
    setCategoryId('')
    setFrequency('monthly')
    setInterval('1')
    setStartDate(today)
  }

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    const n = parseInt(interval, 10)
    if (!name.trim() || Number.isNaN(amt) || amt <= 0 || !categoryId || !startDate) return
    addRecurringExpense({ name, amount: amt, categoryId, type, frequency, interval: Number.isNaN(n) ? 1 : n, startDate })
    resetForm()
  }

  function startEdit(itemId: string) {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    setEditingId(itemId)
    setEditName(item.name)
    setEditAmount(String(item.amount))
    setEditCategoryId(item.categoryId)
    setEditFrequency(item.frequency)
    setEditInterval(String(item.interval))
    setEditStartDate(item.startDate)
  }

  function saveEdit(e: FormEvent) {
    e.preventDefault()
    if (!editingId) return
    const amt = parseFloat(editAmount)
    const n = parseInt(editInterval, 10)
    if (!editName.trim() || Number.isNaN(amt) || amt <= 0 || !editCategoryId || !editStartDate) return
    updateRecurringExpense(editingId, {
      name: editName,
      amount: amt,
      categoryId: editCategoryId,
      frequency: editFrequency,
      interval: Number.isNaN(n) ? 1 : n,
      startDate: editStartDate,
    })
    setEditingId(null)
  }

  function logNextNow(item: RecurringExpense) {
    resolveRecurringOccurrence(item.id, getNextOccurrence(item), true, item.amount)
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Item name"
          className="rounded-md border border-line px-2 py-1 text-sm bg-panel-hover sm:col-span-2"
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
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted">Every</span>
          <input
            type="number"
            min="1"
            step="1"
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            className="w-12 rounded-md border border-line px-1.5 py-1 text-sm bg-panel-hover"
          />
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
            className="rounded-md border border-line px-1.5 py-1 text-sm bg-panel-hover"
          >
            <option value="weekly">week(s)</option>
            <option value="monthly">month(s)</option>
            <option value="yearly">year(s)</option>
          </select>
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="flex-1 rounded-md border border-line px-2 py-1 text-sm bg-panel-hover"
          />
          <button type="submit" className="rounded-md bg-gold px-3 py-1 text-sm font-medium text-ink hover:bg-gold-dark">
            Add
          </button>
        </div>
      </form>

      <div className="space-y-2">
        {items.map((item) =>
          editingId === item.id ? (
            <form
              key={item.id}
              onSubmit={saveEdit}
              className="grid grid-cols-1 gap-2 rounded-lg border border-gold/40 p-3 sm:grid-cols-2"
            >
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Item name"
                className="rounded-md border border-line bg-panel-hover px-2 py-1.5 text-sm sm:col-span-2"
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
              <input
                type="number"
                step="0.01"
                min="0"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                placeholder="Amount"
                className="rounded-md border border-line bg-panel-hover px-2 py-1.5 text-sm"
              />
              <div className="flex items-center gap-1.5">
                <span className="shrink-0 text-xs text-muted">Every</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={editInterval}
                  onChange={(e) => setEditInterval(e.target.value)}
                  className="w-14 rounded-md border border-line bg-panel-hover px-2 py-1.5 text-sm"
                />
                <select
                  value={editFrequency}
                  onChange={(e) => setEditFrequency(e.target.value as RecurrenceFrequency)}
                  className="flex-1 rounded-md border border-line bg-panel-hover px-2 py-1.5 text-sm"
                >
                  <option value="weekly">week(s)</option>
                  <option value="monthly">month(s)</option>
                  <option value="yearly">year(s)</option>
                </select>
              </div>
              <input
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                className="rounded-md border border-line bg-panel-hover px-2 py-1.5 text-sm"
              />
              <div className="flex gap-2 sm:col-span-2">
                <button type="submit" className="flex-1 rounded-md bg-gold px-3 py-2 text-sm font-medium text-ink hover:bg-gold-dark">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="flex-1 rounded-md border border-line px-3 py-2 text-sm text-muted hover:border-accent-red/40 hover:text-accent-red"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
              <div onClick={() => startEdit(item.id)} className="cursor-pointer" title="Click to edit">
                <span className="text-sm text-text">
                  {item.name} ({formatMoney(item.amount)})
                </span>
                <div className="mt-0.5 text-[10px] text-muted">
                  {describeSchedule(item)} · {item.paused ? 'Paused' : `Next: ${getNextOccurrence(item)}`}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {!item.paused && (
                  <button onClick={() => logNextNow(item)} className="text-muted hover:text-gold" title="Log the next occurrence today, ahead of schedule">
                    Log now
                  </button>
                )}
                <button onClick={() => toggleRecurringExpensePaused(item.id)} className="text-muted hover:text-gold">
                  {item.paused ? 'Resume' : 'Pause'}
                </button>
                <button onClick={() => removeRecurringExpense(item.id)} className="text-muted hover:text-accent-red" title="Remove">
                  ✕
                </button>
              </div>
            </div>
          ),
        )}
        {items.length === 0 && <p className="text-sm text-muted">No recurring items yet — add one above.</p>}
      </div>
    </div>
  )
}
