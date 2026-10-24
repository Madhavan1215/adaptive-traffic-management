import { motion } from 'motion/react'
import { SCHEDULER_BY_KEY } from '../../constants'
import { count, pct, steps } from '../../lib/format'
import { studioInsights } from '../../lib/insights'
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

export default function ResultSummary({ result, ranConfig, onNavigate }) {
  const s = result.summary
  const insights = studioInsights(s)

  return (
    <section aria-label="Results" className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Results</h2>
        <span className="text-xs text-ink-faint">
          {SCHEDULER_BY_KEY[ranConfig.scheduler].label} · {ranConfig.duration} steps · seed {ranConfig.seed}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label="Packets delivered" value={s.packets_delivered} format={count} sub={`of ${count(s.packets_generated)} generated`} />
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
          <p className="text-xs text-ink-faint">Want to see how the other strategies handle the same traffic?</p>
          <button type="button" className="btn btn-secondary" onClick={() => onNavigate('analysis')}>
            Compare in Deep Analysis
            <Icon name="arrowRight" size={15} />
          </button>
        </div>
      </div>
    </section>
  )
}
