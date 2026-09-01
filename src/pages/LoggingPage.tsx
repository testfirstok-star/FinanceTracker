import Card from '../components/Card'
import ChatLogger from '../components/ChatLogger'
import KeywordManager from '../components/KeywordManager'
import Collapsible from '../components/Collapsible'
import PageTitle from '../components/PageTitle'

export default function LoggingPage() {
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
    </div>
  )
}
