import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { CLASS_BY_KEY } from '../../constants'
import { useFrameInterval } from '../../hooks/useFrameInterval'

// Illustrative example, same queue for all three cards (oldest first).
// Adaptive scores use the simulator's rule at moderate congestion:
// score = priority + 0.5 x steps waited.
const EXAMPLE_ALPHA = 0.5
const MOMENTS = [
  { key: 'early', label: '2 steps', waits: { background: 2, file_transfer: 1, voice: 0 } },
  { key: 'late', label: '10 steps', waits: { background: 10, file_transfer: 4, voice: 0 } },
]
const QUEUE = ['background', 'file_transfer', 'voice']

const score = (cls, wait) => CLASS_BY_KEY[cls].priority + EXAMPLE_ALPHA * wait

const RULES = {
  fifo: () => 'background',
  static_priority: () => 'voice',
  adaptive_priority: (waits) => QUEUE.reduce((best, cls) => (score(cls, waits[cls]) > score(best, waits[best]) ? cls : best)),
}

const CARDS = [
  { key: 'fifo', title: 'FIFO', tagline: 'Serve packets in the order they arrive.', accent: '#94a3b8' },
  { key: 'static_priority', title: 'Static Priority', tagline: 'Serve important packets first, even if they arrived later.', accent: '#fbbf24' },
  { key: 'adaptive_priority', title: 'Adaptive Priority', tagline: 'Adjust scheduling behaviour according to congestion and waiting time.', accent: '#22d3ee' },
]

function MiniQueue({ rule, moment, showScores }) {
  const picked = RULES[rule](moment.waits)
  return (
    <div className="rounded-xl border border-line bg-canvas/70 px-3 pb-3 pt-6">
      <div className="flex items-end justify-center gap-3">
        {[...QUEUE].reverse().map((cls) => {
          const info = CLASS_BY_KEY[cls]
          const isPicked = cls === picked
          return (
            <div key={cls} className="flex w-14 flex-col items-center gap-1.5">
              <motion.div
                animate={{ y: isPicked ? -8 : 0, scale: isPicked ? 1.06 : 1, opacity: isPicked ? 1 : 0.55 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className={`relative flex h-11 w-9 items-center justify-center rounded-md font-mono text-xs font-semibold ${isPicked ? 'ring-2 ring-white ring-offset-2 ring-offset-canvas' : ''}`}
                style={{ background: `${info.color}33`, border: `1.5px solid ${info.color}`, color: info.color }}
              >
                {info.short[0]}
                {isPicked && (
                  <motion.span
                    layoutId={`picked-${rule}`}
                    className="absolute -top-6 whitespace-nowrap rounded-full bg-white px-1.5 py-px font-sans text-[9px] font-semibold uppercase tracking-wide"
                    style={{ color: '#070b14' }}
                  >
                    next
                  </motion.span>
                )}
              </motion.div>
              <span className="text-center text-[10px] leading-tight text-ink-faint">
                {info.short}
                <br />
                <span className="font-mono">P{info.priority} · w{moment.waits[cls]}</span>
                {showScores && (
                  <>
                    <br />
                    <span className={`font-mono ${isPicked ? 'text-accent' : ''}`}>= {score(cls, moment.waits[cls]).toFixed(1)}</span>
                  </>
                )}
              </span>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-wider text-ink-faint">front of queue →</p>
    </div>
  )
}

export default function AlgorithmCards() {
  const reduceMotion = useReducedMotion()
  const [momentIndex, setMomentIndex] = useState(0)
  const [auto, setAuto] = useState(true)

  useFrameInterval(() => setMomentIndex((i) => (i + 1) % MOMENTS.length), 3600, auto && !reduceMotion)

  const moment = MOMENTS[momentIndex]

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-center gap-3 text-sm text-ink-muted">
        <span>The same three waiting packets. Background has waited</span>
        <div className="flex rounded-lg border border-line bg-surface p-0.5" role="group" aria-label="How long background has waited">
          {MOMENTS.map((m, i) => (
            <button
              key={m.key}
              type="button"
              aria-pressed={i === momentIndex}
              onClick={() => {
                setAuto(false)
                setMomentIndex(i)
              }}
              className={`rounded-md px-3 py-1 font-mono text-xs transition-colors ${i === momentIndex ? 'bg-surface-2 text-accent' : 'text-ink-faint hover:text-ink'}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {CARDS.map((card) => (
          <motion.article
            key={card.key}
            whileHover={{ y: -4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="surface group relative flex flex-col gap-4 p-5 transition-colors hover:border-line-strong"
          >
            <span className="absolute inset-x-5 top-0 h-px opacity-60 transition-opacity group-hover:opacity-100" style={{ background: `linear-gradient(90deg, transparent, ${card.accent}, transparent)` }} />
            <div>
              <h3 className="text-lg font-semibold" style={{ color: card.accent }}>
                {card.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">“{card.tagline}”</p>
            </div>
            <div className="mt-auto">
              <MiniQueue rule={card.key} moment={moment} showScores={card.key === 'adaptive_priority'} />
            </div>
          </motion.article>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-ink-faint">
        Illustrative example. P = base priority, w = steps waited; adaptive score = P + {EXAMPLE_ALPHA} × w (queue 50–80% full). The
        Studio runs the real thing.
      </p>
    </div>
  )
}
