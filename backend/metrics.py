"""Performance metrics computed from real simulation output (never
hardcoded). Formulas follow the project brief section 10 exactly."""

from __future__ import annotations

import math

from traffic import Packet, TrafficClass


def packet_loss_rate(packets: list[Packet]) -> float:
    """100 * dropped / generated. 0.0 when no packets were generated."""
    if not packets:
        return 0.0
    dropped = sum(1 for p in packets if p.outcome == "dropped")
    return 100.0 * dropped / len(packets)


def packet_loss_rate_by_class(packets: list[Packet]) -> dict[TrafficClass, float]:
    return {
        tc: packet_loss_rate([p for p in packets if p.traffic_class == tc])
        for tc in TrafficClass
    }


def average_queueing_delay(packets: list[Packet]) -> float:
    """Average of (service_start_time - arrival_time) over delivered
    packets only. 0.0 when nothing was delivered."""
    delivered = [p for p in packets if p.outcome == "delivered"]
    if not delivered:
        return 0.0
    return sum(p.queueing_delay() for p in delivered) / len(delivered)


def average_queueing_delay_by_class(packets: list[Packet]) -> dict[TrafficClass, float]:
    return {
        tc: average_queueing_delay([p for p in packets if p.traffic_class == tc])
        for tc in TrafficClass
    }


def max_delay_by_class(packets: list[Packet]) -> dict[TrafficClass, int]:
    """Used for the starvation check: worst-case queueing delay per class."""
    result: dict[TrafficClass, int] = {}
    for tc in TrafficClass:
        delays = [p.queueing_delay() for p in packets if p.traffic_class == tc and p.outcome == "delivered"]
        result[tc] = max(delays) if delays else 0
    return result


def percentile_delay_by_class(packets: list[Packet], percentile: float = 95.0) -> dict[TrafficClass, float]:
    """High-percentile queueing delay per class (nearest-rank method)."""
    result: dict[TrafficClass, float] = {}
    for tc in TrafficClass:
        delays = sorted(p.queueing_delay() for p in packets if p.traffic_class == tc and p.outcome == "delivered")
        if not delays:
            result[tc] = 0.0
            continue
        rank = max(0, math.ceil(percentile / 100.0 * len(delays)) - 1)
        result[tc] = float(delays[min(rank, len(delays) - 1)])
    return result


def throughput(packets: list[Packet], duration: int) -> float:
    """Delivered packets per unit simulation time."""
    if duration <= 0:
        raise ValueError("duration must be positive")
    delivered = sum(1 for p in packets if p.outcome == "delivered")
    return delivered / duration


def throughput_by_class(packets: list[Packet], duration: int) -> dict[TrafficClass, float]:
    return {
        tc: throughput([p for p in packets if p.traffic_class == tc], duration)
        for tc in TrafficClass
    }


def queue_utilisation_stats(history: list[tuple[int, float]]) -> dict[str, float]:
    """Average and maximum queue utilisation, as percentages, from the
    per-step utilisation history recorded during the simulation."""
    if not history:
        return {"average": 0.0, "maximum": 0.0}
    utilisations = [u for _, u in history]
    return {
        "average": 100.0 * sum(utilisations) / len(utilisations),
        "maximum": 100.0 * max(utilisations),
    }


def jains_fairness_index(throughputs: list[float]) -> float:
    """J(x) = (sum x_i)^2 / (n * sum x_i^2), in [1/n, 1]; 1 is perfectly fair.

    Edge cases handled explicitly rather than left to raise ZeroDivisionError:
    - no classes at all -> 1.0 (vacuously "fair": nothing to be unfair about)
    - all throughputs zero (e.g. everything dropped) -> 1.0, for the same reason
    """
    n = len(throughputs)
    if n == 0:
        return 1.0
    sum_x = sum(throughputs)
    if sum_x == 0:
        return 1.0
    sum_x_sq = sum(x * x for x in throughputs)
    return (sum_x ** 2) / (n * sum_x_sq)
