import Card from '../components/Card'
import Collapsible from '../components/Collapsible'
import TransactionForm from '../components/TransactionForm'
import TransactionTable from '../components/TransactionTable'
import CategoryManager from '../components/CategoryManager'

export default function ExpensesPage() {
  return (
    <div className="space-y-6">
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
    </div>
  )
}
