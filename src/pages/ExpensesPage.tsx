import { useMemo, useState } from 'react'
import Card from '../components/Card'
import Collapsible from '../components/Collapsible'
import GroupedTransactions from '../components/GroupedTransactions'
import CategoryManager from '../components/CategoryManager'
import AccountManager from '../components/AccountManager'
import RecurringExpensePanel from '../components/RecurringExpensePanel'
import PageTitle from '../components/PageTitle'
import PeriodControls from '../components/PeriodControls'
import StatTile from '../components/StatTile'
import { usePeriod } from '../hooks/usePeriod'
import { useData } from '../hooks/DataContext'
import { formatMoney } from '../lib/format'

export default function ExpensesPage() {
  const { data, updateSettings } = useData()
  const period = usePeriod()
  const [weekdayLimit, setWeekdayLimit] = useState(String(data.settings.weekdayExpenseLimit ?? ''))
  const [weekendLimit, setWeekendLimit] = useState(String(data.settings.weekendExpenseLimit ?? ''))

  const { total, recurringTotal, oneOffTotal } = useMemo(() => {
    const inRange = data.transactions.filter((t) => t.type === 'expense' && t.date >= period.start && t.date <= period.end)
    const total = inRange.reduce((s, t) => s + t.amount, 0)
    const recurringTotal = inRange.filter((t) => t.recurringExpenseId).reduce((s, t) => s + t.amount, 0)
    return { total, recurringTotal, oneOffTotal: total - recurringTotal }
  }, [data.transactions, period.start, period.end])

  return (
    <div className="space-y-6">
      <PageTitle>Expenses</PageTitle>

      <PeriodControls period={period} />

      <Card title={`Summary — ${period.label}`}>
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="Total" value={formatMoney(total)} tone="bad" />
          <StatTile label="Recurring" value={formatMoney(recurringTotal)} />
          <StatTile label="One-off" value={formatMoney(oneOffTotal)} />
        </div>
      </Card>

      <Card title="Recurring expenses">
        <RecurringExpensePanel type="expense" />
      </Card>

      <Card>
        <Collapsible title="By account" defaultOpen>
          <GroupedTransactions type="expense" start={period.start} end={period.end} groupBy="account" />
        </Collapsible>
      </Card>

      <Card title="Accounts">
        <AccountManager />
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
