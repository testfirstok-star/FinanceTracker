import { useMemo } from 'react'
import Card from '../components/Card'
import PageTitle from '../components/PageTitle'
import PeriodControls from '../components/PeriodControls'
import StatTile from '../components/StatTile'
import { usePeriod } from '../hooks/usePeriod'
import { useData } from '../hooks/DataContext'
import { formatMoney } from '../lib/format'
import { hasTag } from '../lib/tags'

export default function CashFlowPage() {
  const period = usePeriod()
  const { data } = useData()

  const { income, expenses, investment, excludedTracking, netLoanOut, savings } = useMemo(() => {
    const inRange = data.transactions.filter((t) => t.date >= period.start && t.date <= period.end)
    const income = inRange.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)

    const investmentAccountIds = new Set(data.accounts.filter((a) => hasTag(a, 'invest')).map((a) => a.id))
    // Accounts explicitly switched off Cash Flow (and not already counted toward Investment above).
    const excludedAccountIds = new Set(
      data.accounts.filter((a) => a.excludeFromCashFlow && !investmentAccountIds.has(a.id)).map((a) => a.id),
    )
    const expenseTx = inRange.filter((t) => t.type === 'expense')
    const investmentFromAccounts = expenseTx
      .filter((t) => t.accountId && investmentAccountIds.has(t.accountId))
      .reduce((s, t) => s + t.amount, 0)
    const excludedTracking = expenseTx
      .filter((t) => t.accountId && excludedAccountIds.has(t.accountId))
      .reduce((s, t) => s + t.amount, 0)
    const expenses = expenseTx
      .filter((t) => !t.accountId || (!investmentAccountIds.has(t.accountId) && !excludedAccountIds.has(t.accountId)))
      .reduce((s, t) => s + t.amount, 0)

    // Also pull in what's actually logged on the Investments page — deposits/withdrawals are real money
    // moving between your everyday cash and your portfolio, so they belong in this total too (dividends/fees
    // stay portfolio-internal and don't count here). This is on top of the lightweight "invest"-tagged
    // account bridge above, so either way of logging investment activity shows up here.
    const investmentTxInRange = data.investmentTransactions.filter((t) => t.date >= period.start && t.date <= period.end)
    const deposits = investmentTxInRange.filter((t) => t.type === 'deposit').reduce((s, t) => s + t.amount, 0)
    const withdrawals = investmentTxInRange.filter((t) => t.type === 'withdrawal').reduce((s, t) => s + t.amount, 0)
    const investment = investmentFromAccounts + deposits - withdrawals

    // Loans — money lent out or repaid this period. Real cash movement, so it factors into Savings
    // just like Investment, but it never touches Income/Expenses.
    const loanTxInRange = data.loanTransactions.filter((t) => t.date >= period.start && t.date <= period.end)
    const loansGiven = loanTxInRange.filter((t) => t.type === 'lent').reduce((s, t) => s + t.amount, 0)
    const loansRepaid = loanTxInRange.filter((t) => t.type === 'repaid').reduce((s, t) => s + t.amount, 0)
    const netLoanOut = loansGiven - loansRepaid

    // Spend on accounts explicitly excluded from Cash Flow is tracked separately (often a duplicate of a
    // bill you log elsewhere), so it doesn't factor into Savings — only real Expenses, Investment, and net
    // Loans outflows do.
    const savings = income - expenses - investment - netLoanOut
    return { income, expenses, investment, excludedTracking, netLoanOut, savings }
  }, [data.transactions, data.accounts, data.investmentTransactions, data.loanTransactions, period.start, period.end])

  // The pool the bar divides up: Income, plus any net loan repayments received this period — that's
  // real cash landing back in your hands beyond Income, so it can inflate Savings past 100% of Income
  // alone. Falls back to the segments' own total when you overspent, so the bar still always fits.
  const loanRepaymentInflow = Math.max(-netLoanOut, 0)
  const pool = income + loanRepaymentInflow
  const denom = Math.max(pool, expenses + investment + Math.max(netLoanOut, 0), 1)
  const pct = (n: number) => Math.max(0, (n / denom) * 100)
  const pctOfIncome = (n: number) => (income > 0 ? `${Math.round((n / income) * 100)}% of income` : undefined)
  const hasInvestmentSource = data.accounts.some((a) => hasTag(a, 'invest')) || data.investmentAccounts.length > 0

  return (
    <div className="space-y-6">
      <PageTitle>Cash Flow</PageTitle>
      <PeriodControls period={period} />

      <Card title={period.label}>
        <div className="mb-3">
          <StatTile
            label="Savings"
            value={formatMoney(savings)}
            tone={savings >= 0 ? 'good' : 'bad'}
            sublabel={savings < 0 ? `Overspent by ${formatMoney(-savings)}` : pctOfIncome(savings)}
            big
          />
        </div>
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label="Income" value={formatMoney(income)} tone="good" accent="bg-accent-green" />
          <StatTile label="Expenses" value={formatMoney(expenses)} tone="bad" accent="bg-accent-red" sublabel={pctOfIncome(expenses)} />
          <StatTile label="Investment" value={formatMoney(investment)} accent="bg-gold" sublabel={pctOfIncome(investment)} />
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
              {investment > 0 && (
                <div className="bg-gold" style={{ width: `${pct(investment)}%` }} title={`Investment ${formatMoney(investment)}`} />
              )}
              {netLoanOut > 0 && (
                <div className="bg-accent-blue" style={{ width: `${pct(netLoanOut)}%` }} title={`Loans (net) ${formatMoney(netLoanOut)}`} />
              )}
              {savings > 0 && <div className="bg-accent-green" style={{ width: `${pct(savings)}%` }} title={`Savings ${formatMoney(savings)}`} />}
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted">
              {expenses > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-accent-red" /> Expenses
                </span>
              )}
              {investment > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-gold" /> Investment
                </span>
              )}
              {netLoanOut > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-accent-blue" /> Loans
                </span>
              )}
              {savings > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-accent-green" /> Savings
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

        {excludedTracking > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-xs text-muted">
            <span className="mt-0.5 text-gold">⋯</span>
            <span>
              Tracked separately: <span className="font-figure text-text2">{formatMoney(excludedTracking)}</span> — not counted in
              Expenses or Savings above (accounts with "Log into Cash Flow" turned off, usually already part of a bill you log
              elsewhere).
            </span>
          </div>
        )}
      </Card>

      {!hasInvestmentSource && (
        <Card>
          <p className="text-sm text-muted">
            Tip: the Investment figure above picks up deposits/withdrawals from the Investments page automatically, or you can tag
            an account "invest" on the Expenses page to have money you log there count toward it instead of Expenses.
          </p>
        </Card>
      )}
    </div>
  )
}
