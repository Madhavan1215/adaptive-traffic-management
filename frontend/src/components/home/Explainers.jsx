import { motion } from 'motion/react'
import Icon from '../Icon'

const loop = (delay = 0, duration = 2.4) => ({ duration, repeat: Infinity, repeatDelay: 0.6, delay, ease: 'easeInOut' })

function BurstArt() {
  const colors = ['#22d3ee', '#60a5fa', '#a78bfa', '#34d399', '#fbbf24', '#94a3b8']
  return (
    <svg viewBox="0 4 160 62" className="h-full w-full" aria-hidden="true">
      <rect x="118" y="20" width="30" height="30" rx="6" fill="none" stroke="var(--color-line-strong)" />
      {colors.map((c, i) => (
        <motion.rect
          key={c}
          width="10"
          height="10"
          rx="2.5"
          fill={c}
          initial={{ x: 6 + (i % 3) * 14, y: 8 + Math.floor(i / 3) * 34, opacity: 0 }}
          animate={{ x: [6 + (i % 3) * 14, 128], y: [8 + Math.floor(i / 3) * 34, 30], opacity: [0, 1, 1, 0] }}
          transition={loop(i * 0.12)}
        />
      ))}
    </svg>
  )
}

function WaitingArt() {
  const colors = ['#94a3b8', '#fbbf24', '#34d399', '#a78bfa', '#22d3ee']
  return (
    <svg viewBox="0 4 160 62" className="h-full w-full" aria-hidden="true">
      <rect x="6" y="22" width="120" height="26" rx="8" fill="none" stroke="var(--color-line-strong)" />
      <path d="M126 31h20M126 39h20" stroke="var(--color-line-strong)" />
      {colors.map((c, i) => (
        <motion.rect
          key={c}
          y="28"
          width="14"
          height="14"
          rx="3"
          fill={c}
          initial={{ x: 104 - i * 20 }}
          animate={{ x: [104 - i * 20, 104 - i * 20 + 6, 104 - i * 20] }}
          transition={loop(i * 0.1, 1.8)}
        />
      ))}
      <motion.circle cx="140" cy="35" r="3" fill="var(--color-accent)" animate={{ cx: [130, 156], opacity: [1, 0] }} transition={loop(0, 1.2)} />
    </svg>
  )
}

function DropArt() {
  const colors = ['#94a3b8', '#fbbf24', '#34d399', '#a78bfa', '#22d3ee']
  return (
    <svg viewBox="0 4 160 62" className="h-full w-full" aria-hidden="true">
      <rect x="46" y="10" width="108" height="26" rx="8" fill="none" stroke="var(--color-line-strong)" />
      {colors.map((c, i) => (
        <rect key={c} x={52 + i * 20} y="16" width="14" height="14" rx="3" fill={c} opacity="0.85" />
      ))}
      <motion.g animate={{ x: [0, 28, 22, 22], y: [0, 0, 26, 40], opacity: [1, 1, 1, 0] }} transition={loop(0, 2.2)}>
        <rect x="8" y="16" width="14" height="14" rx="3" fill="none" stroke="var(--color-bad)" strokeDasharray="3 2" strokeWidth="1.5" />
        <path d="M12 20l6 6M18 20l-6 6" stroke="var(--color-bad)" strokeWidth="1.5" strokeLinecap="round" />
      </motion.g>
      <text x="100" y="56" textAnchor="middle" fontSize="9" fill="var(--color-ink-faint)" fontFamily="var(--font-mono)">
        queue full
      </text>
    </svg>
  )
}

const POINTS = [
  { title: 'Too many packets arrive at the same time.', body: 'Calls, games, video and downloads all compete for the same link.', Art: BurstArt },
  { title: 'The network has limited capacity, so packets must wait.', body: 'Packets the link cannot send yet line up in a queue.', Art: WaitingArt },
  { title: 'When the queue fills up, packets may be dropped.', body: 'The queue has a fixed size. Anything arriving when it is full is lost.', Art: DropArt },
]

export function WhyCongestion() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {POINTS.map(({ title, body, Art }, i) => (
        <motion.div
          key={title}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.45, delay: i * 0.08 }}
          className="surface p-5"
        >
          <div className="mb-4 h-32 rounded-xl border border-line bg-canvas/60 px-2 py-1">
            <Art />
          </div>
          <p className="font-mono text-xs text-accent">0{i + 1}</p>
          <h3 className="mt-1 font-semibold leading-snug">{title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{body}</p>
        </motion.div>
      ))}
    </div>
  )
}

const STEPS = [
  { icon: 'spark', title: 'Generate packets', body: 'Six types of traffic arrive at random, at the rates you choose.' },
  { icon: 'queue', title: 'Place them in a finite queue', body: 'Packets wait in a buffer with limited space. If it is full, they are dropped.' },
  { icon: 'layers', title: 'Select using a scheduling algorithm', body: 'Each step, the strategy picks which waiting packet the link sends next.' },
  { icon: 'chart', title: 'Measure the outcome', body: 'Loss, waiting time, throughput and fairness are computed from the run.' },
]

export function HowItWorks() {
  return (
    <ol className="relative grid gap-6 lg:grid-cols-4 lg:gap-5">
      <span className="absolute bottom-6 left-[1.35rem] top-6 w-px bg-gradient-to-b from-accent/60 via-accent-3/40 to-transparent lg:hidden" aria-hidden="true" />
      <span className="absolute left-12 right-12 top-[1.35rem] hidden h-px bg-gradient-to-r from-accent/60 via-accent-3/50 to-accent-2/40 lg:block" aria-hidden="true" />
      {STEPS.map((step, i) => (
        <motion.li
          key={step.title}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.4, delay: i * 0.08 }}
          className="relative flex gap-4 lg:flex-col lg:gap-3"
        >
          <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface text-accent">
            <Icon name={step.icon} size={19} />
          </span>
          <div>
            <p className="font-mono text-xs text-ink-faint">Step {i + 1}</p>
            <h3 className="mt-0.5 font-semibold">{step.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{step.body}</p>
          </div>
        </motion.li>
      ))}
    </ol>
  )
}
