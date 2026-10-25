"""Built-in scenarios and the two experiment modes from the project brief
(section 9 / 11): Mode A isolates the effect of scheduling alone, holding
the admission/drop policy fixed; Mode B isolates the effect of letting the
adaptive scheduler's priority-awareness extend into buffer admission too."""

from __future__ import annotations

import csv
import os

from metrics import (
    average_queueing_delay,
    average_queueing_delay_by_class,
    jains_fairness_index,
    max_delay_by_class,
    packet_loss_rate,
    packet_loss_rate_by_class,
    queue_utilisation_stats,
    throughput,
    throughput_by_class,
)
from simulator import SimulationConfig, SimulationResult, generate_trace, run_simulation
from traffic import TrafficClass

RESULTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "results")

# Default queue capacity / service rate / duration are shared across
# scenarios so only the *offered load* (arrival rates) changes between
# them. With service_rate=1, "load" below is the sum of per-class rates,
# directly comparable to the one packet/step the link can serve.
_DEFAULT_CAPACITY = 20
_DEFAULT_SERVICE_RATE = 1
_DEFAULT_DURATION = 500

SCENARIOS: dict[str, dict] = {
    # Aggregate offered load ~0.45 << service_rate=1: link rarely saturates.
    "light": {
        "arrival_rates": {
            TrafficClass.VOICE: 0.08,
            TrafficClass.GAMING: 0.08,
            TrafficClass.VIDEO: 0.1,
            TrafficClass.NORMAL_DATA: 0.1,
            TrafficClass.FILE_TRANSFER: 0.05,
            TrafficClass.BACKGROUND: 0.04,
        },
        "queue_capacity": _DEFAULT_CAPACITY,
        "service_rate": _DEFAULT_SERVICE_RATE,
        "duration": _DEFAULT_DURATION,
    },
    # Aggregate offered load ~0.95, approaching service_rate=1.
    "moderate": {
        "arrival_rates": {
            TrafficClass.VOICE: 0.18,
            TrafficClass.GAMING: 0.17,
            TrafficClass.VIDEO: 0.2,
            TrafficClass.NORMAL_DATA: 0.18,
            TrafficClass.FILE_TRANSFER: 0.12,
            TrafficClass.BACKGROUND: 0.1,
        },
        "queue_capacity": _DEFAULT_CAPACITY,
        "service_rate": _DEFAULT_SERVICE_RATE,
        "duration": _DEFAULT_DURATION,
    },
    # Aggregate offered load ~1.5, well above service_rate=1: sustained overflow.
    "heavy": {
        "arrival_rates": {
            TrafficClass.VOICE: 0.3,
            TrafficClass.GAMING: 0.3,
            TrafficClass.VIDEO: 0.3,
            TrafficClass.NORMAL_DATA: 0.25,
            TrafficClass.FILE_TRANSFER: 0.2,
            TrafficClass.BACKGROUND: 0.2,
        },
        "queue_capacity": _DEFAULT_CAPACITY,
        "service_rate": _DEFAULT_SERVICE_RATE,
        "duration": _DEFAULT_DURATION,
    },
}


def summarize(result: SimulationResult) -> dict:
    """All the metrics needed by the dashboard/comparison views, computed
    from this one simulation's actual packet outcomes."""
    packets = result.packets
    duration = result.config.duration
    per_class_throughput = throughput_by_class(packets, duration)

    drop_reason_counts: dict[str, int] = {}
    for p in packets:
        if p.outcome == "dropped":
            key = f"{p.traffic_class.value}:{p.drop_reason}"
            drop_reason_counts[key] = drop_reason_counts.get(key, 0) + 1

    return {
        "scheduler": result.config.scheduler,
        "drop_policy": result.config.drop_policy,
        "packets_generated": len(packets),
        "packets_delivered": sum(1 for p in packets if p.outcome == "delivered"),
        "packets_dropped": sum(1 for p in packets if p.outcome == "dropped"),
        "packets_queued_at_end": sum(1 for p in packets if p.outcome == "queued_at_end"),
        "generated_by_class": {tc.value: sum(1 for p in packets if p.traffic_class == tc) for tc in TrafficClass},
        "delivered_by_class": {
            tc.value: sum(1 for p in packets if p.traffic_class == tc and p.outcome == "delivered") for tc in TrafficClass
        },
        "packet_loss_rate": packet_loss_rate(packets),
        "packet_loss_rate_by_class": {tc.value: v for tc, v in packet_loss_rate_by_class(packets).items()},
        "average_queueing_delay": average_queueing_delay(packets),
        "average_queueing_delay_by_class": {
            tc.value: v for tc, v in average_queueing_delay_by_class(packets).items()
        },
        "max_delay_by_class": {tc.value: v for tc, v in max_delay_by_class(packets).items()},
        "throughput": throughput(packets, duration),
        "throughput_by_class": {tc.value: v for tc, v in per_class_throughput.items()},
        "queue_utilisation": queue_utilisation_stats(result.utilisation_history),
        "fairness_index": jains_fairness_index(list(per_class_throughput.values())),
        "drop_reason_counts": drop_reason_counts,
    }


