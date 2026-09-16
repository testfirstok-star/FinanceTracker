import { useMemo } from 'react'
import Card from '../components/Card'
import PageTitle from '../components/PageTitle'
import PeriodControls from '../components/PeriodControls'
import StatTile from '../components/StatTile'
import { usePeriod } from '../hooks/usePeriod'
import { useData } from '../hooks/DataContext'
import { formatMoney } from '../lib/format'
import { summarize } from '../lib/cashflow'

export default function CashFlowPage() {
  const period = usePeriod()
  const { data } = useData()

  const summary = useMemo(() => summarize(data, period.start, period.end), [data, period.start, period.end])
  const { income, expenses, invested, cardTracked, loansGiven, loansRepaid, surplus } = summary
  const netLoanOut = loansGiven - loansRepaid

  // The pool the bar divides up: Income, plus any net loan repayments received this period — that's
  // real cash landing back in your hands beyond Income, so it can inflate Savings past 100% of Income
  // alone. Falls back to the segments' own total when you overspent, so the bar still always fits.
  const loanRepaymentInflow = Math.max(-netLoanOut, 0)
  const pool = income + loanRepaymentInflow
  const denom = Math.max(pool, expenses + invested + Math.max(netLoanOut, 0), 1)
  const pct = (n: number) => Math.max(0, (n / denom) * 100)
  const pctOfIncome = (n: number) => (income > 0 ? `${Math.round((n / income) * 100)}% of income` : undefined)
  const hasInvestmentSource = data.accounts.some((a) => a.kind === 'invest') || data.investmentAccounts.length > 0

  return (
    <div className="space-y-6">
      <PageTitle>Cash Flow</PageTitle>
      <PeriodControls period={period} />

      <Card title={period.label}>
        <div className="mb-3">
          <StatTile
            label="Surplus"
            value={formatMoney(surplus)}
            tone={surplus >= 0 ? 'good' : 'bad'}
            sublabel={surplus < 0 ? `Overspent by ${formatMoney(-surplus)}` : pctOfIncome(surplus)}
            big
          />
        </div>
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label="Income" value={formatMoney(income)} tone="good" accent="bg-accent-green" />
          <StatTile label="Expenses" value={formatMoney(expenses)} tone="bad" accent="bg-accent-red" sublabel={pctOfIncome(expenses)} />
          <StatTile label="Invested" value={formatMoney(invested)} accent="bg-gold" sublabel={pctOfIncome(invested)} />
          <StatTile
            label="Loans (net)"
            value={netLoanOut === 0 ? formatMoney(0) : formatMoney(Math.abs(netLoanOut))}
            tone={netLoanOut < 0 ? 'good' : undefined}
            accent="bg-accent-blue"
            sublabel={netLoanOut > 0 ? 'lent out, net' : netLoanOut < 0 ? 'repaid to you, net' : 'no activity'}
          />
        </div>

        {income > 0 ? (
          <div>
            <div className="section-label mb-1">Where the money went</div>
            <div className="flex h-3 overflow-hidden rounded-full bg-panel-hover">
              {expenses > 0 && (
                <div className="bg-accent-red" style={{ width: `${pct(expenses)}%` }} title={`Expenses ${formatMoney(expenses)}`} />
              )}
              {invested > 0 && (
                <div className="bg-gold" style={{ width: `${pct(invested)}%` }} title={`Invested ${formatMoney(invested)}`} />
              )}
              {netLoanOut > 0 && (
                <div className="bg-accent-blue" style={{ width: `${pct(netLoanOut)}%` }} title={`Loans (net) ${formatMoney(netLoanOut)}`} />
              )}
              {surplus > 0 && <div className="bg-accent-green" style={{ width: `${pct(surplus)}%` }} title={`Surplus ${formatMoney(surplus)}`} />}
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted">
              {expenses > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-accent-red" /> Expenses
                </span>
              )}
              {invested > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-gold" /> Invested
                </span>
              )}
              {netLoanOut > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-accent-blue" /> Loans
                </span>
              )}
              {surplus > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-accent-green" /> Surplus
                </span>
              )}
            </div>
            {loanRepaymentInflow > 0 && (
              <p className="mt-2 text-[11px] text-muted">
                Includes {formatMoney(loanRepaymentInflow)} in loan repayments received this period.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">No income logged for this period yet.</p>
        )}

        {cardTracked > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-xs text-muted">
            <span className="mt-0.5 text-gold">⋯</span>
            <span>
              Card purchases tracked: <span className="font-figure text-text2">{formatMoney(cardTracked)}</span> — covered by the
              card bills you log from a Cash account, so not counted above.
            </span>
          </div>
        )}
      </Card>

      {!hasInvestmentSource && (
        <Card>
          <p className="text-sm text-muted">
            Tip: the Invested figure above picks up deposits/withdrawals from the Investments page automatically, or you can set an
            account's kind to Invest on the Expenses page to have money you log there count toward it instead of Expenses.
          </p>
        </Card>
      )}
    </div>
  )
}
