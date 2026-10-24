import { PRESET_INFO, TRAFFIC_CLASSES } from '../../constants'
import { buildComparisonCsv, downloadText } from '../../lib/csv'
import Icon from '../Icon'

const MODE_LABEL = { scheduling_only: 'A — Scheduling only', congestion_protection: 'B — Congestion protection' }

export default function Reproducibility({ response }) {
  const { config, mode } = response
  const rows = [
    ['Experiment mode', MODE_LABEL[mode]],
    ['Scenario', PRESET_INFO[config.scenario]?.label ?? config.scenario],
    ['Random seed', config.seed],
    ['Waiting-time influence (α)', config.alpha],
    ['Queue capacity', `${config.queue_capacity} packets`],
    ['Network speed', `${config.service_rate} packet/step`],
    ['Duration', `${config.duration} steps`],
  ]

  function download() {
    downloadText(`comparison_${mode}_${config.scenario}_seed${config.seed}.csv`, buildComparisonCsv(response))
  }

  return (
    <section className="surface p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Reproduce this experiment</h3>
          <p className="mt-0.5 text-xs text-ink-faint">Same settings + same seed = identical arrivals and identical results.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={download}>
          <Icon name="download" size={16} />
          Download results (CSV)
        </button>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-ink-faint">{k}</dt>
              <dd className="font-mono text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <div>
          <p className="mb-2 text-xs text-ink-faint">Arrival probability per step</p>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            {TRAFFIC_CLASSES.map((c) => (
              <li key={c.key} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-ink-muted">
                  <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                  {c.label}
                </span>
                <span className="font-mono text-ink">{config.arrival_rates[c.key].toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
