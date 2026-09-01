import { useState, type FormEvent } from 'react'
import { useData } from '../hooks/DataContext'
import type { Loan, LoanEntryType } from '../types'
import { formatMoney, todayStr } from '../lib/format'
import Collapsible from './Collapsible'

export default function LoanCard({ loan }: { loan: Loan }) {
  const { data, renameLoan, archiveLoan, restoreLoan, addLoanTransaction, updateLoanTransaction, removeLoanTransaction } = useData()
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(loan.personName)
  const [mode, setMode] = useState<LoanEntryType | null>(null)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayStr())
  const [description, setDescription] = useState('')
  const [editingTxId, setEditingTxId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const txs = data.loanTransactions
    .filter((t) => t.loanId === loan.id)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
  const balance = txs.reduce((s, t) => s + (t.type === 'lent' ? t.amount : -t.amount), 0)

  function saveName() {
    if (nameDraft.trim()) renameLoan(loan.id, nameDraft)
    setEditingName(false)
  }

  function submitEntry(e: FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!mode || Number.isNaN(amt) || amt <= 0) return
    addLoanTransaction({ loanId: loan.id, type: mode, amount: amt, date, description: description.trim() || undefined })
    setAmount('')
    setDescription('')
    setMode(null)
  }

  function startEditTx(txId: string) {
    const tx = txs.find((t) => t.id === txId)
    if (!tx) return
    setEditingTxId(txId)
    setEditAmount(String(tx.amount))
    setEditDate(tx.date)
    setEditDescription(tx.description ?? '')
  }

  function saveEditTx(txId: string) {
    const amt = parseFloat(editAmount)
    if (Number.isNaN(amt) || amt <= 0 || !editDate) return
    updateLoanTransaction(txId, { amount: amt, date: editDate, description: editDescription.trim() || undefined })
    setEditingTxId(null)
  }

  return (
    <div className={`rounded-xl border px-4 py-3 ${loan.archived ? 'border-line opacity-60' : 'border-line'}`}>
      <div className="flex items-center justify-between gap-2">
        {editingName ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
            className="border-b border-gold bg-transparent text-sm font-medium outline-none"
          />
        ) : (
          <span onClick={() => setEditingName(true)} className="cursor-pointer text-sm font-medium text-text" title="Click to rename">
            {loan.personName}
          </span>
        )}
        <div className="flex items-center gap-2">
          <span className={`font-figure text-sm font-semibold ${balance > 0 ? 'text-accent-red' : balance < 0 ? 'text-accent-green' : 'text-muted'}`}>
            {formatMoney(balance)}
          </span>
          {loan.archived ? (
            <button
              onClick={() => restoreLoan(loan.id)}
              className="-m-1.5 rounded-md p-1.5 text-xs text-gold transition-colors hover:bg-panel-hover hover:text-gold-dark"
              title="Restore"
            >
              ↺
            </button>
          ) : (
            <button
              onClick={() => archiveLoan(loan.id)}
              className="-m-1.5 rounded-md p-1.5 text-xs text-muted transition-colors hover:bg-panel-hover hover:text-accent-red"
              title="Archive"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {!loan.archived && (
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => setMode(mode === 'repaid' ? null : 'repaid')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              mode === 'repaid' ? 'bg-accent-green/20 text-accent-green' : 'border border-line text-muted hover:border-gold/40 hover:text-gold'
            }`}
          >
            + Log repayment
          </button>
          <button
            onClick={() => setMode(mode === 'lent' ? null : 'lent')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              mode === 'lent' ? 'bg-accent-red/20 text-accent-red' : 'border border-line text-muted hover:border-gold/40 hover:text-gold'
            }`}
          >
            + Log more loan
          </button>
        </div>
      )}

      {mode && (
        <form onSubmit={submitEntry} className="mt-2 grid grid-cols-1 gap-1.5 rounded-md border border-line p-2 sm:grid-cols-4">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-line bg-panel-hover px-2 py-1 text-xs"
          />
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="rounded-md border border-line bg-panel-hover px-2 py-1 text-xs"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Note (optional)"
            className="rounded-md border border-line bg-panel-hover px-2 py-1 text-xs"
          />
          <button
            type="submit"
            className={`rounded-md px-3 py-1 text-xs font-medium ${mode === 'repaid' ? 'bg-accent-green/20 text-accent-green' : 'bg-accent-red/20 text-accent-red'}`}
          >
            {mode === 'repaid' ? 'Log repayment' : 'Log loan'}
          </button>
        </form>
      )}

      {txs.length > 0 && (
        <div className="mt-3">
          <Collapsible title="History">
            <div className="space-y-1.5">
              {txs.map((t) =>
                editingTxId === t.id ? (
                  <div key={t.id} className="grid grid-cols-1 gap-1.5 rounded-md border border-gold/40 p-2 sm:grid-cols-2">
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="rounded-md border border-line bg-panel-hover px-2 py-1 text-xs"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="rounded-md border border-line bg-panel-hover px-2 py-1 text-xs"
                    />
                    <input
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Note"
                      className="rounded-md border border-line bg-panel-hover px-2 py-1 text-xs sm:col-span-2"
                    />
                    <div className="flex gap-2 sm:col-span-2">
                      <button
                        onClick={() => saveEditTx(t.id)}
                        className="flex-1 rounded-md bg-gold px-3 py-1.5 text-xs font-medium text-ink hover:bg-gold-dark"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingTxId(null)}
                        className="flex-1 rounded-md border border-line px-3 py-1.5 text-xs text-muted hover:border-accent-red/40 hover:text-accent-red"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={t.id} className="flex items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-xs">
                    <div>
                      <span className={t.type === 'lent' ? 'text-accent-red' : 'text-accent-green'}>{t.type === 'lent' ? 'Lent' : 'Repaid'}</span>
                      {t.description && <span className="ml-1.5 text-muted">{t.description}</span>}
                      <div className="text-[10px] text-muted">{t.date}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-figure font-medium">{formatMoney(t.amount)}</span>
                      <button
                        onClick={() => startEditTx(t.id)}
                        className="-m-1.5 rounded-md p-1.5 text-muted transition-colors hover:bg-panel-hover hover:text-gold"
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => removeLoanTransaction(t.id)}
                        className="-m-1.5 rounded-md p-1.5 text-muted transition-colors hover:bg-panel-hover hover:text-accent-red"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          </Collapsible>
        </div>
      )}
    </div>
  )
}
