import Card from '../components/Card'

const SECTIONS = [
  {
    title: 'FIFO (First In, First Out)',
    body: 'Serves packets strictly in arrival order, ignoring traffic class entirely. Simple and perfectly fair by arrival time, but a voice packet can wait behind a long burst of background traffic.',
  },
  {
    title: 'Static-priority scheduling',
    body: 'Always serves the highest base-priority packet in the queue first; ties broken by arrival order (FIFO). Low-latency traffic gets served quickly, but a continuous stream of high-priority arrivals can make a low-priority packet wait indefinitely — this is starvation.',
  },
  {
    title: 'Adaptive-priority scheduling',
    body: 'Combines base priority with waiting-time aging: priority_score = base_priority + alpha × waiting_time. Below 50% queue utilisation it behaves like FIFO (no need to prioritise when uncongested); from 50–80% it ranks by score; above 80% the aging coefficient is doubled, protecting high-priority traffic more aggressively while still letting long-waiting packets eventually win.',
  },
  {
    title: 'Congestion detection',
    body: 'Congestion is measured as queue utilisation = queued packets / queue capacity, recomputed every time step after admission. Three tiers (low / moderate / high) drive how aggressively the adaptive scheduler weighs priority versus age.',
  },
  {
    title: 'Waiting-time aging',
    body: 'A packet\'s effective priority grows linearly with how long it has waited. Because the aging term is unbounded while base priority is fixed, any sustained wait eventually overtakes any priority gap — this is what prevents starvation under the adaptive policy.',
  },
  {
    title: 'Packet loss',
    body: 'A packet is dropped when it cannot be admitted into a full, finite-capacity queue. Loss rate = 100 × dropped / generated, overall and per traffic class. Loss is primarily a function of the admission (drop) policy, not the scheduling order.',
  },
  {
    title: 'Queueing delay',
    body: 'service_start_time − arrival_time, measured in simulation time steps, only for delivered packets. Always ≥ 0 by construction (a packet cannot be served before it arrives).',
  },
  {
    title: 'Throughput',
    body: 'Delivered packets divided by the simulation duration — packets per time step successfully carried by the output link, distinct from how many were offered.',
  },
  {
    title: "Jain's fairness index",
    body: 'J(x) = (Σxᵢ)² / (n × Σxᵢ²), where xᵢ is each class\'s delivered throughput. J = 1 means perfectly equal throughput across classes; J = 1/n means one class got everything. Maximising fairness is not the same as meeting the project\'s priority goals — perfect fairness would mean treating voice and background identically, which defeats the point of prioritisation.',
  },
  {
    title: 'Limitations of this simulator',
    body: 'Single bottleneck queue and link, not a full network or routing protocol. Arrivals are independent Bernoulli trials per class per slot (no bursty/self-similar traffic). All packets are the same size. No real-time behaviour — this is a discrete-time, logical-time simulation, and results describe this model only, not a live network.',
  },
]

const WORKED_EXAMPLE_QUEUE = [
  { label: 'Packet A — Background', arrival: 0, basePriority: 1 },
  { label: 'Packet B — File Transfer', arrival: 5, basePriority: 2 },
  { label: 'Packet C — Voice', arrival: 9, basePriority: 5 },
]
const CURRENT_TIME = 10
const ALPHA = 0.5
const ALPHA_EFFECTIVE = ALPHA * 2 // congestion tier: high (>80%)

export default function Viva() {
  return (
    <div className="space-y-5">
      <Card title="Viva & algorithm explanation panel" subtitle="Concise, technically-accurate answers for oral examination">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <h4 className="text-sm font-semibold text-[var(--accent)]">{s.title}</h4>
              <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{s.body}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card
        title="Worked example: which packet gets served next?"
        subtitle={`Same queue at t = ${CURRENT_TIME}, under high congestion (alpha_effective = ${ALPHA_EFFECTIVE})`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-muted)]">
                <th className="py-2 pr-4 font-medium">Packet</th>
                <th className="py-2 pr-4 font-medium">Arrival time</th>
                <th className="py-2 pr-4 font-medium">Base priority</th>
                <th className="py-2 pr-4 font-medium">Waiting time</th>
                <th className="py-2 pr-4 font-medium">Adaptive score</th>
              </tr>
            </thead>
            <tbody>
              {WORKED_EXAMPLE_QUEUE.map((p) => {
                const waiting = CURRENT_TIME - p.arrival
                const score = p.basePriority + ALPHA_EFFECTIVE * waiting
                return (
                  <tr key={p.label} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2 pr-4 text-[var(--text-primary)]">{p.label}</td>
                    <td className="py-2 pr-4 text-[var(--text-secondary)]">{p.arrival}</td>
                    <td className="py-2 pr-4 text-[var(--text-secondary)]">{p.basePriority}</td>
                    <td className="py-2 pr-4 text-[var(--text-secondary)]">{waiting}</td>
                    <td className="py-2 pr-4 font-medium text-[var(--accent)]">{score.toFixed(1)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 space-y-1.5 text-sm text-[var(--text-secondary)]">
          <p>
            <span className="font-medium text-[var(--text-primary)]">FIFO</span> would serve{' '}
            <span className="text-[var(--text-primary)]">Packet A</span> (oldest arrival, priority ignored).
          </p>
          <p>
            <span className="font-medium text-[var(--text-primary)]">Static priority</span> would serve{' '}
            <span className="text-[var(--text-primary)]">Packet C</span> (highest base priority, 5).
          </p>
          <p>
            <span className="font-medium text-[var(--text-primary)]">Adaptive priority</span> would serve{' '}
            <span className="text-[var(--text-primary)]">Packet A</span> (score 11.0 beats C's 6.0) — its 10-step
            wait has aged past voice's priority advantage, which is exactly the starvation-prevention behaviour the
            scheduler is designed to demonstrate.
          </p>
        </div>
      </Card>
    </div>
  )
}
