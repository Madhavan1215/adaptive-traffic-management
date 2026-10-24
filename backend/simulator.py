"""The discrete-time simulation loop shared by all three scheduling
policies (see project brief section 7 for the exact event sequence):

  for each time step t in [0, duration):
    1. generate arrivals (or replay a pre-generated trace)
    2. try to admit each arrival into the finite queue (drop policy)
    3. compute queue utilisation / congestion level for this step
    4. record utilisation history
    5. select up to `service_rate` packets to serve this step
    6. serve them (dequeue, stamp service_start_time, mark delivered)

Only step 5's *selection rule* differs between FIFO / static / adaptive;
everything else is identical, which is what makes a fair Mode A
(scheduling-only) comparison possible.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from schedulers import SCHEDULERS
from traffic import ArrivalGenerator, Packet, TrafficClass

# A trace is a flat, order-independent list of raw arrival facts. Using plain
# tuples (not Packet objects) lets the same trace be replayed into several
# independent simulation runs without one run's mutations (outcome,
# service_start_time, ...) leaking into another's.
ArrivalSpec = tuple[int, TrafficClass, int]  # (packet_id, traffic_class, arrival_time)


def generate_trace(arrival_rates: dict[TrafficClass, float], duration: int, seed: int = 42) -> list[ArrivalSpec]:
    generator = ArrivalGenerator(arrival_rates, seed=seed)
    trace: list[ArrivalSpec] = []
    for t in range(duration):
        for packet in generator.step(t):
            trace.append((packet.packet_id, packet.traffic_class, packet.arrival_time))
    return trace


@dataclass
class SimulationConfig:
    arrival_rates: dict[TrafficClass, float]
    queue_capacity: int
    service_rate: int
    duration: int
    scheduler: str  # "fifo" | "static_priority" | "adaptive_priority"
    alpha: float = 0.5
    seed: int = 42
    drop_policy: str = "tail_drop"  # "tail_drop" | "priority_displace"

    def __post_init__(self) -> None:
        if self.queue_capacity < 1:
            raise ValueError("queue_capacity must be >= 1")
        if self.service_rate < 1:
            raise ValueError("service_rate must be >= 1")
        if self.duration < 1:
            raise ValueError("duration must be >= 1")
        if self.scheduler not in SCHEDULERS:
            raise ValueError(f"unknown scheduler: {self.scheduler!r}")
        if self.drop_policy not in ("tail_drop", "priority_displace"):
            raise ValueError(f"unknown drop_policy: {self.drop_policy!r}")


@dataclass
class SimulationResult:
    config: SimulationConfig
    packets: list[Packet] = field(default_factory=list)
    # (time_step, utilisation_fraction_in_[0,1]) recorded once per step, after admission.
    utilisation_history: list[tuple[int, float]] = field(default_factory=list)


def _admit(queue: list[Packet], packet: Packet, capacity: int, drop_policy: str) -> None:
    """Try to admit `packet`. Mutates `queue` in place and sets
    outcome/drop_reason on whichever single packet ends up dropped (either
    the newcomer, or -- under priority_displace -- the evicted packet)."""
    if len(queue) < capacity:
        queue.append(packet)
        return

    if drop_policy == "tail_drop":
        packet.outcome = "dropped"
        packet.drop_reason = "buffer_full"
        return

    # priority_displace: an arriving packet with strictly higher base
    # priority than the worst-off queued packet evicts it. Ties for
    # "worst" are broken by evicting the oldest among the lowest-priority
    # packets, for determinism.
    worst_idx = min(range(len(queue)), key=lambda i: (queue[i].base_priority, i))
    worst = queue[worst_idx]
    if packet.base_priority > worst.base_priority:
        worst.outcome = "dropped"
        worst.drop_reason = "displaced"
        queue[worst_idx] = packet
    else:
        packet.outcome = "dropped"
        packet.drop_reason = "buffer_full"


def run_simulation(config: SimulationConfig, trace: list[ArrivalSpec] | None = None) -> SimulationResult:
    """Run one full simulation. If `trace` is given (from generate_trace),
    it is replayed with fresh Packet objects so the exact same arrivals can
    be reused across multiple policies/configs without cross-contamination."""
    if trace is None:
        trace = generate_trace(config.arrival_rates, config.duration, config.seed)

    arrivals_by_step: list[list[Packet]] = [[] for _ in range(config.duration)]
    for packet_id, traffic_class, arrival_time in trace:
        arrivals_by_step[arrival_time].append(Packet(packet_id=packet_id, traffic_class=traffic_class, arrival_time=arrival_time))

    select = SCHEDULERS[config.scheduler]
    queue: list[Packet] = []
    all_packets: list[Packet] = []
    utilisation_history: list[tuple[int, float]] = []

    for t in range(config.duration):
        # Steps 1-2: arrivals + admission.
        for packet in arrivals_by_step[t]:
            all_packets.append(packet)
            _admit(queue, packet, config.queue_capacity, config.drop_policy)

        # Steps 3-4: congestion level (derived from utilisation) + history.
        utilisation = len(queue) / config.queue_capacity
        utilisation_history.append((t, utilisation))

        # Steps 5-6: select and serve up to service_rate packets this step.
        for _ in range(config.service_rate):
            if not queue:
                break
            if config.scheduler == "adaptive_priority":
                idx = select(queue, t, alpha=config.alpha, utilisation=utilisation)
            else:
                idx = select(queue, t)
            served = queue.pop(idx)
            served.service_start_time = t
            served.departure_time = t
            served.outcome = "delivered"

    return SimulationResult(config=config, packets=all_packets, utilisation_history=utilisation_history)
