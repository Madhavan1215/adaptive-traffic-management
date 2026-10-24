import { useState } from 'react'
import Header from './components/Header'
import Compare from './pages/Compare'
import Dashboard from './pages/Dashboard'
import Viva from './pages/Viva'

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [status, setStatus] = useState('idle')
  const [resetKey, setResetKey] = useState(0)

  function handleReset() {
    setStatus('idle')
    setResetKey((k) => k + 1)
  }

  return (
    <div className="min-h-full">
      <Header activeTab={activeTab} onTabChange={setActiveTab} status={status} onReset={handleReset} />
      <main className="mx-auto max-w-7xl px-6 py-6">
        {activeTab === 'dashboard' && <Dashboard key={`dash-${resetKey}`} onStatusChange={setStatus} />}
        {activeTab === 'compare' && <Compare key={`cmp-${resetKey}`} onStatusChange={setStatus} />}
        {activeTab === 'viva' && <Viva />}
      </main>
    </div>
  )
}
