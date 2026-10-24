import { useState } from 'react'
import { runComparison } from '../api/client'
import Card from '../components/Card'
import PolicyBarChart from '../components/charts/PolicyBarChart'
import { SCENARIOS } from '../constants'

const MODE_LABEL = {
  scheduling_only: 'Mode A — Scheduling only (same admission policy for all)',
  congestion_protection: 'Mode B — Congestion protection (adaptive admission policies)',
}

const POLICY_LABEL = {
  fifo: 'FIFO',
  static_priority: 'Static Priority',
  adaptive_priority: 'Adaptive Priority',
  tail_drop: 'Tail Drop (baseline)',
  priority_displace: 'Priority Displace',
}

export default function Compare({ onStatusChange }) {
  const [mode, setMode] = useState('scheduling_only')
  const [scenario, setScenario] = useState('heavy')
  const [alpha, setAlpha] = useState(0.5)
  const [seed, setSeed] = useState(42)
  const [response, setResponse] = useState(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)

  async function handleRun() {
    setRunning(true)
    setError(null)
    onStatusChange('running')
    try {
      const data = await runComparison({ mode, scenario, alpha, seed })
      setResponse(data)
      onStatusChange('done')
    } catch (err) {
      setError(err.message)
      onStatusChange('error')
    } finally {
      setRunning(false)
    }
  }

  const results = response?.results
  const policies = results ? Object.keys(results) : []

  return (
    <div className="space-y-5">
      <Card title="Algorithm comparison" subtitle="Runs the same arrival trace through every policy in the chosen mode">
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Mode">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="rounded-lg border border-[var(--border-light)] bg-[var(--bg-panel-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            >
              <option value="scheduling_only">Mode A — Scheduling only</option>
              <option value="congestion_protection">Mode B — Congestion protection</option>
            </select>
          </Field>
          <Field label="Scenario">
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="rounded-lg border border-[var(--border-light)] bg-[var(--bg-panel-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            >
              {SCENARIOS.filter((s) => s.key !== 'custom').map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Alpha">
            <input
              type="number"
              min={0}
              max={10}
              step={0.05}
              value={alpha}
              onChange={(e) => setAlpha(Number(e.target.value))}
              className="w-24 rounded-lg border border-[var(--border-light)] bg-[var(--bg-panel-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
          </Field>
          <Field label="Seed">
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
              className="w-28 rounded-lg border border-[var(--border-light)] bg-[var(--bg-panel-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
          </Field>
          <button
            type="button"
            onClick={handleRun}
            disabled={running}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#06131c] transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? 'Running…' : 'Run comparison'}
          </button>
        </div>
        <p className="mt-3 text-xs text-[var(--text-muted)]">{MODE_LABEL[mode]}</p>
      </Card>

      {error && (
        <div className="rounded-lg border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      {results && (
        <>
          <ComparisonTable results={results} policies={policies} />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <PolicyBarChart
              title="Packet loss rate by policy"
              subtitle="Overall loss, %"
              unit="%"
              data={policies.map((p) => ({ key: p, label: POLICY_LABEL[p] || p, value: round(results[p].packet_loss_rate, 2) }))}
            />
            <PolicyBarChart
              title="Average queueing delay by policy"
              subtitle="Steps, delivered packets only"
              unit=""
              data={policies.map((p) => ({ key: p, label: POLICY_LABEL[p] || p, value: round(results[p].average_queueing_delay, 2) }))}
            />
            <PolicyBarChart
              title="Throughput by policy"
              subtitle="Delivered packets / time step"
              unit=""
              data={policies.map((p) => ({ key: p, label: POLICY_LABEL[p] || p, value: round(results[p].throughput, 3) }))}
            />
          </div>
        </>
      )}
    </div>
  )
}

function ComparisonTable({ results, policies }) {
  const rows = [
    { label: 'Packet loss rate', get: (r) => `${r.packet_loss_rate.toFixed(2)}%` },
    { label: 'Average queueing delay', get: (r) => `${r.average_queueing_delay.toFixed(2)} steps` },
    { label: 'High-priority delay (voice)', get: (r) => `${r.average_queueing_delay_by_class.voice.toFixed(2)} steps` },
    { label: 'Low-priority delay (background)', get: (r) => `${r.average_queueing_delay_by_class.background.toFixed(2)} steps` },
    { label: 'Throughput', get: (r) => `${r.throughput.toFixed(3)} pkt/step` },
    { label: "Jain's fairness index", get: (r) => r.fairness_index.toFixed(3) },
  ]

  return (
    <Card title="Comparison table">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-muted)]">
              <th className="py-2 pr-4 font-medium">Metric</th>
              {policies.map((p) => (
                <th key={p} className="py-2 pr-4 font-medium text-[var(--text-secondary)]">
                  {POLICY_LABEL[p] || p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-[var(--border)] last:border-0">
                <td className="py-2 pr-4 text-[var(--text-secondary)]">{row.label}</td>
                {policies.map((p) => (
                  <td key={p} className="py-2 pr-4 font-medium text-[var(--text-primary)]">
                    {row.get(results[p])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">{label}</span>
      {children}
    </label>
  )
}

function round(value, digits) {
  return Number(value.toFixed(digits))
}
