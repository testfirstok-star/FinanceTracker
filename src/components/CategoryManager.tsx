import { useState, type FormEvent } from 'react'
import { useData } from '../hooks/DataContext'
import type { EntryType } from '../types'

export default function CategoryManager({ type }: { type: EntryType }) {
  const { data, addCategory, archiveCategory, restoreCategory, renameCategory } = useData()
  const [name, setName] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const categories = data.categories.filter((c) => c.type === type && (showArchived ? true : !c.archived))

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    addCategory(name, type)
    setName('')
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="mb-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name"
          className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
        <button type="submit" className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
          Add
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <div
            key={c.id}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
              c.archived
                ? 'border-slate-200 text-slate-400 dark:border-slate-700'
                : 'border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200'
            }`}
          >
            {editingId === c.id ? (
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => {
                  if (editName.trim()) renameCategory(c.id, editName)
                  setEditingId(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (editName.trim()) renameCategory(c.id, editName)
                    setEditingId(null)
                  }
                }}
                className="w-24 border-b border-indigo-400 bg-transparent text-sm outline-none"
              />
            ) : (
              <span
                onClick={() => {
                  setEditingId(c.id)
                  setEditName(c.name)
                }}
                className="cursor-pointer"
                title="Click to rename"
              >
                {c.name}
              </span>
            )}
            {c.archived ? (
              <button onClick={() => restoreCategory(c.id)} className="text-indigo-500 hover:text-indigo-700" title="Restore">
                ↺
              </button>
            ) : (
              <button onClick={() => archiveCategory(c.id)} className="text-slate-400 hover:text-red-500" title="Remove">
                ✕
              </button>
            )}
          </div>
        ))}
        {categories.length === 0 && <p className="text-sm text-slate-400">No categories yet.</p>}
      </div>

      <button onClick={() => setShowArchived((s) => !s)} className="mt-3 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
        {showArchived ? 'Hide removed categories' : 'Show removed categories'}
      </button>
    </div>
  )
}
