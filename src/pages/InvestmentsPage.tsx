import { useMemo, useState, type FormEvent } from 'react'
import Card from '../components/Card'
import InvestmentAccountSection from '../components/InvestmentAccountSection'
import PageTitle from '../components/PageTitle'
import { useData } from '../hooks/DataContext'
import { formatMoney } from '../lib/format'

export default function InvestmentsPage() {
  const { data, addInvestmentAccount } = useData()
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    addInvestmentAccount(newName)
    setNewName('')
    setAdding(false)
  }

  const totals = useMemo(() => {
    let invested = 0
    let currentValue = 0
    let income = 0
    let expenses = 0
    for (const acc of data.investmentAccounts) {
      const accTx = data.investmentTransactions.filter((t) => t.accountId === acc.id)
      const deposits = accTx.filter((t) => t.type === 'deposit').reduce((s, t) => s + t.amount, 0)
      const withdrawals = accTx.filter((t) => t.type === 'withdrawal').reduce((s, t) => s + t.amount, 0)
      const accInvested = deposits - withdrawals
      invested += accInvested
      currentValue += acc.currentValue ?? accInvested
      income += accTx.filter((t) => t.type === 'investment_income').reduce((s, t) => s + t.amount, 0)
      expenses += accTx.filter((t) => t.type === 'investment_expense').reduce((s, t) => s + t.amount, 0)
    }
    const totalNet = currentValue + income - expenses
    const gain = totalNet - invested
    const gainPct = invested !== 0 ? (gain / invested) * 100 : 0
    return { invested, expenses, totalNet, gain, gainPct }
  }, [data.investmentAccounts, data.investmentTransactions])

  const gainTone = totals.gain >= 0 ? 'text-accent-green' : 'text-accent-red'
  const gainSign = totals.gain >= 0 ? '+' : ''

  return (
    <div className="space-y-4">
      <PageTitle>Investments</PageTitle>

      {data.investmentAccounts.length > 0 && (
        <Card title="Overview">
          <div className="mb-3 rounded-lg bg-panel-hover p-4 text-center">
            <div className="section-label">Total net</div>
            <div className="font-figure text-2xl font-semibold text-gold">{formatMoney(totals.totalNet)}</div>
            <div className={`mt-1 text-sm font-medium ${gainTone}`}>
              {gainSign}
              {totals.gainPct.toFixed(2)}%
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-md bg-panel-hover p-2">
              <div className="text-xs text-muted">Invested</div>
              <div className="font-figure font-semibold">{formatMoney(totals.invested)}</div>
            </div>
            <div className="rounded-md bg-panel-hover p-2">
              <div className="text-xs text-muted">Gain / Loss</div>
              <div className={`font-figure font-semibold ${gainTone}`}>{formatMoney(totals.gain)}</div>
            </div>
            <div className="rounded-md bg-panel-hover p-2">
              <div className="text-xs text-muted">Expenses</div>
              <div className="font-figure font-semibold text-accent-red">{formatMoney(totals.expenses)}</div>
            </div>
          </div>
        </Card>
      )}

      <Card
        title="Manage investments"
        action={
          !adding && (
            <button onClick={() => setAdding(true)} className="rounded-md bg-gold px-3 py-1.5 text-sm font-medium text-ink hover:bg-gold-dark">
              + New investment
            </button>
          )
        }
      >
        {adding && (
          <form onSubmit={handleAdd} className="mb-4 flex gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Brokerage - Fidelity"
              className="flex-1 rounded-md border border-line px-3 py-1.5 text-sm bg-panel-hover"
            />
            <button type="submit" className="rounded-md bg-gold px-3 py-1.5 text-sm font-medium text-ink hover:bg-gold-dark">
              Create
            </button>
            <button type="button" onClick={() => setAdding(false)} className="text-sm text-muted hover:text-accent-red">
              Cancel
            </button>
          </form>
        )}

        <div className="space-y-3">
          {data.investmentAccounts.map((acc) => (
            <InvestmentAccountSection key={acc.id} account={acc} />
          ))}
          {data.investmentAccounts.length === 0 && (
            <p className="text-sm text-muted">No investments yet — click "+ New investment" to add one.</p>
          )}
        </div>
      </Card>
    </div>
  )
}
