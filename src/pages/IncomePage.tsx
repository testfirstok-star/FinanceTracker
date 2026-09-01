import { useMemo } from 'react'
import Card from '../components/Card'
import Collapsible from '../components/Collapsible'
import GroupedTransactions from '../components/GroupedTransactions'
import CategoryManager from '../components/CategoryManager'
import RecurringExpensePanel from '../components/RecurringExpensePanel'
import PageTitle from '../components/PageTitle'
import PeriodControls from '../components/PeriodControls'
import StatTile from '../components/StatTile'
import { usePeriod } from '../hooks/usePeriod'
import { useData } from '../hooks/DataContext'
import { formatMoney } from '../lib/format'

export default function IncomePage() {
  const { data } = useData()
  const period = usePeriod()

  const total = useMemo(
    () =>
      data.transactions
        .filter((t) => t.type === 'income' && t.date >= period.start && t.date <= period.end)
        .reduce((s, t) => s + t.amount, 0),
    [data.transactions, period.start, period.end],
  )

  return (
    <div className="space-y-6">
      <PageTitle>Income</PageTitle>

      <PeriodControls period={period} />

      <Card title={`Summary — ${period.label}`}>
        <div className="grid grid-cols-1 gap-2 sm:max-w-xs">
          <StatTile label="Total income" value={formatMoney(total)} tone="good" />
        </div>
      </Card>

      <Card title="Recurring income">
        <RecurringExpensePanel type="income" />
      </Card>

      <Card>
        <Collapsible title="By type" defaultOpen>
          <GroupedTransactions type="income" start={period.start} end={period.end} groupBy="category" />
        </Collapsible>
      </Card>

      <Card title="Income categories">
        <CategoryManager type="income" />
      </Card>
    </div>
  )
}
