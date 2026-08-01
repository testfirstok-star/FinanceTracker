import Card from '../components/Card'
import Collapsible from '../components/Collapsible'
import TransactionForm from '../components/TransactionForm'
import TransactionTable from '../components/TransactionTable'
import CategoryManager from '../components/CategoryManager'

export default function IncomePage() {
  return (
    <div className="space-y-6">
      <Card title="Log income">
        <TransactionForm type="income" />
      </Card>

      <Card>
        <Collapsible title="Logged income" defaultOpen>
          <TransactionTable type="income" />
        </Collapsible>
      </Card>

      <Card title="Income categories">
        <CategoryManager type="income" />
      </Card>
    </div>
  )
}
