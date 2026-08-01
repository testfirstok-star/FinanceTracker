import { useState, type FormEvent } from 'react'
import { useData } from '../hooks/DataContext'
import type { EntryType } from '../types'

export default function KeywordManager() {
  const { data, addKeyword, updateKeyword, removeKeyword, activeCategories } = useData()
  const [type, setType] = useState<EntryType>('expense')
  const [keyword, setKeyword] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const categories = activeCategories(type)
  const keywords = data.keywords.filter((k) => k.type === type)

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!keyword.trim() || !categoryId) return
    addKeyword(keyword, categoryId, type)
    setKeyword('')
    setCategoryId('')
  }

  return (
    <div>
      <div className="mb-3 flex gap-1">
        <button
          onClick={() => setType('expense')}
          className={`rounded-md px-2 py-1 text-xs font-medium ${type === 'expense' ? 'bg-gold text-ink' : 'bg-panel-hover'}`}
        >
          Expense keywords
        </button>
        <button
          onClick={() => setType('income')}
          className={`rounded-md px-2 py-1 text-xs font-medium ${type === 'income' ? 'bg-gold text-ink' : 'bg-panel-hover'}`}
        >
          Income keywords
        </button>
      </div>

      <form onSubmit={handleAdd} className="mb-3 flex flex-wrap gap-2">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Keyword (e.g. lunch)"
          className="flex-1 rounded-md border border-line px-2 py-1 text-sm bg-panel-hover"
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
        <button type="submit" className="rounded-md bg-gold px-3 py-1 text-sm font-medium text-ink hover:bg-gold-dark">
          Add
        </button>
      </form>

      <div className="max-h-56 overflow-auto rounded-md border border-line">
        <table className="w-full text-left text-sm">
          <tbody>
            {keywords.map((k) => (
              <tr key={k.id} className="border-t border-line first:border-t-0">
                <td className="px-3 py-1.5">{k.keyword}</td>
                <td className="px-3 py-1.5">
                  {editingId === k.id ? (
                    <select
                      autoFocus
                      defaultValue={k.categoryId}
                      onChange={(e) => {
                        updateKeyword(k.id, k.keyword, e.target.value)
                        setEditingId(null)
                      }}
                      className="rounded-md border border-line px-1 py-0.5 text-xs bg-panel-hover"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      onClick={() => setEditingId(k.id)}
                      className="cursor-pointer rounded-full bg-panel-hover px-2 py-0.5 text-xs"
                      title="Click to change category"
                    >
                      {data.categories.find((c) => c.id === k.categoryId)?.name ?? 'Unknown'}
                    </span>
                  )}
                </td>
                <td className="px-3 py-1.5 text-right">
                  <button onClick={() => removeKeyword(k.id)} className="text-muted hover:text-accent-red">
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {keywords.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-center text-muted">
                  No keywords yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
