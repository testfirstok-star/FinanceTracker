import { useMemo, useState, type FormEvent } from 'react'
import Card from '../components/Card'
import LoanCard from '../components/LoanCard'
import PageTitle from '../components/PageTitle'
import StatTile from '../components/StatTile'
import { useData } from '../hooks/DataContext'
import { formatMoney, todayStr } from '../lib/format'

export default function LoansPage() {
  const { data, addLoan } = useData()
  const [showArchived, setShowArchived] = useState(false)
  const [personName, setPersonName] = useState('')
  const [initialAmount, setInitialAmount] = useState('')
  const [initialDate, setInitialDate] = useState(todayStr())

  const loans = data.loans.filter((l) => (showArchived ? true : !l.archived))

  const totalOutstanding = useMemo(() => {
    return data.loans
      .filter((l) => !l.archived)
      .reduce((sum, l) => {
        const balance = data.loanTransactions
          .filter((t) => t.loanId === l.id)
          .reduce((s, t) => s + (t.type === 'lent' ? t.amount : -t.amount), 0)
        return sum + balance
      }, 0)
  }, [data.loans, data.loanTransactions])

  function handleAddLoan(e: FormEvent) {
    e.preventDefault()
    const amt = parseFloat(initialAmount)
    if (!personName.trim() || Number.isNaN(amt) || amt <= 0) return
    addLoan(personName, amt, initialDate)
    setPersonName('')
    setInitialAmount('')
    setInitialDate(todayStr())
  }

  return (
    <div className="space-y-6">
      <PageTitle>Loans</PageTitle>

      <Card title="Summary">
        <div className="max-w-xs">
          <StatTile label="Total outstanding" value={formatMoney(totalOutstanding)} tone={totalOutstanding > 0 ? 'bad' : undefined} />
        </div>
        <p className="mt-3 text-xs text-muted">
          Loans are tracked separately from Income and Expenses — new loans and repayments show up on the Cash Flow page instead.
        </p>
      </Card>

      <Card title="New loan">
        <form onSubmit={handleAddLoan} className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <input
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            placeholder="Person's name"
            className="rounded-md border border-line px-3 py-1.5 text-sm bg-panel-hover sm:col-span-2"
          />
          <input
            type="number"
            step="0.01"
            min="0"
            value={initialAmount}
            onChange={(e) => setInitialAmount(e.target.value)}
            placeholder="Initial amount"
            className="rounded-md border border-line px-3 py-1.5 text-sm bg-panel-hover"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={initialDate}
              onChange={(e) => setInitialDate(e.target.value)}
              className="flex-1 rounded-md border border-line px-3 py-1.5 text-sm bg-panel-hover"
            />
            <button type="submit" className="rounded-md bg-gold px-3 py-1.5 text-sm font-medium text-ink hover:bg-gold-dark">
              Add
            </button>
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        {loans.map((loan) => (
          <LoanCard key={loan.id} loan={loan} />
        ))}
        {loans.length === 0 && <p className="text-sm text-muted">No loans yet — add one above.</p>}
      </div>

      <button onClick={() => setShowArchived((s) => !s)} className="text-xs text-muted hover:text-text2">
        {showArchived ? 'Hide settled/removed loans' : 'Show settled/removed loans'}
      </button>
    </div>
  )
}
