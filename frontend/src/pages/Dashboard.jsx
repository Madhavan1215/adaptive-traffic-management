import { useEffect, useState } from 'react'
import { getDefaults, runSimulation } from '../api/client'
import ConfigPanel from '../components/ConfigPanel'
import MetricCards from '../components/MetricCards'
import QueueView from '../components/QueueView'
import PerClassBarChart from '../components/charts/PerClassBarChart'
import UtilisationChart from '../components/charts/UtilisationChart'

const DEFAULT_CONFIG = {
  scenario: 'moderate',
  scheduler: 'adaptive_priority',
  queue_capacity: 20,
  service_rate: 1,
  duration: 500,
  alpha: 0.5,
  seed: 42,
  drop_policy: 'tail_drop',
  arrival_rates: {
    voice: 0.18,
    gaming: 0.17,
    video: 0.2,
    normal_data: 0.18,
    file_transfer: 0.12,
    background: 0.1,
  },
}

export default function Dashboard({ onStatusChange }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [presets, setPresets] = useState(null)
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getDefaults()
      .then((defaults) => setPresets(defaults.scenarios))
      .catch(() => setPresets(null))
  }, [])

  async function handleRun() {
    setRunning(true)
    setError(null)
    onStatusChange('running')
    try {
      const data = await runSimulation(config)
      setResult(data)
      onStatusChange('done')
    } catch (err) {
      setError(err.message)
      onStatusChange('error')
    } finally {
      setRunning(false)
    }
  }

  const dropsByClass = aggregateDropsByClass(result?.summary?.drop_reason_counts)

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
      <ConfigPanel
        config={config}
        onChange={setConfig}
        onRun={handleRun}
        running={running}
        scenarioPresets={presets}
      />

      <div className="space-y-5">
        {error && (
          <div className="rounded-lg border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {!result && !error && (
          <div className="rounded-xl border border-dashed border-[var(--border-light)] p-10 text-center text-sm text-[var(--text-muted)]">
            Configure the simulation on the left and click “Run simulation” to see results.
          </div>
        )}

        {result && (
          <>
            <MetricCards summary={result.summary} />
            <UtilisationChart history={result.queue_utilisation_history} />
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <PerClassBarChart
                title="Average queueing delay by class"
                subtitle="Lower is better; shows who the scheduler favours"
                valuesByClass={result.summary.average_queueing_delay_by_class}
                valueLabel="Avg delay"
                unit=" steps"
              />
              <PerClassBarChart
                title="Packets dropped by class"
                subtitle="Counts, aggregated across all drop reasons"
                valuesByClass={dropsByClass}
                valueLabel="Dropped"
              />
            </div>
            <QueueView packetSamples={result.packet_samples} />
          </>
        )}
      </div>
    </div>
  )
}

function aggregateDropsByClass(dropReasonCounts) {
  if (!dropReasonCounts) return null
  const totals = {}
  for (const [key, count] of Object.entries(dropReasonCounts)) {
    const [trafficClass] = key.split(':')
    totals[trafficClass] = (totals[trafficClass] || 0) + count
  }
  return totals
}
