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
          className="flex-1 rounded-md border border-line px-3 py-1.5 text-xs bg-panel-hover"
        />
        <button type="submit" className="rounded-md bg-gold px-3 py-1.5 text-xs font-medium text-ink hover:bg-gold-dark">
          Add
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <div
            key={c.id}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
              c.archived
                ? 'border-line text-muted'
                : 'border-line text-text2 text-text2'
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
                className="w-24 border-b border-gold bg-transparent text-xs outline-none"
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
              <button onClick={() => restoreCategory(c.id)} className="text-gold hover:text-gold-dark" title="Restore">
                ↺
              </button>
            ) : (
              <button onClick={() => archiveCategory(c.id)} className="text-muted hover:text-accent-red" title="Remove">
                ✕
              </button>
            )}
          </div>
        ))}
        {categories.length === 0 && <p className="text-xs text-muted">No categories yet.</p>}
      </div>

      <button onClick={() => setShowArchived((s) => !s)} className="mt-3 text-xs text-muted hover:text-text2">
        {showArchived ? 'Hide removed categories' : 'Show removed categories'}
      </button>
    </div>
  )
}
