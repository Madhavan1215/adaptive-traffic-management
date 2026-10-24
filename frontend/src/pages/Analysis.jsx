import { motion } from 'motion/react'
import { useId } from 'react'
import ComparisonTable from '../components/analysis/ComparisonTable'
import MethodNotes from '../components/analysis/MethodNotes'
import Reproducibility from '../components/analysis/Reproducibility'
import { ChartCard, ClassGroupedBars, PolicyBars, UtilisationLines } from '../components/charts/ComparisonCharts'
import Icon from '../components/Icon'
import { Notice, PageHeader } from '../components/Layout'
import Slider from '../components/Slider'
import { OptionCard } from '../components/studio/StudioControls'
import { PRESET_INFO, PRESET_ORDER } from '../constants'
import { LIMITS } from '../lib/config'
import { count, dropsByClass, fixed, pct, steps } from '../lib/format'
import { analysisInsights } from '../lib/insights'

const MODES = [
  {
    key: 'scheduling_only',
    title: 'Mode A — Scheduling only',
    description: 'FIFO, Static and Adaptive on the same arrivals, buffer, speed and tail-drop rule. Isolates what scheduling changes.',
  },
  {
    key: 'congestion_protection',
    title: 'Mode B — Congestion protection',
    description: 'Adaptive scheduling with tail drop vs. priority displacement. Shows how a buffer policy protects some classes at the expense of others.',
  },
]

const TONE_COLOR = { good: 'var(--color-good)', warn: 'var(--color-warn)', neutral: 'var(--color-accent)' }

function sameHistories(results) {
  const histories = Object.values(results).map((r) => r.utilisation_history)
  return histories.every((h) => h.every((u, i) => Math.abs(u - histories[0][i]) < 1e-9))
}

function ChartGroup({ title, intro, children }) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        {intro && <p className="mt-0.5 text-sm text-ink-muted">{intro}</p>}
      </div>
      {children}
    </section>
  )
}

export default function Analysis({ analysis }) {
  const { controls, setControls, run, start } = analysis
  const seedId = useId()
  const set = (field) => (value) => setControls((c) => ({ ...c, [field]: value }))
  const response = run.response
  const stale = response && JSON.stringify(controls) !== JSON.stringify(run.ranControls)

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader eyebrow="Deep Analysis" title="Compare the strategies side by side">
        Run every policy on exactly the same packet arrivals, then see where they differ — and where they cannot.
      </PageHeader>

      <section className="surface p-5" aria-label="Comparison settings">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Experiment</legend>
          <div className="grid gap-2 md:grid-cols-2">
            {MODES.map((m) => (
              <OptionCard key={m.key} name="mode" checked={controls.mode === m.key} onChange={() => set('mode')(m.key)} title={m.title} description={m.description} />
            ))}
          </div>
        </fieldset>

        <div className="mt-5 grid gap-5 md:grid-cols-[1.4fr_1fr_0.8fr] md:items-end">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Traffic scenario</legend>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_ORDER.map((name) => (
                <OptionCard key={name} name="scenario" checked={controls.scenario === name} onChange={() => set('scenario')(name)} title={PRESET_INFO[name].label} compact />
              ))}
            </div>
          </fieldset>
          <Slider
            label="Waiting-time influence"
            value={controls.alpha}
            {...LIMITS.alpha}
            onChange={set('alpha')}
            format={(v) => v.toFixed(2)}
            info="Aging coefficient (α) used by Adaptive Priority: score = priority + α × steps waited (α doubles above 80% full)."
          />
          <div>
            <label htmlFor={seedId} className="mb-1 block text-sm font-semibold">
              Random seed
            </label>
            <input
              id={seedId}
              type="number"
              min={0}
              value={Number.isNaN(controls.seed) ? '' : controls.seed}
              onChange={(e) => set('seed')(e.target.value === '' ? Number.NaN : Number(e.target.value))}
              className="field font-mono"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-xs text-ink-faint">Queue capacity 20, network speed 1 packet/step, 500 steps — the scenario defaults.</p>
          <button type="button" className="btn btn-primary" onClick={start} disabled={run.status === 'running'}>
            {run.status === 'running' ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#04121a]/30 border-t-[#04121a]" aria-hidden="true" />
                Comparing…
              </>
            ) : (
              <>
                <Icon name="play" size={15} />
                Run comparison
              </>
            )}
          </button>
        </div>
      </section>

      <div className="mt-6 space-y-4">
        {run.status === 'error' && (
          <Notice tone="error" icon="alert">
            {run.error}
            {response && ' The results below are from your previous comparison.'}
          </Notice>
        )}
        {run.status === 'done' && stale && (
          <Notice
            tone="warn"
            icon="alert"
            action={
              <button type="button" className="btn btn-secondary !py-1.5" onClick={start}>
                Run again
              </button>
            }
          >
            Settings changed — the results below are from your previous comparison.
          </Notice>
        )}
      </div>

      {!response && run.status !== 'running' && (
        <div className="mt-6 rounded-2xl border border-dashed border-line-strong p-10 text-center">
          <Icon name="chart" size={28} className="mx-auto text-ink-faint" />
          <p className="mt-3 font-medium">No comparison yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">
            Choose an experiment and a scenario, then run the comparison. Heavy traffic shows the clearest differences.
          </p>
        </div>
      )}

      {response && <Results response={response} />}

      <div className="mt-10">
        <MethodNotes />
      </div>
    </div>
  )
}

