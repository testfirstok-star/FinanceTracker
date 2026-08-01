import { useState } from 'react'
import Card from '../components/Card'
import Collapsible from '../components/Collapsible'
import TransactionForm from '../components/TransactionForm'
import TransactionTable from '../components/TransactionTable'
import CategoryManager from '../components/CategoryManager'
import PageTitle from '../components/PageTitle'
import { useData } from '../hooks/DataContext'

export default function ExpensesPage() {
  const { data, updateSettings } = useData()
  const [weekdayLimit, setWeekdayLimit] = useState(String(data.settings.weekdayExpenseLimit ?? ''))
  const [weekendLimit, setWeekendLimit] = useState(String(data.settings.weekendExpenseLimit ?? ''))

  return (
    <div className="space-y-6">
      <PageTitle>Expenses</PageTitle>

      <Card title="Log an expense">
        <TransactionForm type="expense" />
      </Card>

      <Card>
        <Collapsible title="Logged expenses" defaultOpen>
          <TransactionTable type="expense" />
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
