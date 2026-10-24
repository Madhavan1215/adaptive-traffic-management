import { POLICY_INFO } from '../../constants'
import { fixed, pct, steps } from '../../lib/format'
import { InfoTip } from '../Tooltip'

const ROWS = [
  {
    label: 'Packet loss rate',
    info: '100 × dropped packets ÷ generated packets.',
    get: (r) => r.packet_loss_rate,
    format: (v) => pct(v, 2),
    better: 'lower',
  },
  {
    label: 'Average queueing delay',
    info: 'Steps between arriving and starting transmission, averaged over delivered packets.',
    get: (r) => r.average_queueing_delay,
    format: (v) => steps(v, 2),
    better: 'lower',
  },
  {
    label: 'High-priority delay (Voice)',
    info: 'Average queueing delay of Voice packets (priority 5).',
    get: (r) => r.average_queueing_delay_by_class.voice,
    format: (v) => steps(v, 2),
    better: 'lower',
  },
  {
    label: 'Low-priority delay (Background)',
    info: 'Average queueing delay of Background packets (priority 1). A large value signals starvation risk.',
    get: (r) => r.average_queueing_delay_by_class.background,
    format: (v) => steps(v, 2),
    better: 'lower',
  },
  {
    label: 'Throughput',
    info: 'Delivered packets ÷ simulation steps.',
    get: (r) => r.throughput,
    format: (v) => `${fixed(v, 3)} pkt/step`,
    better: 'higher',
  },
  {
    label: 'Average queue utilisation',
    info: 'Average share of queue slots occupied. This describes congestion; it is not a score to optimise.',
    get: (r) => r.queue_utilisation.average,
    format: (v) => pct(v, 1),
    better: null,
  },
  {
    label: "Jain's fairness index",
    info: '(Σxᵢ)² ÷ (n · Σxᵢ²) over each class’s delivered throughput. 1 = perfectly even. Prioritisation lowers it on purpose, so higher is not automatically better.',
    get: (r) => r.fairness_index,
    format: (v) => fixed(v, 3),
    better: null,
  },
]

const HINT = { lower: 'lower is better', higher: 'higher is better' }

export default function ComparisonTable({ results }) {
  const policies = Object.keys(results)
  return (
    <div className="surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <caption className="sr-only">Metrics for each compared policy</caption>
          <thead>
            <tr className="border-b border-line text-left">
              <th scope="col" className="px-5 py-3 text-xs font-medium text-ink-faint">
                Metric
              </th>
              {policies.map((p) => (
                <th key={p} scope="col" className="px-4 py-3 text-xs font-semibold">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: POLICY_INFO[p].color }} />
                    {POLICY_INFO[p].label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const values = policies.map((p) => row.get(results[p]))
              const allSame = values.every((v) => Math.abs(v - values[0]) < 1e-9)
              const best = row.better && !allSame ? (row.better === 'lower' ? Math.min(...values) : Math.max(...values)) : null
              return (
                <tr key={row.label} className="border-b border-line/70 last:border-0 hover:bg-surface-2/40">
                  <th scope="row" className="px-5 py-3 text-left font-normal">
                    <span className="flex items-center gap-1.5 text-ink">
                      {row.label}
                      <InfoTip label={row.label} align="start">
                        {row.info}
                      </InfoTip>
                    </span>
                    <span className="text-[11px] text-ink-faint">
                      {[row.better && HINT[row.better], allSame && 'same for every policy'].filter(Boolean).join(' · ') || 'context, not a score'}
                    </span>
                  </th>
                  {values.map((v, i) => {
                    const isBest = best !== null && Math.abs(v - best) < 1e-9
                    return (
                      <td key={policies[i]} className={`px-4 py-3 font-mono tabular-nums ${isBest ? 'text-good' : 'text-ink'}`}>
                        {row.format(v)}
                        {isBest && <span className="sr-only"> (best in this row)</span>}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-line px-5 py-3 text-xs text-ink-faint">
        Green marks the best value in rows with a clear direction. There is deliberately no overall winner: each strategy trades one metric
        for another.
      </p>
    </div>
  )
}
