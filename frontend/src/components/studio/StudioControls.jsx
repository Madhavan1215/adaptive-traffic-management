import { AnimatePresence, motion } from 'motion/react'
import { useId, useState } from 'react'
import { DROP_POLICIES, PRESET_INFO, PRESET_ORDER, SCHEDULERS, SCHEDULER_BY_KEY, TRAFFIC_CLASSES } from '../../constants'
import { LIMITS, matchingPreset, offeredLoad } from '../../lib/config'
import Icon from '../Icon'
import Slider from '../Slider'
import { InfoTip } from '../Tooltip'

export function OptionCard({ name, checked, onChange, title, description, visual, compact = false }) {
  return (
    <label
      className={`group relative flex cursor-pointer items-start gap-3 rounded-xl border transition-all duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
        compact ? 'px-3 py-2.5' : 'p-3'
      } ${checked ? 'border-accent/70 bg-accent/[0.07] shadow-[0_0_0_1px_rgba(34,211,238,0.15)]' : 'border-line hover:-translate-y-px hover:border-line-strong hover:bg-surface-2/70'}`}
    >
      <input type="radio" name={name} value={title} aria-label={title} checked={checked} onChange={onChange} className="sr-only" />
      {visual && <span className="mt-0.5 shrink-0">{visual}</span>}
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-semibold ${checked ? 'text-ink' : 'text-ink'}`}>{title}</span>
        {description && <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">{description}</span>}
      </span>
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${checked ? 'border-accent bg-accent' : 'border-line-strong'}`}
        aria-hidden="true"
      >
        {checked && <span className="h-1.5 w-1.5 rounded-full bg-canvas" />}
      </span>
    </label>
  )
}

function IntensityBars({ level }) {
  const heights = [5, 9, 13]
  return (
    <svg width="22" height="16" viewBox="0 0 22 16" aria-hidden="true">
      {heights.map((h, i) => (
        <rect key={i} x={i * 8} y={16 - h} width="5" height={h} rx="1.5" fill={i <= level ? 'var(--color-accent)' : 'var(--color-line-strong)'} />
      ))}
    </svg>
  )
}

// Same three waiting packets (oldest on the right); the ring marks which one each strategy sends.
function StrategyGlyph({ kind }) {
  const packets = [
    { color: '#22d3ee', x: 2 },
    { color: '#fbbf24', x: 12 },
    { color: '#94a3b8', x: 22 },
  ]
  const picked = kind === 'fifo' ? 2 : kind === 'static_priority' ? 0 : null
  return (
    <svg width="34" height="18" viewBox="0 0 34 18" aria-hidden="true">
      {packets.map((p, i) => (
        <rect key={i} x={p.x} y="4" width="8" height="10" rx="2" fill={p.color} fillOpacity={picked === null || picked === i ? 0.9 : 0.3} />
      ))}
      {picked !== null && <rect x={packets[picked].x - 1.5} y="2.5" width="11" height="13" rx="3" fill="none" stroke="#fff" strokeWidth="1.2" />}
      {picked === null && <path d="M17 1.5v2M17 14.5v2" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />}
    </svg>
  )
}

function LoadMeter({ config }) {
  const { arrivals, capacity, ratio } = offeredLoad(config)
  const tone = ratio < 0.75 ? 'var(--color-good)' : ratio < 1 ? 'var(--color-warn)' : 'var(--color-bad)'
  const width = Math.min(ratio, 2) * 50
  return (
    <div className="rounded-xl border border-line bg-canvas/60 p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-ink-muted">
          Load on the network
          <InfoTip label="network load" align="start">
            Average packets arriving per step divided by how many the network can send per step. Above 100%, packets arrive faster than they
            can leave, so the queue fills up.
          </InfoTip>
        </span>
        <span className="font-mono tabular-nums" style={{ color: tone }}>
          {Math.round(ratio * 100)}%
        </span>
      </div>
      <div className="relative mt-2 h-1.5 rounded-full bg-line">
        <motion.div className="h-full rounded-full" style={{ background: tone }} animate={{ width: `${width}%` }} transition={{ duration: 0.3 }} />
        <span className="absolute -top-1 left-1/2 h-3.5 w-px bg-ink-faint" aria-hidden="true" />
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
        ≈{arrivals.toFixed(2)} packets arrive per step; the network sends {capacity}. Tick = 100% of capacity.
      </p>
    </div>
  )
}

