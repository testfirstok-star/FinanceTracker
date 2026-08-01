import { useMemo, useState, type FormEvent } from 'react'
import { useData } from '../hooks/DataContext'
import { parseChatEntry } from '../lib/parseChatEntry'
import { formatMoney } from '../lib/format'
import type { EntryType } from '../types'

interface FeedItem {
  id: string
  text: string
  result: string
  isError: boolean
}

interface PendingEntry {
  description: string
  amount: number
  text: string
}

export default function ChatLogger() {
  const { data, addTransaction, addKeyword, activeCategories } = useData()
  const [input, setInput] = useState('')
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [pending, setPending] = useState<PendingEntry | null>(null)
  const [pendingType, setPendingType] = useState<EntryType>('expense')
  const [pendingCategoryId, setPendingCategoryId] = useState('')
  const [rememberKeyword, setRememberKeyword] = useState(true)

  const categories = activeCategories(pendingType)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return

    const result = parseChatEntry(text, data.keywords, null)
    if ('error' in result) {
      setFeed((f) => [{ id: crypto.randomUUID(), text, result: result.error, isError: true }, ...f])
      setInput('')
      return
    }

    if (result.matched && result.categoryId) {
      const catName = data.categories.find((c) => c.id === result.categoryId)?.name ?? 'Uncategorized'
      addTransaction({ description: result.description, categoryId: result.categoryId, amount: result.amount, type: result.type })
      setFeed((f) => [
        { id: crypto.randomUUID(), text, result: `Logged ${formatMoney(result.amount)} → ${catName} (${result.type})`, isError: false },
        ...f,
      ])
      setInput('')
    } else {
      setPending({ description: result.description, amount: result.amount, text })
      setPendingType('expense')
      setPendingCategoryId('')
      setInput('')
    }
  }

  function confirmPending() {
    if (!pending || !pendingCategoryId) return
    addTransaction({ description: pending.description, categoryId: pendingCategoryId, amount: pending.amount, type: pendingType })
    const catName = data.categories.find((c) => c.id === pendingCategoryId)?.name ?? 'Uncategorized'

    if (rememberKeyword) {
      const firstWord = pending.description.toLowerCase().split(/\s+/)[0]
      if (firstWord) addKeyword(firstWord, pendingCategoryId, pendingType)
    }

    setFeed((f) => [
      { id: crypto.randomUUID(), text: pending.text, result: `Logged ${formatMoney(pending.amount)} → ${catName} (${pendingType})`, isError: false },
      ...f,
    ])
    setPending(null)
  }

  const recentFeed = useMemo(() => feed.slice(0, 8), [feed])

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Try "lunch 12" or "salary 3000"'
          className="flex-1 rounded-md border border-line px-3 py-2 text-sm bg-panel-hover"
        />
        <button type="submit" className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-dark">
          Send
        </button>
      </form>

      {pending && (
        <div className="mt-3 rounded-md border border-gold/40 bg-gold/10 p-3 text-sm">
          <p className="mb-2">
            Couldn't auto-categorize "<strong>{pending.description}</strong>" ({formatMoney(pending.amount)}). Pick a type &amp; category:
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={pendingType}
              onChange={(e) => {
                setPendingType(e.target.value as EntryType)
                setPendingCategoryId('')
              }}
              className="rounded-md border border-line px-2 py-1 text-sm bg-panel-hover"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <select
              value={pendingCategoryId}
              onChange={(e) => setPendingCategoryId(e.target.value)}
              className="rounded-md border border-line px-2 py-1 text-sm bg-panel-hover"
            >
              <option value="">Category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-xs text-muted">
              <input type="checkbox" checked={rememberKeyword} onChange={(e) => setRememberKeyword(e.target.checked)} />
              remember this keyword
            </label>
            <button
              onClick={confirmPending}
              disabled={!pendingCategoryId}
              className="rounded-md bg-gold px-3 py-1 text-sm font-medium text-ink hover:bg-gold-dark disabled:opacity-40"
            >
              Confirm
            </button>
            <button onClick={() => setPending(null)} className="text-sm text-muted hover:text-accent-red">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {recentFeed.map((item) => (
          <div key={item.id} className="text-sm">
            <div className="inline-block rounded-lg bg-panel-hover px-3 py-1.5">{item.text}</div>
            <div className={`ml-2 mt-1 text-xs ${item.isError ? 'text-accent-red' : 'text-muted'}`}>{item.result}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
