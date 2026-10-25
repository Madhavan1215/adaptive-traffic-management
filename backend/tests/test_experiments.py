import csv
import os
import tempfile

from experiments import (
    SCENARIOS,
    export_packets_csv,
    export_summary_csv,
    run_mode_a_scheduling_only,
    run_mode_b_congestion_protection,
)
from simulator import SimulationConfig, run_simulation


def test_mode_a_all_policies_see_identical_arrivals():
    results = run_mode_a_scheduling_only("moderate", alpha=0.5, seed=1)
    assert set(results.keys()) == {"fifo", "static_priority", "adaptive_priority"}
    generated_counts = {name: r["packets_generated"] for name, r in results.items()}
    # same trace -> same number of generated packets for every policy
    assert len(set(generated_counts.values())) == 1


def test_mode_a_same_drop_policy_for_all_three():
    results = run_mode_a_scheduling_only("heavy", seed=2)
    for r in results.values():
        assert r["drop_policy"] == "tail_drop"


def test_mode_b_compares_tail_drop_vs_priority_displace():
    results = run_mode_b_congestion_protection("heavy", alpha=0.5, seed=3)
    assert set(results.keys()) == {"tail_drop", "priority_displace"}
    for r in results.values():
        assert r["scheduler"] == "adaptive_priority"


def test_mode_b_displacement_can_reduce_high_priority_loss():
    """Under heavy load, class-aware displacement should not make voice
    (highest priority) loss worse than plain tail-drop -- that's the whole
    point of the mechanism. We don't assert overall loss improves, since
    the brief explicitly says not to claim that without evidence."""
    results = run_mode_b_congestion_protection("heavy", alpha=0.5, seed=3)
    voice_loss_baseline = results["tail_drop"]["packet_loss_rate_by_class"]["voice"]
    voice_loss_protected = results["priority_displace"]["packet_loss_rate_by_class"]["voice"]
    assert voice_loss_protected <= voice_loss_baseline


def test_summary_counts_add_up_to_generated():
    for r in run_mode_a_scheduling_only("heavy", seed=42).values():
        assert r["packets_delivered"] + r["packets_dropped"] + r["packets_queued_at_end"] == r["packets_generated"]
        assert sum(r["generated_by_class"].values()) == r["packets_generated"]
        assert sum(r["delivered_by_class"].values()) == r["packets_delivered"]


def test_scenarios_have_increasing_offered_load():
    def total_rate(name):
        return sum(SCENARIOS[name]["arrival_rates"].values())

    assert total_rate("light") < total_rate("moderate") < total_rate("heavy")


def test_export_packets_csv_writes_one_row_per_packet():
    config = SimulationConfig(
        arrival_rates=SCENARIOS["moderate"]["arrival_rates"],
        queue_capacity=SCENARIOS["moderate"]["queue_capacity"],
        service_rate=SCENARIOS["moderate"]["service_rate"],
        duration=50,
        scheduler="adaptive_priority",
        seed=5,
    )
    result = run_simulation(config)
    with tempfile.TemporaryDirectory() as tmp:
        path = os.path.join(tmp, "packets.csv")
        export_packets_csv(result, path)
        with open(path) as f:
            rows = list(csv.reader(f))
        assert rows[0] == [
            "packet_id",
            "traffic_class",
            "arrival_time",
            "service_start_time",
            "departure_time",
            "outcome",
            "drop_reason",
        ]
        assert len(rows) - 1 == len(result.packets)


def test_export_summary_csv_writes_one_row_per_policy():
    results = run_mode_a_scheduling_only("light", seed=1)
    with tempfile.TemporaryDirectory() as tmp:
        path = os.path.join(tmp, "summary.csv")
        export_summary_csv(results, path)
        with open(path) as f:
            rows = list(csv.reader(f))
        assert len(rows) - 1 == 3
