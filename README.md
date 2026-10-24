# Adaptive Traffic Management for Reducing Packet Loss in Congested Networks

A small discrete-time packet-network simulator built for a Computer Networks
course project. It compares **FIFO**, **static-priority**, and
**adaptive-priority** scheduling at a single congested bottleneck queue, and
measures how each affects packet loss, delay, throughput, and fairness.

> **This is a simulation.** It does not implement a real router, does not run
> on an actual network, and does not change traffic anywhere outside this
> program. See [Limitations](#limitations).

![Home page](docs/screenshots/home.jpg)

## 1. Problem statement

Congested network links must decide, moment to moment, which queued packets
to serve and which to drop. Simple FIFO scheduling treats all traffic
equally, which can hurt latency-sensitive classes (voice, gaming) under
load. Static priority protects those classes but risks starving low-priority
traffic indefinitely. This project implements and measures an
**adaptive-priority** scheduler that combines fixed class priority with
waiting-time aging, and asks: does it meaningfully improve on the two
simpler baselines, and under what conditions?

## 2. Objectives

1. Implement FIFO, static-priority, and adaptive-priority scheduling over a
   shared finite-capacity queue.
2. Separate the effect of **scheduling** (service order) from the effect of
   **buffer admission** (which packets get dropped) — these are often
   conflated, and the project brief specifically asked them to be isolated
   (see [Experiment methodology](#experiment-methodology)).
3. Measure packet loss, queueing delay, throughput, queue utilisation, and
   Jain's fairness index from real simulation output — never hardcoded.
4. Demonstrate, with evidence, that waiting-time aging prevents starvation
   under the adaptive policy, and that static priority does **not**.
5. Present it through a small, explainable web app — **Home** (what the
   project is), **Studio** (run one simulation and replay the queue) and
   **Deep Analysis** (compare policies) — suitable for a live classroom demo.

## 3. Architecture

```
adaptive-traffic-management/
├── backend/
│   ├── main.py           FastAPI endpoints only — no simulation logic
│   ├── models.py         Pydantic request/response schemas
│   ├── traffic.py        Packet model + Bernoulli arrival generator
│   ├── schedulers.py     FIFO / static-priority / adaptive-priority selection
│   ├── simulator.py      The discrete-time event loop + admission/drop policy
│   ├── metrics.py        Loss, delay, throughput, utilisation, Jain's index
│   ├── experiments.py    Scenarios, Mode A/B comparisons, CSV export
│   ├── run_experiments.py  Regenerates results/ from scratch
│   ├── requirements.txt
│   └── tests/            86 pytest tests (engine, metrics, experiments, API)
├── frontend/
│   └── src/
│       ├── pages/        Home, Studio, Analysis (Deep Analysis)
│       ├── components/   home/, studio/, analysis/, charts/ + shared UI
│       ├── lib/          config state, result explanations, CSV export (+ vitest tests)
│       ├── hooks/        hash routing, simulation state, frame-driven timers
│       └── api/          Thin fetch wrapper around the backend
├── results/               CSV output from run_experiments.py (real, not invented)
└── docs/screenshots/
```

The scheduling modules (`schedulers.py`) never touch admission or drops —
that boundary is deliberate (see [Section 5](#5-why-scheduling-and-buffer-admission-are-kept-separate)).
`main.py` only validates requests and calls into `simulator`/`metrics`/`experiments`;
no scheduling logic lives in the API layer.

**How the frontend talks to the engine.** The Studio keeps one configuration
object in React state; presets only fill in arrival rates. Every run sends
the full configuration explicitly (`scenario: "custom"`), so the backend
never substitutes preset values. `/api/simulate` also returns a bounded
per-step event log (`replay`, first 100 steps) recorded inside the
simulation loop; the Studio's queue animation plays back exactly those
events. `/api/compare` returns each policy's utilisation history for the
over-time chart. All explanatory sentences in the UI are generated from the
returned numbers (`frontend/src/lib/insights.js`).

## 4. Algorithms

### FIFO
Serves the oldest queued packet first. Priority is ignored entirely.

### Static priority
Serves the highest base-priority packet first; ties broken by arrival order
(FIFO). A continuous stream of high-priority arrivals can **starve** a
low-priority packet indefinitely — this is demonstrated, not just claimed
(`test_static_priority_allows_overtaking` in `tests/test_schedulers.py`).

### Adaptive priority

```
priority_score(packet, t) = base_priority(class) + alpha_effective * waiting_time(packet, t)
waiting_time(packet, t)   = t - packet.arrival_time        (simulation time steps)
```

Congestion tiers (by queue utilisation = queued / capacity, recomputed every
time step):

| Utilisation | Behaviour |
|---|---|
| < 50% (low) | FIFO-like — priority ignored |
| 50–80% (moderate) | Rank by `priority_score`, `alpha_effective = alpha` |
| > 80% (high) | Rank by `priority_score`, `alpha_effective = 2 × alpha` |

Because the aging term grows without bound while base priority is fixed, any
sustained wait eventually overtakes any priority gap — this is what prevents
starvation, and it's tested directly
(`test_adaptive_prevents_starvation_under_sustained_high_priority_load`).

Traffic classes and (illustrative, project-defined, not industry-standard)
base priorities:

| Traffic class | Base priority |
|---|---:|
| Voice | 5 |
| Gaming / Control | 5 |
| Video | 4 |
| Normal Data | 3 |
| File Transfer | 2 |
| Background | 1 |

## 5. Why scheduling and buffer admission are kept separate

Under a **shared finite buffer with the same drop-tail rule**, changing the
service order alone does not necessarily change total packet loss — loss is
driven by admission, not scheduling. The simulator therefore supports two
experiment modes:

- **Mode A — scheduling only**: all three schedulers run on the *same*
  arrival trace, capacity, service rate, and (tail-drop) admission rule. This
  isolates scheduling's effect on delay/throughput/fairness, and total loss
  is reported honestly — often identical across all three policies.
- **Mode B — congestion protection**: the adaptive scheduler only, comparing
  plain tail-drop admission against a class-aware **priority_displace**
  admission rule (an arriving higher-priority packet may evict a queued
  lower-priority one when the buffer is full). Every eviction is tracked by
  class and reason. The README does not claim this reduces *overall* loss —
  see the real results below, where it sometimes doesn't.

## 6. Formulas

- **Packet loss rate** = 100 × dropped / generated (overall and per class)
- **Queueing delay** = `service_start_time − arrival_time`, delivered packets only, averaged
- **Throughput** = delivered packets / simulation duration
- **Queue utilisation** = queued packets / capacity (average and maximum reported)
- **Jain's fairness index** = `(Σxᵢ)² / (n·Σxᵢ²)`, where `xᵢ` is each class's delivered throughput

## 7. Assumptions

- Discrete, logical time — no real-time sleeps.
- Arrivals: independent Bernoulli trials per traffic class per time slot (at
  most one packet per class per slot). This is a simplification; real
  traffic is often bursty/self-similar.
- All packets are the same size.
- Single bottleneck queue and one output link — no routing, no multi-hop
  topology.
- Base priorities (table above) are project-defined for this simulation, not
  a real QoS/DSCP standard.

## 8. Installation

Requires Python 3.10+ and Node.js 18+.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

```bash
cd frontend
npm install
```

## 9. Running it

Backend (from `backend/`, with the venv active):

```bash
uvicorn main:app --reload --port 8000
```

Frontend (from `frontend/`, in another terminal):

```bash
npm run dev
```

The dev server proxies `/api` to `http://127.0.0.1:8000`, so both must be
running. Open `http://localhost:5842` (set in `vite.config.js` to avoid a
port clash).

> **Port 8000 must be free.** If another FastAPI app is already using it,
> the Studio shows "The simulation API wasn't found on port 8000". Stop the
> other server, or run this backend on another port and change the proxy
> target in `vite.config.js` to match.

## 10. Testing

```bash
cd backend
source .venv/bin/activate
pytest -q
```

86 tests (`test_traffic.py`, `test_schedulers.py`, `test_simulator.py`,
`test_metrics.py`, `test_experiments.py`, `test_api.py`), all passing as of
the last run. Coverage includes FIFO order, static-priority ordering and
starvation risk, adaptive behaviour at each congestion tier, adaptive
starvation *prevention*, queue capacity enforcement, arrival order preserved
under priority displacement, drop accounting with no double-counting,
non-negative queueing delay, deterministic seeded runs, identical traces
across Mode A policies, the replay log matching the run it records, empty
traffic, and API validation (422s) for malformed requests.

Frontend logic tests (vitest) run against real backend responses saved in
`frontend/src/lib/__fixtures__/`:

```bash
cd frontend
npm test
```

They check that presets change the actual request, that edited rates become
"custom", that reset restores the initial state, that every generated
explanation matches the data it describes (and stays silent when the data
doesn't support it), and that the CSV export contains the real metrics.

## 11. Experiment methodology

Three built-in scenarios, all with `queue_capacity=20`, `service_rate=1`,
`duration=500` — only the offered load changes:

| Scenario | Aggregate arrival rate (vs. service_rate=1) |
|---|---|
| Light | ≈0.45 |
| Moderate | ≈0.95 |
| Heavy | ≈1.55 |

Each scenario generates **one** arrival trace per seed, which is replayed
unchanged into every scheduler/drop-policy combination being compared — this
is what makes Mode A/B comparisons fair. `results/` was generated by
`backend/run_experiments.py` with `seed=42`, `alpha=0.5`; re-run it to
regenerate from scratch:

```bash
cd backend
source .venv/bin/activate
python run_experiments.py
```

### Actual results (seed=42, alpha=0.5)

**Mode A, heavy load** — scheduling-only comparison:

| Policy | Loss | Avg delay | Max delay (voice) | Max delay (background) |
|---|---|---|---|---|
| FIFO | 31.26% | 17.81 | 19 | 19 |
| Static priority | 31.26% | 12.31 | 1 | **298** |
| Adaptive priority | 31.26% | 17.81 | 19 | 22 |

Total loss is **identical across all three** — confirming that scheduling
order alone doesn't change loss under a shared tail-drop buffer. Static
priority nearly eliminates voice delay but background's worst-case wait
balloons to 298 steps (severe, real starvation risk). Adaptive keeps
background's worst case to 22 — close to FIFO's uniform 19 — while still
favouring high-priority traffic under congestion.

**Mode B, heavy load** — adaptive scheduler, admission policy varied:

| Drop policy | Overall | Voice | Gaming | Video | Normal Data | File Transfer | Background |
|---|---|---|---|---|---|---|---|
| tail_drop | 31.26% | 0.0% | 15.6% | 34.2% | 45.5% | 52.1% | 60.7% |
| priority_displace | 31.26% | 0.0% | **0.0%** | **2.6%** | 52.5% | 78.7% | **98.1%** |

Overall loss is unchanged: displacement decides *which* packet is lost, it
does not create room. It shifts loss away from higher-priority classes and
onto lower-priority ones: Gaming and Video losses fall sharply, while Normal Data,
File Transfer and especially Background lose more. Voice was already fully
protected by scheduling alone, so it gains nothing. Results vary by seed;
`backend/tests/test_experiments.py` only asserts voice loss never gets
*worse* under displacement, and nothing claims overall loss improves.

See `results/*.csv` for the full numbers across all three scenarios and both
modes, and `results/heavy_adaptive_priority_packets.csv` for a full
packet-level trace.

## 12. Screenshots

| Home | Studio | Deep Analysis |
|---|---|---|
| ![Home](docs/screenshots/home.jpg) | ![Studio](docs/screenshots/studio.jpg) | ![Deep Analysis](docs/screenshots/analysis.jpg) |

To capture new ones: run both servers, open the app, run a simulation /
comparison, and screenshot each page.

## 13. Demonstration sequence (suggested, ~5 minutes)

1. **Home** — the hero animation shows the whole idea (packets in → finite
   queue → scheduler → link; it is labelled as an illustration). Scroll to
   "Who gets sent next?" and toggle *2 steps / 10 steps*: FIFO and Static
   never change their pick, Adaptive flips once Background has waited long
   enough.
2. **Studio, Moderate, Adaptive** — run it. The replay plays the recorded
   steps; the decision line mostly reads "the oldest packet, because the
   queue is under half full" — adaptive behaves like FIFO when there is no
   congestion. 0% loss.
3. **Studio, switch to Heavy, run again** — the queue fills, red drops
   appear, the decision line shows "over 80% full → aggressive", and the
   explanation reports the real loss.
4. **Deep Analysis, Mode A, Heavy** — read the "What do these results
   mean?" box: identical loss for all three (shared admission rule), Static
   priority's 197-step background wait vs. Adaptive's ~20, and the worst
   case 298 vs. 22 steps.
5. **Deep Analysis, Mode B, Heavy** — the per-class trade-off: Gaming and
   Video protected, Background sacrificed, overall loss unchanged.
6. Open **Method & definitions** at the bottom of Deep Analysis for the
   formulas and the worked example.

## 14. Limitations

- Single bottleneck queue and link — not a full network, no routing.
- Bernoulli arrivals only — no bursty/self-similar traffic modelling.
- Uniform packet size.
- Base priorities are illustrative, not a real QoS standard.
- `priority_displace` (Mode B) does not reliably reduce overall or
  background loss — see Section 11's actual results. It is a demonstrable
  mechanism, not a proven improvement, and the project does not claim
  otherwise.
- This is a simulation only; it does not run on, measure, or affect any real
  network.
