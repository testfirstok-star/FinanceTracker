import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { useData } from '../hooks/DataContext'
import type { EntryType, RecurrenceFrequency, RecurringExpense } from '../types'
import { formatMoney, todayStr } from '../lib/format'
import { describeSchedule, getNextOccurrence } from '../lib/recurrence'
import { findFirstAccountWithTag, isTrackingOnly, RECURRING_TAG_SUGGESTIONS, withCategoryDerivedTag } from '../lib/tags'

function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase()
}

export default function RecurringManageList({ type }: { type: EntryType }) {
  const {
    data,
    activeCategories,
    activeAccounts,
    addRecurringExpense,
    updateRecurringExpense,
    removeRecurringExpense,
    toggleRecurringExpensePaused,
    resolveRecurringOccurrence,
  } = useData()
  const categories = activeCategories(type)
  const accounts = activeAccounts()
  const items = data.recurringExpenses.filter((r) => r.type === type)
  const today = todayStr()
  const autoAccount = findFirstAccountWithTag(accounts, 'recur')

  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly')
  const [interval, setInterval] = useState('1')
  const [startDate, setStartDate] = useState(today)
  const [newTags, setNewTags] = useState<string[]>([])
  const [tagDraft, setTagDraft] = useState('')
  const [tagDraftFor, setTagDraftFor] = useState<Record<string, string>>({})
  const [accountId, setAccountId] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [editFrequency, setEditFrequency] = useState<RecurrenceFrequency>('monthly')
  const [editInterval, setEditInterval] = useState('1')
  const [editStartDate, setEditStartDate] = useState('')
  const [editAccountId, setEditAccountId] = useState('')

  function resetForm() {
    setName('')
    setAmount('')
    setCategoryId('')
    setFrequency('monthly')
    setInterval('1')
    setStartDate(today)
    setNewTags([])
    setTagDraft('')
    setAccountId('')
  }

  function addDraftTag() {
    const tag = normalizeTag(tagDraft)
    setTagDraft('')
    if (!tag || newTags.includes(tag)) return
    setNewTags((t) => [...t, tag])
  }

  function selectCategory(id: string) {
    setCategoryId(id)
    const catName = categories.find((c) => c.id === id)?.name
    setNewTags((cur) => withCategoryDerivedTag(catName, cur))
  }

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    const n = parseInt(interval, 10)
    if (!name.trim() || Number.isNaN(amt) || amt <= 0 || !categoryId || !startDate) return
    const catName = categories.find((c) => c.id === categoryId)?.name
    const tags = withCategoryDerivedTag(catName, newTags)
    addRecurringExpense({
      name,
      amount: amt,
      categoryId,
      type,
      frequency,
      interval: Number.isNaN(n) ? 1 : n,
      startDate,
      tags,
      accountId: type === 'expense' && accountId ? accountId : undefined,
    })
    resetForm()
  }

  function addTagToItem(itemId: string, rawTag: string) {
    const item = items.find((i) => i.id === itemId)
    const tag = normalizeTag(rawTag)
    if (!item || !tag || (item.tags ?? []).includes(tag)) return
    updateRecurringExpense(itemId, { tags: [...(item.tags ?? []), tag] })
  }

  function removeTagFromItem(itemId: string, tag: string) {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    updateRecurringExpense(itemId, { tags: (item.tags ?? []).filter((t) => t !== tag) })
  }

  function commitItemTagDraft(itemId: string) {
    addTagToItem(itemId, tagDraftFor[itemId] ?? '')
    setTagDraftFor((cur) => ({ ...cur, [itemId]: '' }))
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
    setEditAccountId(item.accountId ?? '')
  }

  function saveEdit(e: FormEvent) {
    e.preventDefault()
    if (!editingId) return
    const amt = parseFloat(editAmount)
    const n = parseInt(editInterval, 10)
    if (!editName.trim() || Number.isNaN(amt) || amt <= 0 || !editCategoryId || !editStartDate) return
    const currentItem = items.find((i) => i.id === editingId)
    const catName = categories.find((c) => c.id === editCategoryId)?.name
    const tags = withCategoryDerivedTag(catName, currentItem?.tags ?? [])
    updateRecurringExpense(editingId, {
      name: editName,
      amount: amt,
      categoryId: editCategoryId,
      frequency: editFrequency,
      interval: Number.isNaN(n) ? 1 : n,
      startDate: editStartDate,
      tags,
      accountId: type === 'expense' && editAccountId ? editAccountId : undefined,
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
          onChange={(e) => selectCategory(e.target.value)}
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
        {type === 'expense' && (
          <div className="flex items-center gap-2 sm:col-span-5">
            <span className="shrink-0 text-xs text-muted">Post to</span>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="rounded-md border border-line px-2 py-1 text-xs bg-panel-hover"
            >
              <option value="">Auto {autoAccount ? `(${autoAccount.name})` : '(none tagged "recur")'}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {isTrackingOnly(a) ? ' — not counted in Cash Flow' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5 sm:col-span-5">
          {newTags.map((t) => (
            <span key={t} className="flex items-center gap-1 rounded-full bg-panel-hover px-2 py-0.5 text-[10px] text-muted">
              {t}
              <button type="button" onClick={() => setNewTags((cur) => cur.filter((x) => x !== t))} className="hover:text-accent-red">
                ✕
              </button>
            </span>
          ))}
          <input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                addDraftTag()
              }
            }}
            onBlur={addDraftTag}
            placeholder="+ tag (enter)"
            className="w-28 rounded-md border border-line bg-panel-hover px-2 py-0.5 text-[10px]"
          />
          {RECURRING_TAG_SUGGESTIONS.filter((t) => !newTags.includes(t)).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setNewTags((cur) => [...cur, t])}
              className="rounded-full border border-line px-2 py-0.5 text-[10px] text-muted hover:border-gold/40 hover:text-gold"
            >
              +{t}
            </button>
          ))}
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
              {type === 'expense' && (
                <div className="flex items-center gap-2 sm:col-span-2">
                  <span className="shrink-0 text-xs text-muted">Post to</span>
                  <select
                    value={editAccountId}
                    onChange={(e) => setEditAccountId(e.target.value)}
                    className="flex-1 rounded-md border border-line bg-panel-hover px-2 py-1.5 text-sm"
                  >
                    <option value="">Auto {autoAccount ? `(${autoAccount.name})` : '(none tagged "recur")'}</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                        {isTrackingOnly(a) ? ' — not counted in Cash Flow' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
            <div key={item.id} className="rounded-lg border border-line px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div onClick={() => startEdit(item.id)} className="cursor-pointer" title="Click to edit">
                  <span className="text-sm text-text">
                    {item.name} ({formatMoney(item.amount)})
                  </span>
                  <div className="mt-0.5 text-[10px] text-muted">
                    {describeSchedule(item)} · {item.paused ? 'Paused' : `Next: ${getNextOccurrence(item)}`}
                  </div>
                  {type === 'expense' &&
                    (() => {
                      const targetAccount = item.accountId ? accounts.find((a) => a.id === item.accountId) : autoAccount
                      if (!targetAccount) return null
                      return (
                        <div className="mt-0.5 text-[10px] text-muted">
                          Posts to {targetAccount.name}
                          {isTrackingOnly(targetAccount) && ' · not counted in Cash Flow'}
                        </div>
                      )
                    })()}
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
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {(item.tags ?? []).map((t) => (
                  <span key={t} className="flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-[10px] text-gold">
                    {t}
                    <button onClick={() => removeTagFromItem(item.id, t)} className="hover:text-accent-red">
                      ✕
                    </button>
                  </span>
                ))}
                <input
                  value={tagDraftFor[item.id] ?? ''}
                  onChange={(e) => setTagDraftFor((cur) => ({ ...cur, [item.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      commitItemTagDraft(item.id)
                    }
                  }}
                  onBlur={() => commitItemTagDraft(item.id)}
                  placeholder="+ tag"
                  className="w-16 rounded-md border border-line bg-transparent px-1.5 py-0.5 text-[10px]"
                />
                {RECURRING_TAG_SUGGESTIONS.filter((t) => !(item.tags ?? []).includes(t)).map((t) => (
                  <button
                    key={t}
                    onClick={() => addTagToItem(item.id, t)}
                    className="rounded-full border border-line px-1.5 py-0.5 text-[10px] text-muted hover:border-gold/40 hover:text-gold"
                  >
                    +{t}
                  </button>
                ))}
              </div>
            </div>
          ),
        )}
        {items.length === 0 && <p className="text-sm text-muted">No recurring items yet — add one above.</p>}
      </div>
    </div>
  )
}