def _build_config(scenario: dict, scheduler: str, alpha: float, seed: int, drop_policy: str) -> SimulationConfig:
    return SimulationConfig(
        arrival_rates=scenario["arrival_rates"],
        queue_capacity=scenario["queue_capacity"],
        service_rate=scenario["service_rate"],
        duration=scenario["duration"],
        scheduler=scheduler,
        alpha=alpha,
        seed=seed,
        drop_policy=drop_policy,
    )


def _summarize_run(result: SimulationResult, include_history: bool) -> dict:
    summary = summarize(result)
    if include_history:
        summary["utilisation_history"] = [u for _, u in result.utilisation_history]
    return summary


def run_mode_a_from_config(
    scenario: dict, alpha: float = 0.5, seed: int = 42, include_history: bool = False
) -> dict[str, dict]:
    """All three policies run on the SAME arrival trace, SAME capacity,
    SAME service rate, SAME (tail-drop) admission rule -- isolating the
    effect of scheduling order on delay/throughput/fairness, not loss.
    `scenario` is a dict with arrival_rates/queue_capacity/service_rate/duration
    (either one of SCENARIOS, or a custom one built from an API request)."""
    trace = generate_trace(scenario["arrival_rates"], scenario["duration"], seed)
    results: dict[str, dict] = {}
    for scheduler in ("fifo", "static_priority", "adaptive_priority"):
        config = _build_config(scenario, scheduler, alpha, seed, drop_policy="tail_drop")
        results[scheduler] = _summarize_run(run_simulation(config, trace=trace), include_history)
    return results


def run_mode_b_from_config(
    scenario: dict, alpha: float = 0.5, seed: int = 42, include_history: bool = False
) -> dict[str, dict]:
    """Adaptive scheduler only, comparing plain tail-drop admission against
    class-aware priority_displace admission, under identical offered load."""
    trace = generate_trace(scenario["arrival_rates"], scenario["duration"], seed)
    results: dict[str, dict] = {}
    for drop_policy in ("tail_drop", "priority_displace"):
        config = _build_config(scenario, "adaptive_priority", alpha, seed, drop_policy=drop_policy)
        results[drop_policy] = _summarize_run(run_simulation(config, trace=trace), include_history)
    return results


def run_mode_a_scheduling_only(scenario_name: str, alpha: float = 0.5, seed: int = 42) -> dict[str, dict]:
    """Convenience wrapper for one of the built-in SCENARIOS by name."""
    return run_mode_a_from_config(SCENARIOS[scenario_name], alpha, seed)


def run_mode_b_congestion_protection(scenario_name: str, alpha: float = 0.5, seed: int = 42) -> dict[str, dict]:
    """Convenience wrapper for one of the built-in SCENARIOS by name."""
    return run_mode_b_from_config(SCENARIOS[scenario_name], alpha, seed)


def export_packets_csv(result: SimulationResult, path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(
            ["packet_id", "traffic_class", "arrival_time", "service_start_time", "departure_time", "outcome", "drop_reason"]
        )
        for p in result.packets:
            writer.writerow(
                [p.packet_id, p.traffic_class.value, p.arrival_time, p.service_start_time, p.departure_time, p.outcome, p.drop_reason]
            )


def export_summary_csv(summaries: dict[str, dict], path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(
            ["policy", "packets_generated", "packets_delivered", "packets_dropped", "packet_loss_rate", "average_queueing_delay", "throughput", "fairness_index"]
        )
        for policy, s in summaries.items():
            writer.writerow(
                [
                    policy,
                    s["packets_generated"],
                    s["packets_delivered"],
                    s["packets_dropped"],
                    round(s["packet_loss_rate"], 3),
                    round(s["average_queueing_delay"], 3),
                    round(s["throughput"], 3),
                    round(s["fairness_index"], 4),
                ]
            )
