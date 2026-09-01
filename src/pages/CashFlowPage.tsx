import { useMemo } from 'react'
import Card from '../components/Card'
import PageTitle from '../components/PageTitle'
import PeriodControls from '../components/PeriodControls'
import StatTile from '../components/StatTile'
import { usePeriod } from '../hooks/usePeriod'
import { useData } from '../hooks/DataContext'
import { formatMoney } from '../lib/format'

export default function CashFlowPage() {
  const period = usePeriod()
  const { data } = useData()

  const { income, expenses, investment, savings } = useMemo(() => {
    const inRange = data.transactions.filter((t) => t.date >= period.start && t.date <= period.end)
    const income = inRange.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)

    const investmentAccountIds = new Set(data.accounts.filter((a) => a.isInvestment).map((a) => a.id))
    const expenseTx = inRange.filter((t) => t.type === 'expense')
    const investment = expenseTx.filter((t) => t.accountId && investmentAccountIds.has(t.accountId)).reduce((s, t) => s + t.amount, 0)
    const expenses = expenseTx.reduce((s, t) => s + t.amount, 0) - investment
    const savings = income - expenses - investment
    return { income, expenses, investment, savings }
  }, [data.transactions, data.accounts, period.start, period.end])

  // Denominator that always fits the bar to 100%, whether or not you overspent this period.
  const denom = Math.max(income, expenses + investment, 1)
  const pct = (n: number) => Math.max(0, (n / denom) * 100)
  const hasInvestmentAccounts = data.accounts.some((a) => a.isInvestment)

  return (
    <div className="space-y-6">
      <PageTitle>Cash Flow</PageTitle>
      <PeriodControls period={period} />

      <Card title={period.label}>
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label="Income" value={formatMoney(income)} tone="good" />
          <StatTile label="Expenses" value={formatMoney(expenses)} tone="bad" />
          <StatTile label="Investment" value={formatMoney(investment)} />
          <StatTile label="Savings" value={formatMoney(savings)} tone={savings >= 0 ? 'good' : 'bad'} />
        </div>

        {income > 0 ? (
          <div>
            <div className="section-label mb-1">Where income went</div>
            <div className="flex h-3 overflow-hidden rounded-full bg-panel-hover">
              <div className="bg-accent-red" style={{ width: `${pct(expenses)}%` }} title={`Expenses ${formatMoney(expenses)}`} />
              <div className="bg-gold" style={{ width: `${pct(investment)}%` }} title={`Investment ${formatMoney(investment)}`} />
              {savings > 0 && <div className="bg-accent-green" style={{ width: `${pct(savings)}%` }} title={`Savings ${formatMoney(savings)}`} />}
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-accent-red" /> Expenses
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-gold" /> Investment
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-accent-green" /> Savings
              </span>
            </div>
            {savings < 0 && <p className="mt-3 text-xs text-accent-red">Overspent by {formatMoney(-savings)} this period.</p>}
          </div>
        ) : (
          <p className="text-sm text-muted">No income logged for this period yet.</p>
        )}
      </Card>

      {!hasInvestmentAccounts && (
        <Card>
          <p className="text-sm text-muted">
            Tip: mark an account as "Investment" on the Expenses page to have money you log there count toward the Investment
            bucket above instead of Expenses.
          </p>
        </Card>
      )}
    </div>
  )
}