function Results({ response }) {
  const results = response.results
  const insights = analysisInsights(response)
  const identical = sameHistories(results)
  const isModeA = response.mode === 'scheduling_only'

  return (
    <motion.div key={JSON.stringify(response.config) + response.mode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="mt-6 space-y-10">
      <section className="surface relative overflow-hidden p-6">
        <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-accent via-accent-2 to-accent-3" aria-hidden="true" />
        <h2 className="text-lg font-semibold tracking-tight">What do these results mean?</h2>
        <ul className="mt-4 space-y-3">
          {insights.map((item) => (
            <li key={item.text} className="flex gap-3 text-sm leading-relaxed text-ink-muted">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: TONE_COLOR[item.tone] }} />
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h3 className="text-base font-semibold">Comparison table</h3>
        <ComparisonTable results={results} />
      </section>

      <ChartGroup title="Congestion behaviour" intro="How full the queue was at each step of the run.">
        <ChartCard
          title="Queue utilisation over time"
          description="Queued packets ÷ capacity after admission. Dashed lines mark the adaptive thresholds."
          note={identical ? 'The lines are identical for every policy, so one line is drawn. Each step sends the same number of packets — only which packet differs.' : null}
        >
          <UtilisationLines results={results} identical={identical} />
        </ChartCard>
      </ChartGroup>

      <ChartGroup title="Packet delivery" intro="Who got turned away when the queue was full.">
        <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
          <ChartCard title="Packet loss rate by policy" description="Dropped ÷ generated.">
            <PolicyBars results={results} accessor={(r) => r.packet_loss_rate} format={(v, axis) => (axis ? `${Math.round(v)}%` : pct(v, 2))} label="Loss" />
          </ChartCard>
          <ChartCard title="Packets dropped by traffic class" description="Count of dropped packets, all drop reasons combined.">
            <ClassGroupedBars results={results} accessor={(r, c) => dropsByClass(r.drop_reason_counts)[c] ?? 0} format={(v) => count(v)} />
          </ChartCard>
        </div>
      </ChartGroup>

      <ChartGroup title="Delay & throughput" intro="How long packets waited, and how many got through.">
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard title="Average queueing delay by policy" description="Steps waited, delivered packets only.">
            <PolicyBars results={results} accessor={(r) => r.average_queueing_delay} format={(v, axis) => (axis ? fixed(v, 0) : steps(v, 2))} label="Avg delay" />
          </ChartCard>
          <ChartCard title="Throughput by policy" description="Delivered packets per step.">
            <PolicyBars results={results} accessor={(r) => r.throughput} format={(v, axis) => fixed(v, axis ? 2 : 3)} label="Throughput" />
          </ChartCard>
        </div>
        <ChartCard
          title="Average queueing delay by traffic class"
          description={isModeA ? 'Where scheduling makes its difference: who waits, and for how long.' : 'Average steps waited per class under each buffer policy.'}
        >
          <ClassGroupedBars results={results} accessor={(r, c) => r.average_queueing_delay_by_class[c]} format={(v, axis) => (axis ? fixed(v, 0) : steps(v, 2))} />
        </ChartCard>
      </ChartGroup>

      <ChartGroup title="Traffic-class fairness" intro="How evenly delivered throughput was shared across the six classes.">
        <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
          <ChartCard title="Jain's fairness index" description="1 = perfectly even share. Lower is a trade-off, not a failure.">
            <PolicyBars results={results} accessor={(r) => r.fairness_index} format={(v) => fixed(v, 3)} label="Fairness" domain={[0, 1]} />
          </ChartCard>
          <ChartCard title="Delivered throughput by traffic class" description="Packets per step that reached the link — the values the fairness index summarises.">
            <ClassGroupedBars results={results} accessor={(r, c) => r.throughput_by_class[c]} format={(v) => fixed(v, 3)} />
          </ChartCard>
        </div>
      </ChartGroup>

      <Reproducibility response={response} />
    </motion.div>
  )
}