export default function StudioControls({ config, dispatch, presets, onRun, onReset, running }) {
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const advancedId = useId()
  const preset = matchingPreset(config.arrival_rates, presets)
  const setField = (field) => (value) => dispatch({ type: 'setField', field, value })

  return (
    <aside className="surface flex h-fit flex-col gap-6 p-5" aria-label="Simulation settings">
      <fieldset>
        <legend className="mb-2 flex w-full items-center justify-between text-sm font-semibold">
          Traffic intensity
          {preset === 'custom' && <span className="rounded-full bg-accent-3/15 px-2 py-0.5 text-[11px] font-medium text-accent-3">Custom mix</span>}
        </legend>
        <div className="grid gap-2">
          {PRESET_ORDER.map((name, i) => (
            <OptionCard
              key={name}
              name="intensity"
              checked={preset === name}
              onChange={() => dispatch({ type: 'setPreset', preset: name, presets })}
              title={PRESET_INFO[name].label}
              description={PRESET_INFO[name].description}
              visual={<IntensityBars level={i} />}
              compact
            />
          ))}
        </div>
        {preset === 'custom' && (
          <p className="mt-2 text-xs leading-relaxed text-ink-muted">
            You've edited the arrival rates in Advanced Settings. Pick a level above to go back to a preset.
          </p>
        )}
        <div className="mt-3">
          <LoadMeter config={config} />
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Scheduling strategy</legend>
        <div className="grid gap-2">
          {SCHEDULERS.map((s) => (
            <OptionCard
              key={s.key}
              name="scheduler"
              checked={config.scheduler === s.key}
              onChange={() => setField('scheduler')(s.key)}
              title={s.label}
              description={s.tagline}
              visual={<StrategyGlyph kind={s.key} />}
              compact
            />
          ))}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={config.scheduler}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="mt-2 text-xs leading-relaxed text-ink-muted"
          >
            {SCHEDULER_BY_KEY[config.scheduler].description}
          </motion.p>
        </AnimatePresence>
      </fieldset>

      <div className="space-y-5">
        <Slider
          label="How many packets can wait?"
          value={config.queue_capacity}
          {...LIMITS.queue_capacity}
          onChange={setField('queue_capacity')}
          format={(v) => `${v} packets`}
          hint="The queue's size. When every slot is taken, new packets are dropped."
        />
        <Slider
          label="How many packets can the network send per step?"
          value={config.service_rate}
          {...LIMITS.service_rate}
          onChange={setField('service_rate')}
          format={(v) => `${v} / step`}
          hint="Network speed. A higher value means more packets are transmitted in each simulation step."
        />
      </div>

      <div className="rounded-xl border border-line">
        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          aria-expanded={advancedOpen}
          aria-controls={advancedId}
          className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
        >
          Advanced Settings
          <motion.span animate={{ rotate: advancedOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <Icon name="chevronDown" size={16} />
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {advancedOpen && (
            <motion.div
              id={advancedId}
              key="advanced"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <AdvancedSettings config={config} dispatch={dispatch} setField={setField} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex gap-2">
        <button type="button" className="btn btn-primary flex-1" onClick={onRun} disabled={running}>
          {running ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#04121a]/30 border-t-[#04121a]" aria-hidden="true" />
              Running…
            </>
          ) : (
            <>
              <Icon name="play" size={15} />
              Run Simulation
            </>
          )}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onReset} disabled={running} aria-label="Reset settings and results">
          <Icon name="reset" size={16} />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>
    </aside>
  )
}

function AdvancedSettings({ config, dispatch, setField }) {
  const seedId = useId()
  return (
    <div className="space-y-6 border-t border-line px-4 pb-5 pt-4">
      <div>
        <div className="mb-3 flex items-center gap-1.5">
          <span className="text-sm font-medium">Arrival rate by traffic type</span>
          <InfoTip label="arrival rate" align="start">
            The chance that one packet of this type arrives in each step (0 = never, 1 = every step). Technically, independent Bernoulli
            arrivals per class per time slot. Editing any rate turns the intensity into a custom mix.
          </InfoTip>
        </div>
        <div className="space-y-3">
          {TRAFFIC_CLASSES.map((c) => (
            <Slider
              key={c.key}
              label={
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                  {c.label}
                  <span className="font-mono text-[10px] text-ink-faint">P{c.priority}</span>
                </span>
              }
              value={config.arrival_rates[c.key]}
              {...LIMITS.arrival_rate}
              onChange={(value) => dispatch({ type: 'setRate', trafficClass: c.key, value })}
              format={(v) => v.toFixed(2)}
              accent={c.color}
            />
          ))}
        </div>
      </div>

      <Slider
        label="Waiting-time influence"
        value={config.alpha}
        {...LIMITS.alpha}
        onChange={setField('alpha')}
        format={(v) => v.toFixed(2)}
        info="Technical name: aging coefficient (α). Adaptive score = priority + α × steps waited, and α is doubled when the queue is over 80% full. Higher values let long-waiting packets catch up faster."
        hint={config.scheduler === 'adaptive_priority' ? 'How quickly waiting packets gain priority.' : 'Only used by Adaptive Priority.'}
      />

      <Slider
        label="Simulation length"
        value={config.duration}
        {...LIMITS.duration}
        onChange={setField('duration')}
        format={(v) => `${v} steps`}
        hint="How many time steps packets keep arriving. The replay shows every step."
      />

      <div>
        <div className="mb-1 flex items-center gap-1.5">
          <label htmlFor={seedId} className="text-sm font-medium">
            Random seed
          </label>
          <InfoTip label="random seed">
            Fixes the random packet arrivals. The same seed and settings always reproduce exactly the same run.
          </InfoTip>
        </div>
        <input
          id={seedId}
          type="number"
          inputMode="numeric"
          min={LIMITS.seed.min}
          max={LIMITS.seed.max}
          value={Number.isNaN(config.seed) ? '' : config.seed}
          onChange={(e) => setField('seed')(e.target.value === '' ? Number.NaN : Number(e.target.value))}
          className="field font-mono"
        />
      </div>

      <fieldset>
        <legend className="mb-2 flex items-center gap-1.5 text-sm font-medium">
          When the queue is full
          <InfoTip label="drop policy" align="start">
            The buffer admission (drop) policy. This decides which packet is lost when there is no room, which is separate from the
            scheduling strategy that decides which packet is sent next.
          </InfoTip>
        </legend>
        <div className="grid gap-2">
          {DROP_POLICIES.map((p) => (
            <OptionCard
              key={p.key}
              name="drop-policy"
              checked={config.drop_policy === p.key}
              onChange={() => setField('drop_policy')(p.key)}
              title={p.label}
              description={p.description}
              compact
            />
          ))}
        </div>
      </fieldset>
    </div>
  )
}
