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

  const s = useMemo(() => summarize(data, period.start, period.end), [data, period.start, period.end])

  // Surplus is what you kept: Income - Expenses, nothing else. Investing and lending are then
  // *allocations of* that surplus, not reductions of it — so the bar below divides the surplus up
  // rather than subtracting from it. Money lent out comes back later; money invested is still yours.
  const invested = Math.max(s.invested, 0)
  const netWithdrawn = Math.max(-s.invested, 0)
  const allocated = invested + s.loansGiven
  const keptAsCash = Math.max(s.surplus - allocated, 0)
  const fundedFromCash = Math.max(allocated - Math.max(s.surplus, 0), 0)

  const barBase = Math.max(Math.max(s.surplus, 0), allocated, 1)
  const pct = (n: number) => Math.max(0, (n / barBase) * 100)
  const pctOfIncome = (n: number) => (s.income > 0 ? `${Math.round((n / s.income) * 100)}% of income` : undefined)
  const hasInvestmentSource = data.accounts.some((a) => a.kind === 'invest') || data.investmentAccounts.length > 0
  const showBar = s.surplus > 0 || allocated > 0

  return (
    <div className="space-y-6">
      <PageTitle>Cash Flow</PageTitle>
      <PeriodControls period={period} />

      <Card title={period.label}>
        <div className="mb-3">
          <StatTile
            label="Surplus"
            value={formatMoney(s.surplus)}
            tone={s.surplus >= 0 ? 'good' : 'bad'}
            sublabel={s.surplus < 0 ? `Overspent by ${formatMoney(-s.surplus)}` : pctOfIncome(s.surplus)}
            big
          />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <StatTile
            label="Income"
            value={formatMoney(s.income)}
            tone="good"
            accent="bg-accent-green"
            sublabel={s.loanInterest > 0 ? `incl. ${formatMoney(s.loanInterest)} loan interest` : undefined}
          />
          <StatTile
            label="Expenses"
            value={formatMoney(s.expenses)}
            tone="bad"
            accent="bg-accent-red"
            sublabel={pctOfIncome(s.expenses)}
          />
        </div>

        {showBar && (
          <div className="mb-4">
            <div className="section-label mb-1">Where the surplus went</div>
            <div className="flex h-3 overflow-hidden rounded-full bg-panel-hover">
              {invested > 0 && (
                <div className="bg-gold" style={{ width: `${pct(invested)}%` }} title={`Invested ${formatMoney(invested)}`} />
              )}
              {s.loansGiven > 0 && (
                <div
                  className="bg-accent-blue"
                  style={{ width: `${pct(s.loansGiven)}%` }}
                  title={`Lent out ${formatMoney(s.loansGiven)}`}
                />
              )}
              {keptAsCash > 0 && (
                <div
                  className="bg-accent-green"
                  style={{ width: `${pct(keptAsCash)}%` }}
                  title={`Kept as cash ${formatMoney(keptAsCash)}`}
                />
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted">
              {invested > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-gold" /> Invested
                </span>
              )}
              {s.loansGiven > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-accent-blue" /> Lent out
                </span>
              )}
              {keptAsCash > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-accent-green" /> Kept as cash
                </span>
              )}
            </div>
            {fundedFromCash > 0 && (
              <p className="mt-2 text-[11px] text-muted">
                Funded {formatMoney(fundedFromCash)} from existing cash — more went out to investments and loans than this
                period's surplus.
              </p>
            )}
            {netWithdrawn > 0 && (
              <p className="mt-2 text-[11px] text-muted">
                Net {formatMoney(netWithdrawn)} came back out of investments this period.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <StatTile label="Invested" value={formatMoney(s.invested)} accent="bg-gold" sublabel="allocation" />
          <StatTile label="Lent out" value={formatMoney(s.loansGiven)} accent="bg-accent-blue" sublabel="allocation" />
          <StatTile
            label="Repaid to you"
            value={formatMoney(s.loansRepaid)}
            tone={s.loansRepaid > 0 ? 'good' : undefined}
            accent="bg-accent-blue"
            sublabel="inflow, not income"
          />
        </div>

        <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
          <div>
            <div className="text-xs text-text2">Cash change</div>
            <div className="text-[10px] text-muted">Surplus − Invested − Lent out + Repaid</div>
          </div>
          <span className={`font-figure text-lg font-semibold ${s.cashChange >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            {formatMoney(s.cashChange)}
          </span>
        </div>

        {(s.planned.income > 0 || s.planned.expenses > 0) && (
          <p className="mt-3 text-xs text-muted">
            Planned, not yet counted: {s.planned.income > 0 && <span className="text-text2">+{formatMoney(s.planned.income)} income</span>}
            {s.planned.income > 0 && s.planned.expenses > 0 && ' · '}
            {s.planned.expenses > 0 && <span className="text-text2">−{formatMoney(s.planned.expenses)} expenses</span>}
          </p>
        )}

        {s.cardTracked > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-xs text-muted">
            <span className="mt-0.5 text-gold">⋯</span>
            <span>
              Card purchases tracked: <span className="font-figure text-text2">{formatMoney(s.cardTracked)}</span> — covered by the
              card bills you log from a Cash account, so not counted above.
              {s.cardBillsPaid > 0 && (
                <>
                  {' '}
                  Card bills paid this period: <span className="font-figure text-text2">{formatMoney(s.cardBillsPaid)}</span>.
                </>
              )}
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
