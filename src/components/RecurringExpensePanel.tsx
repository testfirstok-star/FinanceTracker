import { useState, type FormEvent } from 'react'
import { useData } from '../hooks/DataContext'
import type { EntryType, RecurrenceFrequency } from '../types'
import { formatMoney, todayStr } from '../lib/format'
import { describeSchedule, getDueOccurrences, getNextOccurrence } from '../lib/recurrence'

export default function RecurringExpensePanel({ type }: { type: EntryType }) {
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

  const [manageOpen, setManageOpen] = useState(false)
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

  const [dueAmounts, setDueAmounts] = useState<Record<string, string>>({})

  // One row per item: its single oldest unresolved occurrence, plus a count of any further backlog behind it.
  const dueRows = items
    .filter((item) => !item.paused)
    .map((item) => {
      const due = getDueOccurrences(item, today)
      if (due.length === 0) return null
      return { item, dueDate: due[0], moreOverdue: due.length - 1 }
    })
    .filter((row): row is { item: (typeof items)[number]; dueDate: string; moreOverdue: number } => row !== null)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    const n = parseInt(interval, 10)
    if (!name.trim() || Number.isNaN(amt) || amt <= 0 || !categoryId || !startDate) return
    addRecurringExpense({ name, amount: amt, categoryId, type, frequency, interval: Number.isNaN(n) ? 1 : n, startDate })
    setName('')
    setAmount('')
    setCategoryId('')
    setFrequency('monthly')
    setInterval('1')
    setStartDate(today)
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

  return (
    <div>
      <div className="space-y-2">
        {dueRows.map(({ item, dueDate, moreOverdue }) => {
          const catName = data.categories.find((c) => c.id === item.categoryId)?.name ?? 'Uncategorized'
          return (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gold/40 bg-panel-hover px-3 py-2">
              <div>
                <div className="text-sm font-medium text-text">{item.name}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-muted">
                  <span className="rounded-full bg-panel px-2 py-0.5">{catName}</span>
                  <span>Due {dueDate}</span>
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
        {dueRows.length === 0 && <p className="text-sm text-muted">Nothing due yet — you're all caught up.</p>}
      </div>

      <button onClick={() => setManageOpen((o) => !o)} className="mt-3 text-xs text-gold hover:text-gold-dark">
        {manageOpen ? 'Close manage list' : '+ Manage recurring expenses'}
      </button>

      {manageOpen && (
        <div className="mt-3 rounded-lg border border-line p-3">
          <form onSubmit={handleAdd} className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-6">
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
            <div className="flex items-center gap-2">
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
                  className="flex flex-wrap items-center gap-1.5 rounded-lg border border-gold/40 px-2 py-2"
                >
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-24 border-b border-gold bg-transparent text-xs outline-none"
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
                    className="w-16 border-b border-gold bg-transparent text-xs outline-none"
                  />
                  <span className="text-xs text-muted">Every</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={editInterval}
                    onChange={(e) => setEditInterval(e.target.value)}
                    className="w-10 border-b border-gold bg-transparent text-xs outline-none"
                  />
                  <select
                    value={editFrequency}
                    onChange={(e) => setEditFrequency(e.target.value as RecurrenceFrequency)}
                    className="rounded border border-line bg-transparent text-xs"
                  >
                    <option value="weekly">week(s)</option>
                    <option value="monthly">month(s)</option>
                    <option value="yearly">year(s)</option>
                  </select>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="rounded border border-line bg-transparent text-xs"
                  />
                  <button type="submit" className="text-gold hover:text-gold-dark" title="Save">
                    ✓
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className="text-muted hover:text-accent-red" title="Cancel">
                    ✕
                  </button>
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
            {items.length === 0 && <p className="text-sm text-muted">No recurring expenses yet — add one above.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
