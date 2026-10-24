import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts'
import { CLASS_BY_KEY, SCHEDULER_BY_KEY, TRAFFIC_CLASSES } from '../../constants'
import { useFrameInterval } from '../../hooks/useFrameInterval'
import { fixed } from '../../lib/format'
import { AXIS, GRID, TOOLTIP } from '../charts/chartTheme'
import Icon from '../Icon'
import { InfoTip, Tooltip } from '../Tooltip'

const SPEEDS = [0.5, 1, 2, 4]
const BASE_INTERVAL_MS = 800

const LEVEL_TEXT = {
  low: 'under 50% full → acts like FIFO',
  moderate: '50–80% full → priority-aware',
  high: 'over 80% full → aggressive prioritisation',
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

function decisionLines(frame, scheduler, alpha) {
  if (frame.served.length === 0) return ['Nothing to send — the queue was empty.']
  return frame.served.map((s) => {
    const cls = CLASS_BY_KEY[s.cls]
    if (scheduler === 'fifo') return `Sent ${cls.label}: the oldest waiting packet (waited ${plural(s.wait, 'step')}).`
    if (scheduler === 'static_priority') {
      return `Sent ${cls.label} (priority ${cls.priority}): the highest-priority packet waiting.`
    }
    if (frame.level === 'low') return `Sent ${cls.label}: the oldest packet, because the queue is under half full.`
    const alphaEff = frame.level === 'high' ? alpha * 2 : alpha
    return `Sent ${cls.label}: score ${cls.priority} + ${fixed(alphaEff, 2)} × ${s.wait} waited = ${fixed(s.score, 2)}, the highest score waiting.`
  })
}

function dropLine(frame) {
  const full = frame.dropped.filter((d) => d.reason === 'buffer_full').length
  const pushed = frame.dropped.filter((d) => d.reason === 'displaced')
  const parts = []
  if (full) parts.push(`${plural(full, 'arriving packet')} dropped: the queue was full`)
  if (pushed.length) {
    parts.push(`${pushed.map((d) => CLASS_BY_KEY[d.cls].label).join(', ')} pushed out to make room for a more important arrival`)
  }
  return parts.join(' · ')
}

function Pill({ packet, size = 'lane', dropped = false, children }) {
  const cls = CLASS_BY_KEY[packet.cls]
  const lane = size === 'lane'
  return (
    <span
      className={`flex items-center justify-center rounded-md font-mono text-[10px] font-semibold ${lane ? 'h-7 w-7' : 'h-full w-full'}`}
      style={{
        background: dropped ? 'transparent' : `${cls.color}2e`,
        border: `1.5px ${dropped ? 'dashed' : 'solid'} ${dropped ? 'var(--color-bad)' : cls.color}`,
        color: dropped ? 'var(--color-bad)' : cls.color,
      }}
    >
      {children}
    </span>
  )
}

function Lane({ title, children, empty }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 sm:w-24">
      <span className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">{title}</span>
      <div className="flex min-h-9 flex-wrap content-start gap-1.5">
        {children}
        {empty && <span className="text-xs text-ink-faint">—</span>}
      </div>
    </div>
  )
}

