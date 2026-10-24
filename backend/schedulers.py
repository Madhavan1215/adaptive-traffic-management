"""Scheduling policies.

A scheduler's job is strictly to pick which queued packet is served next.
It never drops, admits, or removes packets from the queue on its own -
that is the simulator's (buffer admission) responsibility. This separation
is what lets scheduling-only and congestion-protection effects be measured
independently (see the project brief, section 9).

All three selectors take the queue as a list of Packet kept in arrival
order (oldest at index 0, appended on arrival) and return the INDEX of the
packet to serve next. None of them mutate the queue.
"""

from __future__ import annotations

from traffic import Packet

CongestionLevel = str  # "low" | "moderate" | "high"


def congestion_level(utilisation: float) -> CongestionLevel:
    """Classify queue utilisation (queued / capacity, in [0, 1]) into a
    congestion tier using the thresholds from the project brief."""
    if utilisation < 0.5:
        return "low"
    if utilisation <= 0.8:
        return "moderate"
    return "high"


def select_fifo(queue: list[Packet], current_time: int) -> int:
    """Serve the oldest queued packet. Since the queue list is maintained
    in arrival order, that is always index 0."""
    return 0


def select_static_priority(queue: list[Packet], current_time: int) -> int:
    """Serve the highest base-priority packet; FIFO (earliest arrival)
    breaks ties. Scanning left-to-right (oldest to newest) and replacing
    the best candidate only on a STRICTLY greater priority keeps the
    earliest packet among equal priorities, which implements the tie-break
    without a separate sort step."""
    best_idx = 0
    best_priority = queue[0].base_priority
    for i in range(1, len(queue)):
        if queue[i].base_priority > best_priority:
            best_idx = i
            best_priority = queue[i].base_priority
    return best_idx


def select_adaptive_priority(queue: list[Packet], current_time: int, alpha: float, utilisation: float) -> int:
    """Adaptive scheduler: Priority Score = base_priority + alpha * waiting_time.

    - Low congestion: behave like FIFO (ignore priority entirely).
    - Moderate congestion: rank by priority score.
    - High congestion: double alpha's effect, so aging/base-priority gaps
      matter more and high-priority traffic is protected more aggressively.
    Ties in score (including the "low" congestion case) break in FIFO order,
    via the same strictly-greater-only replacement rule as static priority.
    """
    level = congestion_level(utilisation)
    if level == "low":
        return select_fifo(queue, current_time)

    alpha_effective = alpha * 2 if level == "high" else alpha

    def score(p: Packet) -> float:
        return p.base_priority + alpha_effective * p.waiting_time(current_time)

    best_idx = 0
    best_score = score(queue[0])
    for i in range(1, len(queue)):
        s = score(queue[i])
        if s > best_score:
            best_idx = i
            best_score = s
    return best_idx


SCHEDULERS = {
    "fifo": select_fifo,
    "static_priority": select_static_priority,
    "adaptive_priority": select_adaptive_priority,
}
