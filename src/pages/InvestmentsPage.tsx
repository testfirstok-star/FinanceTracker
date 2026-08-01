import { useState, type FormEvent } from 'react'
import Card from '../components/Card'
import InvestmentAccountSection from '../components/InvestmentAccountSection'
import { useData } from '../hooks/DataContext'

export default function InvestmentsPage() {
  const { data, addInvestmentAccount } = useData()
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    addInvestmentAccount(newName)
    setNewName('')
    setAdding(false)
  }

  return (
    <div className="space-y-4">
      <Card
        title="Investments"
        action={
          !adding && (
            <button onClick={() => setAdding(true)} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
              + New investment
            </button>
          )
        }
      >
        {adding && (
          <form onSubmit={handleAdd} className="mb-4 flex gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Brokerage - Fidelity"
              className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            <button type="submit" className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
              Create
            </button>
            <button type="button" onClick={() => setAdding(false)} className="text-sm text-slate-400 hover:text-red-500">
              Cancel
            </button>
          </form>
        )}

        <div className="space-y-3">
          {data.investmentAccounts.map((acc) => (
            <InvestmentAccountSection key={acc.id} account={acc} />
          ))}
          {data.investmentAccounts.length === 0 && (
            <p className="text-sm text-slate-400">No investments yet — click "+ New investment" to add one.</p>
          )}
        </div>
      </Card>
    </div>
  )
}
