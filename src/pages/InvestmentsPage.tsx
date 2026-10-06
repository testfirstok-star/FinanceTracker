import { useMemo, useState, type FormEvent } from 'react'
import Card from '../components/Card'
import InvestmentAccountSection from '../components/InvestmentAccountSection'
import PageTitle from '../components/PageTitle'
import PeriodControls from '../components/PeriodControls'
import StatTile from '../components/StatTile'
import { usePeriod } from '../hooks/usePeriod'
import { useData } from '../hooks/DataContext'
import { formatMoney } from '../lib/format'
import { latestValue, moneyAtWork, periodView, valueSeries } from '../lib/investments'

export default function InvestmentsPage() {
  const { data, addInvestmentAccount } = useData()
  const period = usePeriod()
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
      currentValue += latestValue(acc, data.investmentValues) ?? accInvested
      income += accTx.filter((t) => t.type === 'investment_income').reduce((s, t) => s + t.amount, 0)
      expenses += accTx.filter((t) => t.type === 'investment_expense').reduce((s, t) => s + t.amount, 0)
    }
    const totalNet = currentValue + income - expenses
    const gain = totalNet - invested
    const gainPct = invested !== 0 ? (gain / invested) * 100 : 0
    return { invested, expenses, totalNet, gain, gainPct }
  }, [data.investmentAccounts, data.investmentTransactions, data.investmentValues])

  // Gain per portfolio for the chosen window, plus a combined figure. Each portfolio is measured
  // between its own nearest snapshots, so the rows carry their own dates rather than one shared pair.
  const inPeriod = useMemo(() => {
    const rows = data.investmentAccounts.map((acc) => ({
      account: acc,
      view: periodView(valueSeries(acc.id, data.investmentTransactions, data.investmentValues), period.start, period.end),
    }))
    const measured = rows.filter((r) => !r.view.tooFewPoints)
    const gain = measured.reduce((s, r) => s + r.view.gain, 0)
    const deposited = measured.reduce((s, r) => s + r.view.deposited, 0)
    const atWork = measured.reduce((s, r) => s + moneyAtWork(r.view), 0)
    return { rows, measured, gain, deposited, returnPct: atWork > 0 ? (gain / atWork) * 100 : undefined }
  }, [data.investmentAccounts, data.investmentTransactions, data.investmentValues, period.start, period.end])

  const gainTone = totals.gain >= 0 ? 'text-accent-green' : 'text-accent-red'
  const gainSign = totals.gain >= 0 ? '+' : ''

  return (
    <div className="space-y-4">
      <PageTitle>Investments</PageTitle>

      {data.investmentAccounts.length > 0 && (
        <>
          <PeriodControls period={period} />

          <Card title={`Gain — ${period.label}`}>
            {inPeriod.measured.length === 0 ? (
              <p className="text-sm text-muted">
                Nothing to measure in this range. Gain is worked out between two logged values, so log what a portfolio is worth
                at each end of the window, or widen the range.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <StatTile
                    label="Gain"
                    value={`${inPeriod.gain >= 0 ? '+' : ''}${formatMoney(inPeriod.gain)}`}
                    tone={inPeriod.gain >= 0 ? 'good' : 'bad'}
                  />
                  <StatTile label="You added" value={formatMoney(inPeriod.deposited)} sublabel="your own money" />
                  <StatTile
                    label="Return"
                    value={inPeriod.returnPct === undefined ? '—' : `${inPeriod.returnPct >= 0 ? '+' : ''}${inPeriod.returnPct.toFixed(2)}%`}
                    tone={inPeriod.gain >= 0 ? 'good' : 'bad'}
                    sublabel="on money at work"
                  />
                </div>
                <p className="mt-2 text-xs text-muted">
                  What the market did, with your own top-ups cancelled out. Each portfolio is measured between the values you
                  logged nearest the ends of this window, shown below — where the opening date predates the range, that's the
                  last value logged before it.
                </p>
                <div className="mt-3 space-y-1 border-t border-line pt-3">
                  {inPeriod.rows.map(({ account, view }) => (
                    <div key={account.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-text2">{account.name}</span>
                      {view.tooFewPoints ? (
                        <span className="text-muted">not enough logged values</span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span className="text-muted">
                            {view.opening?.date} → {view.closing?.date}
                          </span>
                          <span className={`font-figure font-medium ${view.gain >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                            {view.gain >= 0 ? '+' : ''}
                            {formatMoney(view.gain)}
                          </span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

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
          <p className="mt-3 text-xs text-muted">
            Everything above is lifetime to date, whatever period is selected.
          </p>
          <p className="mt-2 text-xs text-muted">
            Deposits and withdrawals show up on Cash Flow in the Invested tile, never as Income or Expenses, and they don't
            appear in any transaction list — moving money into a portfolio isn't spending it. Dividends and fees stay inside the portfolio
            unless you tick "paid out to / paid from my bank" when logging them. Logging what a portfolio is worth never moves
            money, so it changes the figures here and nothing on Cash Flow.
          </p>
        </Card>
        </>
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
            <InvestmentAccountSection key={acc.id} account={acc} period={period} />
          ))}
          {data.investmentAccounts.length === 0 && (
            <p className="text-sm text-muted">No investments yet — click "+ New investment" to add one.</p>
          )}
        </div>
      </Card>
    </div>
  )
}
