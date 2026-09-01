import { useCallback, useMemo, useState } from 'react'
import Card from '../components/Card'
import Collapsible from '../components/Collapsible'
import GroupedTransactions from '../components/GroupedTransactions'
import CategoryManager from '../components/CategoryManager'
import AccountManager from '../components/AccountManager'
import PageTitle from '../components/PageTitle'
import PeriodControls from '../components/PeriodControls'
import StatTile from '../components/StatTile'
import { usePeriod } from '../hooks/usePeriod'
import { useData } from '../hooks/DataContext'
import { formatMoney } from '../lib/format'
import { hasTag, isTrackingOnly } from '../lib/tags'

const UNASSIGNED_KEY = '__unassigned__'

export default function ExpensesPage() {
  const { data, updateSettings, activeAccounts } = useData()
  const period = usePeriod()
  const accounts = activeAccounts()
  const [weekdayLimit, setWeekdayLimit] = useState(String(data.settings.weekdayExpenseLimit ?? ''))
  const [weekendLimit, setWeekendLimit] = useState(String(data.settings.weekendExpenseLimit ?? ''))

  // Per-account inclusion overrides for the summary total. Missing entries fall back to a smart
  // default: real accounts included, "invest"/"recur"-tagged accounts excluded (same as Cash Flow).
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})

  const isIncluded = useCallback(
    (accountId: string): boolean => {
      if (accountId in overrides) return overrides[accountId]
      const acc = accounts.find((a) => a.id === accountId)
      return acc ? !isTrackingOnly(acc) : true
    },
    [overrides, accounts],
  )

  function toggleAccount(accountId: string) {
    setOverrides((cur) => ({ ...cur, [accountId]: !isIncluded(accountId) }))
  }

  function includeAll() {
    const next: Record<string, boolean> = {}
    for (const a of accounts) next[a.id] = true
    setOverrides(next)
  }

  function toggleTag(tag: string) {
    const matching = accounts.filter((a) => hasTag(a, tag))
    const allIncluded = matching.length > 0 && matching.every((a) => isIncluded(a.id))
    setOverrides((cur) => {
      const next = { ...cur }
      for (const a of matching) next[a.id] = !allIncluded
      return next
    })
  }

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const a of accounts) for (const t of a.tags ?? []) set.add(t)
    return Array.from(set).sort()
  }, [accounts])

  const { total, recurringTotal, investmentTotal, breakdown } = useMemo(() => {
    const inRange = data.transactions.filter((t) => t.type === 'expense' && t.date >= period.start && t.date <= period.end)
    const included = inRange.filter((t) => !t.accountId || isIncluded(t.accountId))
    const total = included.reduce((s, t) => s + t.amount, 0)

    const recurAccountIds = new Set(accounts.filter((a) => hasTag(a, 'recur')).map((a) => a.id))
    const investAccountIds = new Set(accounts.filter((a) => hasTag(a, 'invest')).map((a) => a.id))
    const recurringTotal = inRange.filter((t) => t.accountId && recurAccountIds.has(t.accountId)).reduce((s, t) => s + t.amount, 0)
    const investmentTotal = inRange.filter((t) => t.accountId && investAccountIds.has(t.accountId)).reduce((s, t) => s + t.amount, 0)

    const breakdownMap = new Map<string, number>()
    for (const t of included) {
      const key = t.accountId ?? UNASSIGNED_KEY
      breakdownMap.set(key, (breakdownMap.get(key) ?? 0) + t.amount)
    }
    const breakdown = Array.from(breakdownMap.entries())
      .map(([accountId, amount]) => ({
        accountId,
        label: accountId === UNASSIGNED_KEY ? 'Unassigned' : (accounts.find((a) => a.id === accountId)?.name ?? 'Unknown account'),
        amount,
      }))
      .sort((a, b) => b.amount - a.amount)

    return { total, recurringTotal, investmentTotal, breakdown }
  }, [data.transactions, accounts, isIncluded, period.start, period.end])

  return (
    <div className="space-y-6">
      <PageTitle>Expenses</PageTitle>

      <PeriodControls period={period} />

      <Card title={`Summary — ${period.label}`}>
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="Total" value={formatMoney(total)} tone="bad" />
          <StatTile label="Recurring" value={formatMoney(recurringTotal)} />
          <StatTile label="Investment" value={formatMoney(investmentTotal)} />
        </div>

        {accounts.length > 0 && (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="section-label">Include accounts</span>
              <button onClick={includeAll} className="text-xs text-gold hover:text-gold-dark">
                Include all
              </button>
            </div>
            {allTags.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {allTags.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleTag(t)}
                    className="rounded-full border border-line px-2 py-0.5 text-[10px] text-muted hover:border-gold/40 hover:text-gold"
                    title={`Toggle every account tagged "${t}"`}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {accounts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => toggleAccount(a.id)}
                  className={`rounded-full border px-2.5 py-1 text-xs ${
                    isIncluded(a.id) ? 'border-gold/40 bg-gold/10 text-gold' : 'border-line text-muted'
                  }`}
                >
                  {a.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {breakdown.length > 0 && (
          <div className="mt-4 space-y-1 border-t border-line pt-3">
            <div className="section-label mb-1">Breakdown</div>
            {breakdown.map((b) => (
              <div key={b.accountId} className="flex items-center justify-between text-xs">
                <span className="text-text2">{b.label}</span>
                <span className="font-figure font-medium">{formatMoney(b.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <Collapsible title="By account" defaultOpen>
          <GroupedTransactions type="expense" start={period.start} end={period.end} groupBy="account" />
        </Collapsible>
      </Card>

      <Card>
        <Collapsible title="Manage accounts">
          <AccountManager />
        </Collapsible>
      </Card>

      <Card title="Expense categories">
        <CategoryManager type="expense" />
      </Card>

      <Card title="Daily spend limits">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="section-label mb-1 block">Weekday limit</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={weekdayLimit}
              onChange={(e) => setWeekdayLimit(e.target.value)}
              onBlur={() => updateSettings({ weekdayExpenseLimit: weekdayLimit ? parseFloat(weekdayLimit) : undefined })}
              placeholder="No limit"
              className="w-full rounded-md border border-line bg-panel-hover px-3 py-1.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="section-label mb-1 block">Weekend limit</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={weekendLimit}
              onChange={(e) => setWeekendLimit(e.target.value)}
              onBlur={() => updateSettings({ weekendExpenseLimit: weekendLimit ? parseFloat(weekendLimit) : undefined })}
              placeholder="No limit"
              className="w-full rounded-md border border-line bg-panel-hover px-3 py-1.5 text-sm"
            />
          </label>
        </div>
      </Card>
    </div>
  )
}
