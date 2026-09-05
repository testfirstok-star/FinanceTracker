import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { useData } from '../hooks/DataContext'
import { hasTag, SUGGESTED_TAGS } from '../lib/tags'

function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase()
}

export default function AccountManager() {
  const { data, addAccount, updateAccount, archiveAccount, restoreAccount } = useData()
  const [name, setName] = useState('')
  const [newTags, setNewTags] = useState<string[]>([])
  const [tagDraft, setTagDraft] = useState('')
  const [newExcludeFromCashFlow, setNewExcludeFromCashFlow] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [tagDraftFor, setTagDraftFor] = useState<Record<string, string>>({})

  const accounts = data.accounts.filter((a) => (showArchived ? true : !a.archived))

  function addDraftTag() {
    const tag = normalizeTag(tagDraft)
    setTagDraft('')
    if (!tag || newTags.includes(tag)) return
    setNewTags((t) => [...t, tag])
  }

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    addAccount(name, newTags, newExcludeFromCashFlow)
    setName('')
    setNewTags([])
    setTagDraft('')
    setNewExcludeFromCashFlow(false)
  }

  function addTagToAccount(accountId: string, rawTag: string) {
    const tag = normalizeTag(rawTag)
    const acc = data.accounts.find((a) => a.id === accountId)
    if (!acc || !tag || (acc.tags ?? []).includes(tag)) return
    updateAccount(accountId, { tags: [...(acc.tags ?? []), tag] })
  }

  function removeTagFromAccount(accountId: string, tag: string) {
    const acc = data.accounts.find((a) => a.id === accountId)
    if (!acc) return
    updateAccount(accountId, { tags: (acc.tags ?? []).filter((t) => t !== tag) })
  }

  function commitAccountTagDraft(accountId: string) {
    addTagToAccount(accountId, tagDraftFor[accountId] ?? '')
    setTagDraftFor((cur) => ({ ...cur, [accountId]: '' }))
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="mb-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Checking, Amex, Cash"
            className="flex-1 rounded-md border border-line px-3 py-1.5 text-xs bg-panel-hover"
          />
          <button type="submit" className="rounded-md bg-gold px-3 py-1.5 text-xs font-medium text-ink hover:bg-gold-dark">
            Add
          </button>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <input
            type="checkbox"
            checked={!newExcludeFromCashFlow}
            onChange={(e) => setNewExcludeFromCashFlow(!e.target.checked)}
            className="accent-gold"
          />
          Log into Cash Flow
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
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
          {SUGGESTED_TAGS.filter((t) => !newTags.includes(t)).map((t) => (
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
        {accounts.map((a) => (
          <div key={a.id} className={`rounded-lg border px-3 py-2 ${a.archived ? 'border-line text-muted' : 'border-line'}`}>
            <div className="flex items-center justify-between gap-2">
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
                  className="w-32 border-b border-gold bg-transparent text-sm outline-none"
                />
              ) : (
                <span
                  onClick={() => {
                    setEditingId(a.id)
                    setEditName(a.name)
                  }}
                  className="cursor-pointer text-sm text-text2"
                  title="Click to rename"
                >
                  {a.name}
                </span>
              )}
              {a.archived ? (
                <button onClick={() => restoreAccount(a.id)} className="text-xs text-gold hover:text-gold-dark" title="Restore">
                  ↺ Restore
                </button>
              ) : (
                <button onClick={() => archiveAccount(a.id)} className="text-xs text-muted hover:text-accent-red" title="Remove">
                  ✕
                </button>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {(a.tags ?? []).map((t) => (
                <span key={t} className="flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-[10px] text-gold">
                  {t}
                  <button onClick={() => removeTagFromAccount(a.id, t)} className="hover:text-accent-red">
                    ✕
                  </button>
                </span>
              ))}
              <input
                value={tagDraftFor[a.id] ?? ''}
                onChange={(e) => setTagDraftFor((cur) => ({ ...cur, [a.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault()
                    commitAccountTagDraft(a.id)
                  }
                }}
                onBlur={() => commitAccountTagDraft(a.id)}
                placeholder="+ tag"
                className="w-16 rounded-md border border-line bg-transparent px-1.5 py-0.5 text-[10px]"
              />
              {SUGGESTED_TAGS.filter((t) => !(a.tags ?? []).includes(t)).map((t) => (
                <button
                  key={t}
                  onClick={() => addTagToAccount(a.id, t)}
                  className="rounded-full border border-line px-1.5 py-0.5 text-[10px] text-muted hover:border-gold/40 hover:text-gold"
                >
                  +{t}
                </button>
              ))}
            </div>
            <label className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted">
              <input
                type="checkbox"
                checked={!a.excludeFromCashFlow}
                onChange={() => updateAccount(a.id, { excludeFromCashFlow: !a.excludeFromCashFlow })}
                className="accent-gold"
              />
              Log into Cash Flow
            </label>
            {a.excludeFromCashFlow && (
              <p className="mt-1 text-[10px] text-muted italic">
                {hasTag(a, 'invest')
                  ? "Expenses logged here count toward Investment, not the Expenses total."
                  : "Expenses logged here won't be counted in Cash Flow — tracked separately."}
              </p>
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
