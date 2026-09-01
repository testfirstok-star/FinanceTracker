import { useState, type FormEvent } from 'react'
import { useData } from '../hooks/DataContext'

export default function AccountManager() {
  const { data, addAccount, updateAccount, archiveAccount, restoreAccount } = useData()
  const [name, setName] = useState('')
  const [isInvestment, setIsInvestment] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const accounts = data.accounts.filter((a) => (showArchived ? true : !a.archived))

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    addAccount(name, isInvestment)
    setName('')
    setIsInvestment(false)
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Checking, Amex, Cash"
          className="flex-1 rounded-md border border-line px-3 py-1.5 text-xs bg-panel-hover"
        />
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <input type="checkbox" checked={isInvestment} onChange={(e) => setIsInvestment(e.target.checked)} className="accent-gold" />
          Investment account
        </label>
        <button type="submit" className="rounded-md bg-gold px-3 py-1.5 text-xs font-medium text-ink hover:bg-gold-dark">
          Add
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {accounts.map((a) => (
          <div
            key={a.id}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${a.archived ? 'border-line text-muted' : 'border-line text-text2'}`}
          >
            {editingId === a.id ? (
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => {
                  if (editName.trim()) updateAccount(a.id, { name: editName })
                  setEditingId(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (editName.trim()) updateAccount(a.id, { name: editName })
                    setEditingId(null)
                  }
                }}
                className="w-24 border-b border-gold bg-transparent text-xs outline-none"
              />
            ) : (
              <span
                onClick={() => {
                  setEditingId(a.id)
                  setEditName(a.name)
                }}
                className="cursor-pointer"
                title="Click to rename"
              >
                {a.name}
              </span>
            )}
            <button
              onClick={() => updateAccount(a.id, { isInvestment: !a.isInvestment })}
              className={`rounded-full px-2 py-0.5 text-[10px] ${
                a.isInvestment ? 'bg-gold/20 text-gold' : 'border border-line text-muted hover:border-gold/40 hover:text-gold'
              }`}
              title={
                a.isInvestment
                  ? 'Counts toward Investment on the Cash Flow page — click to unmark'
                  : 'Click to mark as an Investment account'
              }
            >
              {a.isInvestment ? '✓ Investment' : 'Mark as investment'}
            </button>
            {a.archived ? (
              <button onClick={() => restoreAccount(a.id)} className="text-gold hover:text-gold-dark" title="Restore">
                ↺
              </button>
            ) : (
              <button onClick={() => archiveAccount(a.id)} className="text-muted hover:text-accent-red" title="Remove">
                ✕
              </button>
            )}
          </div>
        ))}
        {accounts.length === 0 && <p className="text-xs text-muted">No accounts yet — add one above.</p>}
      </div>

      <button onClick={() => setShowArchived((s) => !s)} className="mt-3 text-xs text-muted hover:text-text2">
        {showArchived ? 'Hide removed accounts' : 'Show removed accounts'}
      </button>
    </div>
  )
}
