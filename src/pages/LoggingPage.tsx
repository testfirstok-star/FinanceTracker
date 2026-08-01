import Card from '../components/Card'
import ChatLogger from '../components/ChatLogger'
import FixedItemPanel from '../components/FixedItemPanel'
import KeywordManager from '../components/KeywordManager'
import Collapsible from '../components/Collapsible'

export default function LoggingPage() {
  return (
    <div className="space-y-6">
      <Card title="💬 Chat-style bookkeeping">
        <ChatLogger />
        <div className="mt-4">
          <Collapsible title="Manage keyword rules">
            <KeywordManager />
          </Collapsible>
        </div>
      </Card>

      <Card title="⚡ Fixed expenses">
        <FixedItemPanel type="expense" />
      </Card>

      <Card title="⚡ Fixed income">
        <FixedItemPanel type="income" />
      </Card>
    </div>
  )
}
