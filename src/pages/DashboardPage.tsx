import { useMemo, useState } from 'react'
import { useData } from '../hooks/DataContext'
import Card from '../components/Card'
import CategoryPieChart from '../components/CategoryPieChart'
import MonthCalendar from '../components/MonthCalendar'
import { formatMoney, formatMonthLabel, monthKey, shiftMonth, todayStr } from '../lib/format'
import type { EntryType } from '../types'

function StatTile({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
      <div className="text-xs text-slate-400">{label}</div>
      <div
        className={`text-lg font-semibold ${
          tone === 'good' ? 'text-green-600 dark:text-green-400' : tone === 'bad' ? 'text-red-500' : 'text-slate-900 dark:text-white'
        }`}
      >
        {value}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data } = useData()
  const [month, setMonth] = useState(monthKey(todayStr()))
  const [pieType, setPieType] = useState<EntryType>('expense')

  const monthTx = useMemo(() => data.transactions.filter((t) => monthKey(t.date) === month), [data.transactions, month])
  const expenseTx = monthTx.filter((t) => t.type === 'expense')
  const incomeTx = monthTx.filter((t) => t.type === 'income')
  const totalExpense = expenseTx.reduce((s, t) => s + t.amount, 0)
  const totalIncome = incomeTx.reduce((s, t) => s + t.amount, 0)

  function breakdown(txs: typeof monthTx) {
    const map = new Map<string, number>()
    for (const t of txs) map.set(t.categoryName, (map.get(t.categoryName) ?? 0) + t.amount)
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }

  function totalsByDay(txs: typeof monthTx) {
    const map: Record<string, number> = {}
    for (const t of txs) map[t.date] = (map[t.date] ?? 0) + t.amount
    return map
  }

  const investmentTotals = useMemo(() => {
    let invested = 0
    let income = 0
    let expenses = 0
    for (const t of data.investmentTransactions) {
      if (t.type === 'deposit') invested += t.amount
      else if (t.type === 'withdrawal') invested -= t.amount
      else if (t.type === 'investment_income') income += t.amount
      else if (t.type === 'investment_expense') expenses += t.amount
    }
    return { invested, income, expenses, net: invested + income - expenses }
  }, [data.investmentTransactions])

  return (
    <div className="space-y-6">
      <Card
        title="Monthly report"
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => setMonth((m) => shiftMonth(m, -1))} className="rounded-md px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
              ←
            </button>
            <span className="min-w-32 text-center text-sm font-medium">{formatMonthLabel(month)}</span>
            <button onClick={() => setMonth((m) => shiftMonth(m, 1))} className="rounded-md px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
              →
            </button>
          </div>
        }
      >
        <div className="mb-4 grid grid-cols-3 gap-2">
          <StatTile label="Income" value={formatMoney(totalIncome)} tone="good" />
          <StatTile label="Expenses" value={formatMoney(totalExpense)} tone="bad" />
          <StatTile label="Net" value={formatMoney(totalIncome - totalExpense)} />
        </div>

        <div className="mb-2 flex gap-1">
          <button
            onClick={() => setPieType('expense')}
            className={`rounded-md px-2 py-1 text-xs font-medium ${pieType === 'expense' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}
          >
            Expense categories
          </button>
          <button
            onClick={() => setPieType('income')}
            className={`rounded-md px-2 py-1 text-xs font-medium ${pieType === 'income' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}
          >
            Income categories
          </button>
        </div>
        <CategoryPieChart data={breakdown(pieType === 'expense' ? expenseTx : incomeTx)} />
      </Card>

      <Card title="Expenses">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">Daily spend</p>
            <MonthCalendar monthKeyStr={month} totalsByDay={totalsByDay(expenseTx)} hue="blue" />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">📊 Monthly stats</p>
            <CategoryPieChart data={breakdown(expenseTx)} />
          </div>
        </div>
      </Card>

      <Card title="Income">
        <p className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">Daily income</p>
        <MonthCalendar monthKeyStr={month} totalsByDay={totalsByDay(incomeTx)} hue="green" />
      </Card>

      <Card title="Investments">
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label="Invested" value={formatMoney(investmentTotals.invested)} />
          <StatTile label="Earnings" value={formatMoney(investmentTotals.income)} tone="good" />
          <StatTile label="Expenses" value={formatMoney(investmentTotals.expenses)} tone="bad" />
          <StatTile label="Total net" value={formatMoney(investmentTotals.net)} />
        </div>
        {data.investmentAccounts.length === 0 && <p className="text-sm text-slate-400">No investments logged yet.</p>}
      </Card>
    </div>
  )
}
