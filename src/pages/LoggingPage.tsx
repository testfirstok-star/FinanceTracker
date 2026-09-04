import { useState } from 'react'
import Card from '../components/Card'
import ChatLogger from '../components/ChatLogger'
import KeywordManager from '../components/KeywordManager'
import TransactionForm from '../components/TransactionForm'
import RecurringDueChecklist from '../components/RecurringDueChecklist'
import RecurringManageList from '../components/RecurringManageList'
import Collapsible from '../components/Collapsible'
import PageTitle from '../components/PageTitle'
import type { EntryType } from '../types'

export default function LoggingPage() {
  const [logType, setLogType] = useState<EntryType>('expense')

  return (
    <div className="space-y-6">
      <PageTitle>Log</PageTitle>

      <Card title="Quick Log">
        <ChatLogger />
        <div className="mt-4">
          <Collapsible title="Manage keyword rules">
            <KeywordManager />
          </Collapsible>
        </div>
      </Card>

      <Card title="Log a transaction">
        <div className="mb-3 flex gap-1">
          <button
            onClick={() => setLogType('expense')}
            className={`rounded-md px-3 py-1 text-xs font-medium ${logType === 'expense' ? 'bg-gold text-ink' : 'bg-panel-hover text-muted'}`}
          >
            Expense
          </button>
          <button
            onClick={() => setLogType('income')}
            className={`rounded-md px-3 py-1 text-xs font-medium ${logType === 'income' ? 'bg-gold text-ink' : 'bg-panel-hover text-muted'}`}
          >
            Income
          </button>
        </div>
        <TransactionForm type={logType} />
      </Card>

      <Card title="Insurance">
        <p className="mb-2 text-xs text-muted">Premiums you can't afford to miss — also included in Recurring expenses below.</p>
        <RecurringDueChecklist type="expense" filterTag="insurance" />
      </Card>

      <Card title="Recurring expenses">
        <RecurringDueChecklist type="expense" />
      </Card>

      <Card>
        <Collapsible title="Manage recurring expenses">
          <RecurringManageList type="expense" />
        </Collapsible>
      </Card>
    </div>
  )
}
