"""Regenerates the CSVs in results/ from scratch. Run from the backend/
directory: `python run_experiments.py`. Every number in these files comes
from an actual simulation run (seed=42, alpha=0.5) -- nothing here is
hand-typed."""

from __future__ import annotations

import os

from experiments import (
    SCENARIOS,
    export_packets_csv,
    export_summary_csv,
    run_mode_a_scheduling_only,
    run_mode_b_congestion_protection,
)
from simulator import SimulationConfig, run_simulation

RESULTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "results")
SEED = 42
ALPHA = 0.5


def main() -> None:
    os.makedirs(RESULTS_DIR, exist_ok=True)

    for scenario_name in ("light", "moderate", "heavy"):
        mode_a = run_mode_a_scheduling_only(scenario_name, alpha=ALPHA, seed=SEED)
        export_summary_csv(mode_a, os.path.join(RESULTS_DIR, f"mode_a_{scenario_name}_summary.csv"))

        mode_b = run_mode_b_congestion_protection(scenario_name, alpha=ALPHA, seed=SEED)
        export_summary_csv(mode_b, os.path.join(RESULTS_DIR, f"mode_b_{scenario_name}_summary.csv"))

        print(f"{scenario_name:10s} Mode A loss by policy: " + ", ".join(f"{k}={v['packet_loss_rate']:.2f}%" for k, v in mode_a.items()))
        print(f"{scenario_name:10s} Mode B loss by policy: " + ", ".join(f"{k}={v['packet_loss_rate']:.2f}%" for k, v in mode_b.items()))

    # One full packet-level trace for inspection (heavy load, adaptive scheduler).
    scenario = SCENARIOS["heavy"]
    config = SimulationConfig(
        arrival_rates=scenario["arrival_rates"],
        queue_capacity=scenario["queue_capacity"],
        service_rate=scenario["service_rate"],
        duration=scenario["duration"],
        scheduler="adaptive_priority",
        alpha=ALPHA,
        seed=SEED,
        drop_policy="tail_drop",
    )
    result = run_simulation(config)
    export_packets_csv(result, os.path.join(RESULTS_DIR, "heavy_adaptive_priority_packets.csv"))
    print(f"\nWrote packet-level trace: {len(result.packets)} packets -> results/heavy_adaptive_priority_packets.csv")


if __name__ == "__main__":
    main()
