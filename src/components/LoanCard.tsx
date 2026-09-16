import { useState, type FormEvent } from 'react'
import { useData } from '../hooks/DataContext'
import type { Loan, LoanEntryType } from '../types'
import { formatMoney, todayStr } from '../lib/format'
import Collapsible from './Collapsible'

/** What the inline form is logging. Interest is income; the other two move principal. */
type EntryMode = LoanEntryType | 'interest'

export default function LoanCard({ loan }: { loan: Loan }) {
  const {
    data,
    renameLoan,
    archiveLoan,
    restoreLoan,
    addLoanTransaction,
    addLoanInterest,
    updateLoanTransaction,
    removeLoanTransaction,
    removeTransaction,
  } = useData()
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(loan.personName)
  const [mode, setMode] = useState<EntryMode | null>(null)
  // Set when a repayment came in bigger than the balance, so the user can say whether the excess
  // is interest (income) or more principal coming back (not income).
  const [overpay, setOverpay] = useState<{ amount: number; date: string; description: string } | null>(null)
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
  // Principal only — interest never changes what they still owe you.
  const balance = txs.reduce((s, t) => s + (t.type === 'lent' ? t.amount : -t.amount), 0)
  const interestTxs = data.transactions.filter((t) => t.loanId === loan.id)
  const interestTotal = interestTxs.reduce((s, t) => s + t.amount, 0)
  /** Principal movements and interest income in one date-sorted list. */
  const ledger = [
    ...txs.map((t) => ({ id: t.id, date: t.date, createdAt: t.createdAt, amount: t.amount, description: t.description, kind: t.type as EntryMode })),
    ...interestTxs.map((t) => ({ id: t.id, date: t.date, createdAt: t.createdAt, amount: t.amount, description: t.description, kind: 'interest' as EntryMode })),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)

  function saveName() {
    if (nameDraft.trim()) renameLoan(loan.id, nameDraft)
    setEditingName(false)
  }

  function resetForm() {
    setAmount('')
    setDescription('')
    setMode(null)
  }

  function submitEntry(e: FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!mode || Number.isNaN(amt) || amt <= 0) return
    if (mode === 'interest') {
      addLoanInterest({ loanId: loan.id, amount: amt, date, description: description.trim() || undefined })
      resetForm()
      return
    }
    // Paying back more than is owed usually means the extra is interest. Ask rather than silently
    // pushing the balance negative and treating earnings as principal.
    if (mode === 'repaid' && amt > balance && balance > 0) {
      setOverpay({ amount: amt, date, description: description.trim() })
      return
    }
    addLoanTransaction({ loanId: loan.id, type: mode, amount: amt, date, description: description.trim() || undefined })
    resetForm()
  }

  /** Splits an over-repayment into principal up to the balance plus interest for the excess. */
  function settleOverpayAsInterest() {
    if (!overpay) return
    const excess = overpay.amount - balance
    addLoanTransaction({ loanId: loan.id, type: 'repaid', amount: balance, date: overpay.date, description: overpay.description || undefined })
    addLoanInterest({ loanId: loan.id, amount: excess, date: overpay.date, description: overpay.description || undefined })
    setOverpay(null)
    resetForm()
  }

  function settleOverpayAsPrincipal() {
    if (!overpay) return
    addLoanTransaction({ loanId: loan.id, type: 'repaid', amount: overpay.amount, date: overpay.date, description: overpay.description || undefined })
    setOverpay(null)
    resetForm()
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

      {interestTotal > 0 && (
        <div className="mt-0.5 text-[10px] text-muted">
          Interest received: <span className="font-figure text-accent-green">{formatMoney(interestTotal)}</span> — counted as income,
          separately from the {formatMoney(balance)} of principal outstanding.
        </div>
      )}

      {!loan.archived && (
        <div className="mt-2 flex flex-wrap gap-2">
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
          <button
            onClick={() => setMode(mode === 'interest' ? null : 'interest')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              mode === 'interest' ? 'bg-gold/20 text-gold' : 'border border-line text-muted hover:border-gold/40 hover:text-gold'
            }`}
            title="Interest is income — unlike the principal coming back"
          >
            + Log interest
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
            className={`rounded-md px-3 py-1 text-xs font-medium ${
              mode === 'repaid' ? 'bg-accent-green/20 text-accent-green' : mode === 'interest' ? 'bg-gold/20 text-gold' : 'bg-accent-red/20 text-accent-red'
            }`}
          >
            {mode === 'repaid' ? 'Log repayment' : mode === 'interest' ? 'Log interest' : 'Log loan'}
          </button>
        </form>
      )}

      {overpay && (
        <div className="mt-2 rounded-md border border-gold/40 bg-gold/5 p-2 text-xs">
          <p className="text-text2">
            That's <span className="font-figure">{formatMoney(overpay.amount - balance)}</span> more than the{' '}
            <span className="font-figure">{formatMoney(balance)}</span> they owe. Log the extra as interest?
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={settleOverpayAsInterest}
              className="rounded-md bg-gold px-3 py-1 text-xs font-medium text-ink hover:bg-gold-dark"
            >
              Yes, it's interest
            </button>
            <button
              onClick={settleOverpayAsPrincipal}
              className="rounded-md border border-line px-3 py-1 text-xs text-muted hover:text-text2"
            >
              No, all principal
            </button>
            <button onClick={() => setOverpay(null)} className="px-2 py-1 text-xs text-muted hover:text-accent-red">
              Cancel
            </button>
          </div>
        </div>
      )}

      {ledger.length > 0 && (
        <div className="mt-3">
          <Collapsible title="History">
            <div className="space-y-1.5">
              {ledger.map((t) =>
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
                      <span
                        className={
                          t.kind === 'lent' ? 'text-accent-red' : t.kind === 'interest' ? 'text-gold' : 'text-accent-green'
                        }
                      >
                        {t.kind === 'lent' ? 'Lent' : t.kind === 'interest' ? 'Interest' : 'Repaid'}
                      </span>
                      {t.kind === 'interest' && (
                        <span className="ml-1.5 rounded-full bg-gold/15 px-1.5 py-0.5 text-[10px] text-gold">income</span>
                      )}
                      {t.description && <span className="ml-1.5 text-muted">{t.description}</span>}
                      <div className="text-[10px] text-muted">{t.date}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-figure font-medium ${t.kind === 'interest' ? 'text-accent-green' : ''}`}>
                        {formatMoney(t.amount)}
                      </span>
                      {t.kind !== 'interest' && (
                        <button
                          onClick={() => startEditTx(t.id)}
                          className="-m-1.5 rounded-md p-1.5 text-muted transition-colors hover:bg-panel-hover hover:text-gold"
                          title="Edit"
                        >
                          ✎
                        </button>
                      )}
                      <button
                        onClick={() => (t.kind === 'interest' ? removeTransaction(t.id) : removeLoanTransaction(t.id))}
                        className="-m-1.5 rounded-md p-1.5 text-muted transition-colors hover:bg-panel-hover hover:text-accent-red"
                        title={t.kind === 'interest' ? 'Delete this interest income' : 'Delete'}
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
