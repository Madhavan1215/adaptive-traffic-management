# Viva Guide

Likely questions and concise, accurate answers for the oral examination.
The same explanations also appear in the app's Viva Guide tab; this file is
for offline review. Numbers quoted below come from `results/*.csv`
(seed=42, alpha=0.5) — regenerate with `python backend/run_experiments.py`
if you want to re-verify them yourself before the viva.

### What is congestion?

A state where the arrival rate of packets approaches or exceeds the rate at
which the link/queue can serve them, causing the queue to fill up. We
measure it as **queue utilisation** = queued packets / queue capacity,
recomputed every simulation time step after admission.

### What is a finite queue?

A buffer that can hold at most `queue_capacity` packets. Once full, any
further arriving packet must be handled by a drop (admission) policy —
either it is rejected (tail-drop) or, under Mode B, it may displace a lower
priority packet already queued.

### How does FIFO work?

Serves packets strictly in the order they arrived. Simple, perfectly fair by
arrival time, ignores traffic class entirely — so a voice packet behind a
burst of background traffic just waits its turn.

### How does static-priority scheduling work?

Always serves the packet with the highest base priority in the queue;
arrival order (FIFO) breaks ties. Demonstrated risk: under sustained
high-priority load, a low-priority packet can be repeatedly overtaken and
starved — see `test_static_priority_allows_overtaking`, and the real result
where background's worst-case delay hit 298 steps under heavy load (vs. 19
for FIFO).

### What is starvation?

A packet (or class) never gets served because something else is always
preferred ahead of it. Static priority is vulnerable to it in principle
(no aging); adaptive priority is specifically designed to prevent it.

### How does waiting-time aging work?

`priority_score = base_priority + alpha_effective × waiting_time`, where
`waiting_time = current_time − arrival_time` (in simulation steps) and
`alpha_effective` is `alpha` (moderate congestion) or `2 × alpha` (high
congestion). Because the aging term grows without bound as a packet waits
longer, while base priority stays fixed, any sufficiently long wait
eventually produces a higher score than a fresher high-priority packet —
this is what guarantees the packet is eventually served.

### What does queue utilisation mean?

`queued packets / queue capacity`, as a fraction (reported as a percentage
in the UI). It drives the adaptive scheduler's congestion tier (<50% low,
50–80% moderate, >80% high) and is distinct from **link/output
utilisation**, which would measure how busy the server/link itself is, not
how full the waiting line is.

### Why can total packet loss remain unchanged when scheduling changes?

Because under a shared admission policy (e.g. tail-drop) applied to the same
arrival trace and the same capacity, a packet is dropped purely based on
*whether the queue was full when it arrived*, which does not depend on the
order packets are later served in. Our Mode A results confirm this exactly:
FIFO, static-priority, and adaptive-priority all showed **31.26% loss** on
the heavy scenario — identical to two decimal places, because they shared
the same trace, capacity, and tail-drop rule. Scheduling changes *who waits
how long*, not *who gets admitted*.

### How is queueing delay calculated?

`service_start_time − arrival_time`, in simulation time steps, computed only
for delivered packets (a dropped packet never gets a service time). It is
always ≥ 0 by construction — a packet cannot be served before it arrives —
and this is enforced with a test (`test_queueing_delay_never_negative`).

### How is throughput calculated?

`delivered packets / simulation duration` — packets successfully carried per
time step. Distinct from offered load (arrivals) and from loss.

### What does Jain's fairness index measure?

`J(x) = (Σxᵢ)² / (n × Σxᵢ²)` where `xᵢ` is each traffic class's delivered
throughput. `J = 1` means every class got equal throughput; `J = 1/n` means
one class got everything. **Important distinction**: maximising fairness is
not the same as meeting the project's priority goals — perfect fairness
would mean treating voice and background identically, which defeats the
entire point of prioritising latency-sensitive traffic. A *lower* fairness
index under static/adaptive priority (0.770–0.797 vs. FIFO's 0.800 in our
heavy-load result) is not necessarily a flaw; it may reflect intentional,
working prioritisation.

### What assumptions does the simulator make?

- Discrete, logical time (no real-time sleeps).
- Arrivals are independent Bernoulli trials per class per time slot — not
  bursty or self-similar, unlike much real network traffic.
- All packets are the same size.
- A single bottleneck queue and one output link — no multi-hop topology, no
  routing protocol.
- Base priorities (Voice/Gaming=5, Video=4, Normal Data=3, File Transfer=2,
  Background=1) are project-defined for this simulation, not a real-world
  QoS/DSCP standard.

### How would the model differ from a real network?

Real networks have variable packet sizes, bursty/correlated traffic, many
interacting queues and links (not one bottleneck), routing and multi-path
behaviour, retransmission/congestion-control feedback loops (e.g. TCP), and
physical propagation delay. This simulator isolates one mechanism — queue
scheduling policy under a single finite buffer — deliberately, so its
effect can be measured and explained in isolation. It is not a claim about
real-network behaviour beyond that one mechanism.

### Why does `priority_displace` (Mode B) not always reduce loss?

Because displacement only helps a class when that class would otherwise
have been tail-dropped. In our heavy-load run, voice was already fully
protected (0% loss) by scheduling alone — the queue rarely filled with voice
waiting behind others. So displacement mostly ends up evicting background
packets for no additional voice benefit, and background's loss rate got
*worse* (60.75% → 98.13%). This is reported honestly in the README rather
than dressed up, per the project's explicit instruction not to claim an
improvement the data doesn't show.

### Why was Python's standard library used instead of NumPy/pandas for the simulation?

To keep the arrival generation and scheduling logic transparent and easy to
trace by hand for the viva — a plain `random.Random(seed)` Bernoulli trial
per class per step is directly inspectable, versus a vectorised NumPy
implementation that would be faster but harder to walk through line by line.