export default function QueueReplay({ result, ranConfig, elapsedMs, previewCapacity }) {
  const frames = useMemo(() => result?.replay ?? [], [result])
  const reduceMotion = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(() => frames.length > 0 && !reduceMotion)
  const [speed, setSpeed] = useState(1)
  const indexRef = useRef(index)

  useEffect(() => {
    indexRef.current = index
  }, [index])

  useFrameInterval(
    () => {
      const next = Math.min(indexRef.current + 1, frames.length - 1)
      setIndex(next)
      if (next >= frames.length - 1) setPlaying(false)
    },
    BASE_INTERVAL_MS / speed,
    playing,
  )

  const history = useMemo(
    () => (result?.queue_utilisation_history ?? []).map(([t, u]) => ({ t, pct: Math.round(u * 1000) / 10 })),
    [result],
  )

  if (!result) return <QueuePreview capacity={previewCapacity} />

  if (frames.length === 0) {
    return (
      <section className="surface p-5 text-sm text-ink-muted">
        This run has no recorded steps to replay.
      </section>
    )
  }

  const frame = frames[Math.min(index, frames.length - 1)]
  const capacity = ranConfig.queue_capacity
  const scheduler = ranConfig.scheduler
  const showLetters = capacity <= 20
  const occupiedAtDecision = frame.queue.length + frame.served.length
  const droppedIds = new Set(frame.dropped.map((d) => d.id))
  const displacedIds = new Set(frame.dropped.filter((d) => d.reason === 'displaced').map((d) => d.id))
  const last = frames.length - 1
  const atEnd = index >= last

  return (
    <section className="surface overflow-hidden" aria-label="Queue replay">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Queue replay</h2>
          <InfoTip label="the queue replay" align="start">
            The simulation finished on the server in {Math.round(elapsedMs)} ms. This plays back the first {frames.length} of its{' '}
            {ranConfig.duration} steps from the recorded event log — every arrival, drop and transmission shown here actually happened in
            that run.
          </InfoTip>
        </div>
        <span className="rounded-full border border-line-strong px-2.5 py-0.5 font-mono text-[11px] text-ink-faint">
          playback · steps 0–{last} of {ranConfig.duration}
        </span>
      </div>

      <div className="px-5 pt-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-mono text-sm">
            <span className="text-ink-faint">step</span> <span className="text-ink">{frame.t}</span>
          </p>
          <p className="text-xs text-ink-muted">
            <span className="text-ink">{SCHEDULER_BY_KEY[scheduler].label}</span> · queue {occupiedAtDecision}/{capacity} when it decided
            {scheduler === 'adaptive_priority' && <span className="text-accent"> · {LEVEL_TEXT[frame.level]}</span>}
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
          <Lane title="Arriving" empty={frame.arrivals.length === 0}>
            <AnimatePresence initial={false} mode="popLayout">
              {frame.arrivals.map((p) => (
                <motion.span
                  key={`${frame.t}-${p.id}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <Tooltip content={`${CLASS_BY_KEY[p.cls].label} arrived${droppedIds.has(p.id) ? ' — dropped, queue full' : ''}`}>
                    <Pill packet={p} dropped={droppedIds.has(p.id)}>
                      {droppedIds.has(p.id) ? '×' : CLASS_BY_KEY[p.cls].short[0]}
                    </Pill>
                  </Tooltip>
                </motion.span>
              ))}
            </AnimatePresence>
          </Lane>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-ink-faint">
              <span>← back of queue</span>
              <span>front →</span>
            </div>
            <div
              className="flex h-14 flex-row-reverse gap-[3px] rounded-xl border border-line-strong bg-canvas p-1.5"
              role="img"
              aria-label={`Queue holds ${frame.queue.length} of ${capacity} packets after step ${frame.t}`}
            >
              <AnimatePresence initial={false} custom={displacedIds}>
                {frame.queue.map((p) => (
                  <motion.div
                    key={p.id}
                    layout
                    custom={displacedIds}
                    variants={{
                      enter: { opacity: 0, x: -12 },
                      show: { opacity: 1, x: 0 },
                      leave: (gone) => (gone.has(p.id) ? { opacity: 0, y: 14, transition: { duration: 0.3 } } : { opacity: 0, x: 18, transition: { duration: 0.25 } }),
                    }}
                    initial="enter"
                    animate="show"
                    exit="leave"
                    transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                    className="min-w-0 flex-1"
                  >
                    <Tooltip
                      className="h-full w-full"
                      content={`${CLASS_BY_KEY[p.cls].label} · priority ${CLASS_BY_KEY[p.cls].priority} · arrived at step ${p.arrival}, waiting ${plural(frame.t - p.arrival, 'step')}`}
                    >
                      <Pill packet={p} size="slot">
                        {showLetters ? CLASS_BY_KEY[p.cls].short[0] : null}
                      </Pill>
                    </Tooltip>
                  </motion.div>
                ))}
              </AnimatePresence>
              {Array.from({ length: Math.max(0, capacity - frame.queue.length) }, (_, i) => (
                <div key={`empty-${i}`} className="min-w-0 flex-1 rounded-md border border-dashed border-line" />
              ))}
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
              <motion.div
                className="h-full rounded-full"
                animate={{ width: `${(occupiedAtDecision / capacity) * 100}%` }}
                style={{ background: frame.level === 'high' ? 'var(--color-bad)' : frame.level === 'moderate' ? 'var(--color-warn)' : 'var(--color-good)' }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          <Lane title="Sent" empty={frame.served.length === 0}>
            <AnimatePresence initial={false} mode="popLayout">
              {frame.served.map((p) => (
                <motion.span
                  key={`${frame.t}-${p.id}`}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 14 }}
                  transition={{ duration: 0.3 }}
                >
                  <Tooltip align="end" content={`${CLASS_BY_KEY[p.cls].label} sent after waiting ${plural(p.wait, 'step')}`}>
                    <Pill packet={p}>{CLASS_BY_KEY[p.cls].short[0]}</Pill>
                  </Tooltip>
                </motion.span>
              ))}
            </AnimatePresence>
          </Lane>
        </div>

        <div className="mt-4 space-y-1 rounded-xl border border-line bg-surface-2/60 px-4 py-3 text-sm" aria-live="polite">
          {decisionLines(frame, scheduler, ranConfig.alpha).map((line) => (
            <p key={line} className="text-ink">
              {line}
            </p>
          ))}
          {frame.dropped.length > 0 && <p className="text-bad">{dropLine(frame)}</p>}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {TRAFFIC_CLASSES.map((c) => (
            <span key={c.key} className="flex items-center gap-1.5 text-xs text-ink-faint">
              <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
              {c.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
        <button type="button" className="btn btn-ghost !px-2" onClick={() => { setIndex(0); setPlaying(false) }} aria-label="Back to step 0">
          <Icon name="reset" size={16} />
        </button>
        <button type="button" className="btn btn-ghost !px-2" onClick={() => { setPlaying(false); setIndex((i) => Math.max(0, i - 1)) }} disabled={index === 0} aria-label="Previous step">
          <Icon name="stepBack" size={16} />
        </button>
        <button
          type="button"
          className="btn btn-secondary !px-3"
          onClick={() => {
            if (atEnd) setIndex(0)
            setPlaying((p) => !p || atEnd)
          }}
          aria-label={playing ? 'Pause replay' : 'Play replay'}
        >
          <Icon name={playing ? 'pause' : 'play'} size={16} />
          <span className="hidden sm:inline">{playing ? 'Pause' : atEnd ? 'Replay' : 'Play'}</span>
        </button>
        <button type="button" className="btn btn-ghost !px-2" onClick={() => { setPlaying(false); setIndex((i) => Math.min(last, i + 1)) }} disabled={atEnd} aria-label="Next step">
          <Icon name="stepForward" size={16} />
        </button>
        <input
          type="range"
          className="range mx-1 min-w-32 flex-1"
          min={0}
          max={last}
          value={index}
          onChange={(e) => { setPlaying(false); setIndex(Number(e.target.value)) }}
          aria-label="Replay position"
          aria-valuetext={`Step ${frame.t}`}
          style={{ '--fill': `${last === 0 ? 100 : (index / last) * 100}%` }}
        />
        <div className="flex rounded-lg border border-line p-0.5" role="group" aria-label="Playback speed">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              aria-pressed={speed === s}
              className={`rounded-md px-2 py-1 font-mono text-[11px] transition-colors ${speed === s ? 'bg-surface-2 text-accent' : 'text-ink-faint hover:text-ink'}`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-line px-5 pb-4 pt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wider text-ink-faint">Queue occupancy, whole run</h3>
          <span className="text-[11px] text-ink-faint">shaded: replayed steps · dashed: 50% / 80%</span>
        </div>
        <ResponsiveContainer width="100%" height={130}>
          <AreaChart
            data={history}
            margin={{ top: 4, right: 4, left: -22, bottom: 0 }}
            onClick={(e) => {
              const t = Number(e?.activeLabel ?? e?.activeTooltipIndex)
              if (Number.isInteger(t) && t <= last) {
                setPlaying(false)
                setIndex(t)
              }
            }}
          >
            <defs>
              <linearGradient id="occ-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#22d3ee" stopOpacity={0.35} />
                <stop offset="1" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="t" {...AXIS} minTickGap={40} />
            <YAxis {...AXIS} domain={[0, 100]} ticks={[0, 50, 100]} unit="%" />
            <ReferenceArea x1={0} x2={last} fill="#22d3ee" fillOpacity={0.05} />
            <ReferenceLine y={50} stroke="var(--color-line-strong)" strokeDasharray="4 4" />
            <ReferenceLine y={80} stroke="var(--color-line-strong)" strokeDasharray="4 4" />
            <ReferenceLine x={frame.t} stroke="#fff" strokeOpacity={0.7} />
            <ChartTooltip {...TOOLTIP} formatter={(v) => [`${v}%`, 'Queue full']} labelFormatter={(t) => `Step ${t}`} />
            <Area type="stepAfter" dataKey="pct" stroke="#22d3ee" strokeWidth={1.5} fill="url(#occ-fill)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

function QueuePreview({ capacity }) {
  return (
    <section className="surface p-5" aria-label="Queue preview">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Queue</h2>
        <span className="font-mono text-xs text-ink-faint">{capacity} slots</span>
      </div>
      <div className="flex h-14 flex-row-reverse gap-[3px] rounded-xl border border-line-strong bg-canvas p-1.5">
        <AnimatePresence initial={false}>
          {Array.from({ length: capacity }, (_, i) => (
            <motion.div
              key={i}
              layout
              initial={{ opacity: 0, scaleY: 0.4 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0.4 }}
              transition={{ duration: 0.2 }}
              className="min-w-0 flex-1 rounded-md border border-dashed border-line-strong"
            />
          ))}
        </AnimatePresence>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-ink-muted">
        This is your queue: room for <span className="text-ink">{capacity}</span> waiting packets. Run the simulation to replay how packets
        arrived, waited, got sent — or got dropped when it was full.
      </p>
    </section>
  )
}
