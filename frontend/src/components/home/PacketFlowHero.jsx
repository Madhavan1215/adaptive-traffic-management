import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { CLASS_BY_KEY, TRAFFIC_CLASSES } from '../../constants'
import { useFrameInterval } from '../../hooks/useFrameInterval'
import { Tooltip } from '../Tooltip'

// A scripted, looping ILLUSTRATION (not simulation output): a fixed arrival
// pattern feeds a 6-slot queue; each tick the highest score
// (priority + 0.5 x ticks waited) is sent, so nothing waits forever.
const CAPACITY = 6
const TICK_MS = 1300
const SEQUENCE = ['video', 'background', 'voice', 'normal_data', 'file_transfer', 'gaming', 'background', 'video', 'normal_data', 'voice', 'file_transfer', 'background', 'gaming', 'video']
const ARRIVALS_PER_TICK = [2, 1, 1, 2, 0, 1, 2, 1, 1, 0, 2, 1]

function pickNext(queue, tick) {
  let best = null
  let bestScore = -Infinity
  for (const p of queue) {
    const score = CLASS_BY_KEY[p.cls].priority + 0.5 * (tick - p.arrived)
    if (score > bestScore) {
      best = p
      bestScore = score
    }
  }
  return best?.id ?? null
}

function initialState() {
  const queue = [
    { id: 1, cls: 'background', arrived: -3 },
    { id: 2, cls: 'video', arrived: -2 },
    { id: 3, cls: 'normal_data', arrived: -1 },
  ]
  return { tick: 0, queue, incoming: [], sent: null, dropped: null, nextId: 4, seq: 0, arr: 0, selected: pickNext(queue, 0) }
}

function advance(state) {
  const tick = state.tick + 1
  const sent = state.queue.find((p) => p.id === state.selected) ?? null
  const queue = state.queue.filter((p) => p.id !== state.selected)
  const incoming = []
  let dropped = null
  let { nextId, seq } = state
  for (let i = 0; i < ARRIVALS_PER_TICK[state.arr]; i++) {
    const packet = { id: nextId++, cls: SEQUENCE[seq], arrived: tick }
    seq = (seq + 1) % SEQUENCE.length
    incoming.push(packet)
    if (queue.length < CAPACITY) queue.push(packet)
    else dropped = packet
  }
  return { tick, queue, incoming, sent, dropped, nextId, seq, arr: (state.arr + 1) % ARRIVALS_PER_TICK.length, selected: pickNext(queue, tick) }
}

function Packet({ cls, ring = false, faded = false, tick, arrived }) {
  const info = CLASS_BY_KEY[cls]
  return (
    <Tooltip
      content={
        <>
          <span className="font-semibold" style={{ color: info.color }}>
            {info.label}
          </span>{' '}
          · priority {info.priority}
          <br />
          {info.hint}
          {tick !== undefined && arrived !== undefined && (
            <>
              <br />
              waiting {Math.max(0, tick - arrived)} ticks
            </>
          )}
        </>
      }
    >
      <span
        className={`flex h-8 w-6 items-center justify-center rounded-md font-mono text-[10px] font-semibold transition-shadow sm:h-10 sm:w-8 sm:text-[11px] ${ring ? 'ring-2 ring-white ring-offset-2 ring-offset-canvas' : ''}`}
        style={{ background: `${info.color}${faded ? '22' : '33'}`, border: `1.5px solid ${info.color}`, color: info.color }}
      >
        {info.short[0]}
      </span>
    </Tooltip>
  )
}

export default function PacketFlowHero() {
  const reduceMotion = useReducedMotion()
  const [state, setState] = useState(initialState)
  const [paused, setPaused] = useState(false)

  useFrameInterval(() => setState(advance), TICK_MS, !reduceMotion && !paused)

  return (
    <div
      className="surface relative overflow-hidden p-5 shadow-2xl shadow-black/40 sm:p-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full border border-line-strong px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
          Illustration · not simulation output
        </span>
        <span className="font-mono text-[10px] text-ink-faint">{paused ? 'paused — hover packets for details' : 'hover to pause'}</span>
      </div>

      <div className="flex items-end gap-1.5 sm:gap-3">
        <div className="flex w-7 flex-col items-center gap-1.5 sm:w-10">
          <span className="text-[10px] uppercase tracking-wider text-ink-faint">In</span>
          <div className="flex min-h-[5.25rem] flex-col-reverse items-center gap-1.5">
            <AnimatePresence initial={false}>
              {state.incoming.map((p) => (
                <motion.div
                  key={`in-${p.id}`}
                  initial={{ opacity: 0, x: -18 }}
                  animate={{ opacity: 0.85, x: 0 }}
                  exit={{ opacity: 0, x: 18 }}
                  transition={{ duration: 0.35 }}
                >
                  <Packet cls={p.cls} faded />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <span className="mb-4 hidden text-ink-faint sm:inline" aria-hidden="true">→</span>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex justify-between text-[10px] uppercase tracking-wider text-ink-faint">
            <span>Finite queue</span>
            <span>
              {state.queue.length}/{CAPACITY}
            </span>
          </div>
          <div className="relative flex h-12 flex-row-reverse items-center gap-[3px] rounded-xl border border-line-strong bg-canvas px-1 sm:h-16 sm:gap-1.5 sm:px-1.5">
            <AnimatePresence initial={false}>
              {state.queue.map((p) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0, y: p.id === state.selected ? -3 : 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                >
                  <Packet cls={p.cls} ring={p.id === state.selected} tick={state.tick} arrived={p.arrived} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="relative mt-2 h-6">
            <AnimatePresence>
              {state.dropped && (
                <motion.div
                  key={`drop-${state.dropped.id}`}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.3 }}
                  className="absolute left-0 flex items-center gap-1.5 text-[11px] text-bad"
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded border border-dashed border-bad">×</span>
                  {CLASS_BY_KEY[state.dropped.cls].label} dropped — queue full
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="mb-[1.6rem] flex flex-col items-center gap-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/50 bg-accent/10 text-accent sm:h-10 sm:w-10" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 7h10M4 12h16M4 17h7" />
              <path d="m16 5 3 2-3 2" />
            </svg>
          </span>
          <span className="text-[10px] text-ink-faint">picks next</span>
        </div>

        <div className="mb-[1.6rem] w-12 sm:w-24">
          <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-ink-faint">Link out</span>
          <div className="relative h-10 overflow-hidden rounded-lg border border-line bg-canvas">
            <span className="absolute inset-x-2 top-1/2 h-px bg-line-strong" aria-hidden="true" />
            <AnimatePresence>
              {state.sent && (
                <motion.div
                  key={`out-${state.sent.id}`}
                  className="absolute left-1 top-1/2 -translate-y-1/2"
                  initial={{ x: 0, opacity: 1 }}
                  animate={{ x: 70, opacity: 0 }}
                  transition={{ duration: TICK_MS / 1000, ease: 'easeIn' }}
                >
                  <span className="block h-5 w-5 rounded" style={{ background: CLASS_BY_KEY[state.sent.cls].color }} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-line pt-4">
        {TRAFFIC_CLASSES.map((c) => (
          <span key={c.key} className="flex items-center gap-1.5 text-[11px] text-ink-faint">
            <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}
