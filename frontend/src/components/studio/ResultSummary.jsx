import { motion } from 'motion/react'
import { SCHEDULER_BY_KEY, TRAFFIC_CLASSES } from '../../constants'
import { count, pct, steps } from '../../lib/format'
import { strategySwitchInsight, studioInsights } from '../../lib/insights'
import AnimatedNumber from '../AnimatedNumber'
import Icon from '../Icon'
import { InfoTip } from '../Tooltip'

const TONE_COLOR = { good: 'var(--color-good)', warn: 'var(--color-warn)', neutral: 'var(--color-accent)' }

export function MetricCard({ label, value, format, sub, info, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="surface p-4"
    >
      <div className="flex items-center gap-1.5 text-xs text-ink-muted">
        {label}
        {info && <InfoTip label={label}>{info}</InfoTip>}
      </div>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">
        <AnimatedNumber value={value} format={format} />
      </p>
      {sub && <p className="mt-0.5 text-xs text-ink-faint">{sub}</p>}
    </motion.div>
  )
}

function waitLabel(summary, key) {
  const generated = summary.generated_by_class[key]
  const delivered = summary.delivered_by_class[key]
  if (generated === 0) return { text: 'none arrived', value: null }
  if (delivered === 0) return { text: `none sent (${generated} arrived)`, value: null }
  return { text: steps(summary.average_queueing_delay_by_class[key]), value: summary.average_queueing_delay_by_class[key] }
}

function WaitByClass({ summary, previous }) {
  const values = TRAFFIC_CLASSES.map((c) => waitLabel(summary, c.key).value ?? 0)
  const scale = Math.max(1, ...values, ...(previous ? TRAFFIC_CLASSES.map((c) => waitLabel(previous.summary, c.key).value ?? 0) : []))
  return (
    <div className="surface p-5">
      <div className="mb-1 flex items-center gap-1.5">
        <h3 className="text-sm font-semibold">Average waiting time by traffic type</h3>
        <InfoTip label="waiting time by traffic type" align="start">
          Average steps each type of packet waited before being sent (delivered packets only). This is what the scheduling strategy changes.
        </InfoTip>
      </div>
      <p className="mb-4 text-xs text-ink-faint">
        This is where strategies differ.
        {previous && ` Faint bars: your ${SCHEDULER_BY_KEY[previous.ranConfig.scheduler].label} run.`}
      </p>
      <ul className="space-y-2.5">
        {TRAFFIC_CLASSES.map((c) => {
          const now = waitLabel(summary, c.key)
          const before = previous ? waitLabel(previous.summary, c.key) : null
          return (
            <li key={c.key} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[9rem_1fr_9rem]">
              <span className="flex items-center gap-2 truncate text-ink-muted">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.color }} />
                {c.label}
              </span>
              <span className="relative h-2.5 rounded-full bg-line" aria-hidden="true">
                {before?.value != null && (
                  <span className="absolute inset-y-0 left-0 rounded-full opacity-30" style={{ width: `${(before.value / scale) * 100}%`, background: c.color }} />
                )}
                <motion.span
                  className="absolute inset-y-[3px] left-0 rounded-full"
                  style={{ background: c.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${((now.value ?? 0) / scale) * 100}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </span>
              <span className={`text-right font-mono text-xs tabular-nums ${now.value == null ? 'text-warn' : 'text-ink'}`}>
                {now.text}
                {before && before.text !== now.text && <span className="block text-[10px] text-ink-faint">was {before.text}</span>}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function ResultSummary({ result, ranConfig, previous, onNavigate }) {
  const s = result.summary
  const insights = studioInsights(s)
  const switchInsight = strategySwitchInsight(previous, { summary: s, ranConfig })
  const comparable = switchInsight ? previous : null

  return (
    <section aria-label="Results" className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Results</h2>
        <span className="text-xs text-ink-faint">
          {SCHEDULER_BY_KEY[ranConfig.scheduler].label} · {ranConfig.duration} steps · seed {ranConfig.seed}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          label="Packets delivered"
          value={s.packets_delivered}
          format={count}
          sub={`of ${count(s.packets_generated)} generated${s.packets_queued_at_end ? ` · ${s.packets_queued_at_end} still waiting at the end` : ''}`}
        />
        <MetricCard
          label="Packets dropped"
          value={s.packets_dropped}
          format={count}
          sub="queue was full"
          delay={0.04}
          info="Packets that never got transmitted because there was no room in the queue."
        />
        <MetricCard
          label="Packet loss"
          value={s.packet_loss_rate}
          format={(v) => pct(v)}
          sub="dropped ÷ generated"
          delay={0.08}
          info="Packet loss rate = 100 × dropped packets ÷ generated packets."
        />
        <MetricCard
          label="Average waiting time"
          value={s.average_queueing_delay}
          format={(v) => steps(v, 2)}
          sub="before transmission"
          delay={0.12}
          info="Technical term: average queueing delay — the steps between a packet arriving and starting transmission, averaged over delivered packets."
        />
      </div>

      {switchInsight && (
        <div className="flex gap-3 rounded-xl border border-accent-3/40 bg-accent-3/10 px-4 py-3 text-sm leading-relaxed text-ink">
          <Icon name="layers" size={17} className="mt-0.5 shrink-0 text-accent-3" />
          <p>{switchInsight.text}</p>
        </div>
      )}

      <WaitByClass summary={s} previous={comparable} />

      <div className="surface p-5">
        <h3 className="mb-3 text-sm font-semibold">What happened in this run</h3>
        <ul className="space-y-2.5">
          {insights.map((item) => (
            <li key={item.text} className="flex gap-3 text-sm leading-relaxed text-ink-muted">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: TONE_COLOR[item.tone] }} />
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-xs text-ink-faint">
            {switchInsight ? 'For a longer, side-by-side comparison of all three:' : 'Try another strategy on the same traffic, or compare all three at once:'}
          </p>
          <button type="button" className="btn btn-secondary" onClick={() => onNavigate('analysis')}>
            Compare in Deep Analysis
            <Icon name="arrowRight" size={15} />
          </button>
        </div>
      </div>
    </section>
  )
}
