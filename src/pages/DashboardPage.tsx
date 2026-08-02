import { useMemo, useState } from 'react'
import { useData } from '../hooks/DataContext'
import Card from '../components/Card'
import CategoryPieChart from '../components/CategoryPieChart'
import Collapsible from '../components/Collapsible'
import MonthCalendar from '../components/MonthCalendar'
import PageTitle from '../components/PageTitle'
import UpcomingEntries from '../components/UpcomingEntries'
import { formatMoney, formatMonthLabel, monthKey, shiftMonth, todayStr } from '../lib/format'
import type { EntryType, Transaction } from '../types'

function StatTile({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="rounded-lg bg-panel-hover p-3">
      <div className="text-xs text-muted">{label}</div>
      <div
        className={`font-figure text-lg font-semibold ${
          tone === 'good' ? 'text-accent-green' : tone === 'bad' ? 'text-accent-red' : 'text-text'
        }`}
      >
        {value}
      </div>
    </div>
  )
}

function DayLog({ date, transactions }: { date: string; transactions: Transaction[] }) {
  return (
    <div className="mt-4 rounded-lg border border-line">
      <div className="section-label border-b border-line px-3 py-2">{date}</div>
      <div className="divide-y divide-line">
        {transactions.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-3 py-2 text-sm">
            <div>
              <div className="text-text">{t.description}</div>
              <div className="text-xs text-muted">{t.categoryName}</div>
            </div>
            <div className="font-medium">{formatMoney(t.amount)}</div>
          </div>
        ))}
        {transactions.length === 0 && <div className="px-3 py-4 text-center text-sm text-muted">No entries for this day.</div>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data } = useData()
  const [month, setMonth] = useState(monthKey(todayStr()))
  const [pieType, setPieType] = useState<EntryType>('expense')
  const [selectedExpenseDay, setSelectedExpenseDay] = useState<string | null>(null)
  const [selectedIncomeDay, setSelectedIncomeDay] = useState<string | null>(null)
  const [customStart, setCustomStart] = useState(`${monthKey(todayStr())}-01`)
  const [customEnd, setCustomEnd] = useState(todayStr())
  const [customPieType, setCustomPieType] = useState<EntryType>('expense')

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

  const customTx = useMemo(
    () => data.transactions.filter((t) => t.date >= customStart && t.date <= customEnd),
    [data.transactions, customStart, customEnd],
  )
  const customExpenseTx = customTx.filter((t) => t.type === 'expense')
  const customIncomeTx = customTx.filter((t) => t.type === 'income')
  const customTotalExpense = customExpenseTx.reduce((s, t) => s + t.amount, 0)
  const customTotalIncome = customIncomeTx.reduce((s, t) => s + t.amount, 0)

  return (
    <div className="space-y-6">
      <PageTitle>Dashboard</PageTitle>

      <div className="flex items-center justify-center gap-4">
        <button onClick={() => setMonth((m) => shiftMonth(m, -1))} className="rounded-md px-2 py-1 text-xl text-muted hover:text-text">
          ‹
        </button>
        <span className="min-w-40 text-center text-base font-medium text-text">{formatMonthLabel(month)}</span>
        <button onClick={() => setMonth((m) => shiftMonth(m, 1))} className="rounded-md px-2 py-1 text-xl text-muted hover:text-text">
          ›
        </button>
      </div>

      <Card title="Monthly report">
        <div className="mb-4 grid grid-cols-3 gap-2">
          <StatTile label="Income" value={formatMoney(totalIncome)} tone="good" />
          <StatTile label="Expenses" value={formatMoney(totalExpense)} tone="bad" />
          <StatTile label="Net" value={formatMoney(totalIncome - totalExpense)} />
        </div>

        <div className="mb-2 flex gap-1">
          <button
            onClick={() => setPieType('expense')}
            className={`rounded-md px-2 py-1 text-xs font-medium ${pieType === 'expense' ? 'bg-gold text-ink' : 'bg-panel-hover'}`}
          >
            Expense categories
          </button>
          <button
            onClick={() => setPieType('income')}
            className={`rounded-md px-2 py-1 text-xs font-medium ${pieType === 'income' ? 'bg-gold text-ink' : 'bg-panel-hover'}`}
          >
            Income categories
          </button>
        </div>
        <CategoryPieChart data={breakdown(pieType === 'expense' ? expenseTx : incomeTx)} />
      </Card>

      <Card title="Expenses">
        <MonthCalendar
          monthKeyStr={month}
          totalsByDay={totalsByDay(expenseTx)}
          limits={{ weekday: data.settings.weekdayExpenseLimit, weekend: data.settings.weekendExpenseLimit }}
          selectedDate={selectedExpenseDay}
          onDayClick={(date) => setSelectedExpenseDay((d) => (d === date ? null : date))}
        />
        {selectedExpenseDay && (
          <DayLog date={selectedExpenseDay} transactions={expenseTx.filter((t) => t.date === selectedExpenseDay)} />
        )}
        <UpcomingEntries type="expense" />
      </Card>

      <Card title="Income">
        <MonthCalendar
          monthKeyStr={month}
          totalsByDay={totalsByDay(incomeTx)}
          selectedDate={selectedIncomeDay}
          onDayClick={(date) => setSelectedIncomeDay((d) => (d === date ? null : date))}
        />
        {selectedIncomeDay && <DayLog date={selectedIncomeDay} transactions={incomeTx.filter((t) => t.date === selectedIncomeDay)} />}
        <UpcomingEntries type="income" />
      </Card>

      <Card>
        <Collapsible title="Custom report">
          <div className="mb-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="section-label mb-1 block">Start date</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full rounded-md border border-line bg-panel-hover px-3 py-1.5 text-xs"
              />
            </label>
            <label className="block">
              <span className="section-label mb-1 block">End date</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full rounded-md border border-line bg-panel-hover px-3 py-1.5 text-xs"
              />
            </label>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <StatTile label="Income" value={formatMoney(customTotalIncome)} tone="good" />
            <StatTile label="Expenses" value={formatMoney(customTotalExpense)} tone="bad" />
            <StatTile label="Net" value={formatMoney(customTotalIncome - customTotalExpense)} />
          </div>

          <div className="mb-2 flex gap-1">
            <button
              onClick={() => setCustomPieType('expense')}
              className={`rounded-md px-2 py-1 text-xs font-medium ${customPieType === 'expense' ? 'bg-gold text-ink' : 'bg-panel-hover'}`}
            >
              Expense categories
            </button>
            <button
              onClick={() => setCustomPieType('income')}
              className={`rounded-md px-2 py-1 text-xs font-medium ${customPieType === 'income' ? 'bg-gold text-ink' : 'bg-panel-hover'}`}
            >
              Income categories
            </button>
          </div>
          <CategoryPieChart data={breakdown(customPieType === 'expense' ? customExpenseTx : customIncomeTx)} />
        </Collapsible>
      </Card>
    </div>
  )
}
