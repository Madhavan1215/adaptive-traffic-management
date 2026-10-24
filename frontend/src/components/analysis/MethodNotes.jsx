import { AnimatePresence, motion } from 'motion/react'
import { useId, useState } from 'react'
import Icon from '../Icon'

const NOTES = [
  {
    title: 'Scheduling rules',
    items: [
      ['FIFO', 'Serves the oldest queued packet. Traffic class is ignored.'],
      ['Static priority', 'Serves the highest base priority (Voice/Gaming 5, Video 4, Data 3, Files 2, Background 1); the earliest arrival wins ties. A steady stream of important packets can starve low-priority ones.'],
      ['Adaptive priority', 'Queue under 50% full: FIFO. 50–80%: serve the highest score = priority + α × steps waited. Over 80%: the same score with α doubled. Ties go to the earliest arrival. Because waiting time grows without limit, every packet is eventually served.'],
    ],
  },
  {
    title: 'Scheduling vs. buffer admission',
    items: [
      ['Scheduling', 'Decides which waiting packet is sent next. It never drops anything.'],
      ['Admission (drop policy)', 'Decides what happens when a packet arrives at a full queue. Tail drop rejects the newcomer; priority displacement may evict the lowest-priority waiting packet instead.'],
      ['Why loss can stay the same', 'With the same arrivals, buffer size, speed and tail drop, the queue length at every step is the same for every scheduler, so the same arrivals are turned away. Mode A therefore isolates delay and fairness, not loss.'],
    ],
  },
  {
    title: 'Metrics',
    items: [
      ['Packet loss rate', '100 × dropped ÷ generated, overall and per class.'],
      ['Queueing delay', 'Service start step − arrival step, for delivered packets. Never negative.'],
      ['Throughput', 'Delivered packets ÷ simulation steps.'],
      ['Queue utilisation', 'Queued packets ÷ capacity, recorded each step after admission. Different from link utilisation.'],
      ["Jain's fairness index", '(Σxᵢ)² ÷ (n · Σxᵢ²) over per-class delivered throughput; 1 means perfectly even, 1/n means one class got everything.'],
    ],
  },
  {
    title: 'Assumptions and limitations',
    items: [
      ['Model', 'One bottleneck queue and one output link in discrete time; no routing, multiple hops, or TCP feedback.'],
      ['Traffic', 'Independent random (Bernoulli) arrivals per class per step, equal packet sizes. Real traffic is often bursty.'],
      ['Priorities', 'Project-defined values for this simulation, not a real QoS standard.'],
      ['Scope', 'Results describe this model only. It does not capture or change real network traffic.'],
    ],
  },
]

// Worked example: one queue at step 10 under high congestion (α = 0.5, so α_eff = 1.0).
const EXAMPLE = [
  { name: 'A — Background', arrival: 0, priority: 1 },
  { name: 'B — File Transfer', arrival: 5, priority: 2 },
  { name: 'C — Voice', arrival: 9, priority: 5 },
]
const NOW = 10
const ALPHA_EFF = 1.0

export default function MethodNotes() {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <section className="surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left"
      >
        <span>
          <span className="block text-sm font-semibold">Method & definitions</span>
          <span className="block text-xs text-ink-faint">How each strategy decides, what each metric means, and what the model leaves out.</span>
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-ink-muted">
          <Icon name="chevronDown" size={18} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="grid gap-6 border-t border-line px-5 py-5 md:grid-cols-2">
              {NOTES.map((group) => (
                <div key={group.title}>
                  <h4 className="eyebrow mb-3">{group.title}</h4>
                  <dl className="space-y-2.5">
                    {group.items.map(([term, text]) => (
                      <div key={term}>
                        <dt className="text-sm font-medium text-ink">{term}</dt>
                        <dd className="text-sm leading-relaxed text-ink-muted">{text}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
            <div className="border-t border-line px-5 py-5">
              <h4 className="eyebrow mb-1">Worked example</h4>
              <p className="mb-3 text-sm text-ink-muted">
                The same queue at step {NOW}, over 80% full (α = 0.5, so α doubles to {ALPHA_EFF.toFixed(1)}).
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-ink-faint">
                      <th className="py-2 pr-4 font-medium">Packet</th>
                      <th className="py-2 pr-4 font-medium">Arrived</th>
                      <th className="py-2 pr-4 font-medium">Priority</th>
                      <th className="py-2 pr-4 font-medium">Waited</th>
                      <th className="py-2 font-medium">Adaptive score</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {EXAMPLE.map((p) => (
                      <tr key={p.name} className="border-b border-line/60 last:border-0">
                        <td className="py-2 pr-4 font-sans">{p.name}</td>
                        <td className="py-2 pr-4">{p.arrival}</td>
                        <td className="py-2 pr-4">{p.priority}</td>
                        <td className="py-2 pr-4">{NOW - p.arrival}</td>
                        <td className="py-2 text-accent">
                          {p.priority} + {ALPHA_EFF.toFixed(1)} × {NOW - p.arrival} = {(p.priority + ALPHA_EFF * (NOW - p.arrival)).toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                FIFO sends <span className="text-ink">A</span> (oldest). Static priority sends <span className="text-ink">C</span> (highest
                priority). Adaptive sends <span className="text-ink">A</span>: its 10-step wait has outgrown Voice's priority advantage
                (11.0 vs 6.0).
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
