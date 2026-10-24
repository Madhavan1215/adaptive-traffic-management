"""FastAPI layer. Endpoints only resolve/validate a request and call into
simulator.py / metrics.py / experiments.py -- no scheduling or simulation
logic is implemented here."""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from experiments import SCENARIOS, run_mode_a_from_config, run_mode_b_from_config, summarize
from models import CompareMode, CompareRequest, ScenarioName, SimulationRequest
from simulator import SimulationConfig, run_simulation
from traffic import TrafficClass

app = FastAPI(title="Adaptive Traffic Management Simulator")

# Dev-friendly CORS: this is a simulator for a classroom demo, not a
# production service, and the frontend runs on a different Vite port.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_PACKET_SAMPLES = 200

ALGORITHM_INFO = {
    "fifo": {
        "name": "FIFO",
        "summary": "Serves the oldest queued packet first, ignoring traffic priority entirely.",
        "formula": None,
    },
    "static_priority": {
        "name": "Static priority",
        "summary": (
            "Always serves the highest base-priority packet first, FIFO among ties. "
            "A later-arriving high-priority packet can overtake an older low-priority one, "
            "which risks starving low-priority traffic under sustained high-priority load."
        ),
        "formula": None,
    },
    "adaptive_priority": {
        "name": "Adaptive priority",
        "summary": (
            "Below 50% queue utilisation, behaves like FIFO. From 50-80%, ranks packets by "
            "priority score. Above 80%, doubles the aging coefficient's effect for more "
            "aggressive protection of high-priority traffic. Waiting-time aging guarantees "
            "no packet is starved forever."
        ),
        "formula": "priority_score = base_priority + alpha * waiting_time",
    },
}


def _resolve_scenario(
    scenario: ScenarioName,
    arrival_rates: dict[TrafficClass, float] | None,
    queue_capacity: int,
    service_rate: int,
    duration: int,
) -> dict:
    """Return a scenario dict (arrival_rates/queue_capacity/service_rate/duration),
    either one of the built-in SCENARIOS or the request's custom values."""
    if scenario == ScenarioName.CUSTOM:
        return {
            "arrival_rates": arrival_rates,
            "queue_capacity": queue_capacity,
            "service_rate": service_rate,
            "duration": duration,
        }
    return SCENARIOS[scenario.value]


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/algorithms")
def get_algorithms() -> dict:
    return {"algorithms": ALGORITHM_INFO}


@app.get("/api/config/defaults")
def get_config_defaults() -> dict:
    return {
        "scenarios": {
            name: {
                "arrival_rates": {tc.value: rate for tc, rate in cfg["arrival_rates"].items()},
                "queue_capacity": cfg["queue_capacity"],
                "service_rate": cfg["service_rate"],
                "duration": cfg["duration"],
            }
            for name, cfg in SCENARIOS.items()
        },
        "default_scheduler": "adaptive_priority",
        "default_alpha": 0.5,
        "default_seed": 42,
        "default_drop_policy": "tail_drop",
        "traffic_classes": [tc.value for tc in TrafficClass],
    }


@app.post("/api/simulate")
def simulate(request: SimulationRequest) -> dict:
    scenario = _resolve_scenario(
        request.scenario, request.arrival_rates, request.queue_capacity, request.service_rate, request.duration
    )
    try:
        config = SimulationConfig(
            arrival_rates=scenario["arrival_rates"],
            queue_capacity=scenario["queue_capacity"],
            service_rate=scenario["service_rate"],
            duration=scenario["duration"],
            scheduler=request.scheduler.value,
            alpha=request.alpha,
            seed=request.seed,
            drop_policy=request.drop_policy.value,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    result = run_simulation(config)
    summary = summarize(result)

    packet_samples = [
        {
            "packet_id": p.packet_id,
            "traffic_class": p.traffic_class.value,
            "arrival_time": p.arrival_time,
            "service_start_time": p.service_start_time,
            "departure_time": p.departure_time,
            "outcome": p.outcome,
            "drop_reason": p.drop_reason,
        }
        for p in result.packets[:MAX_PACKET_SAMPLES]
    ]

    return {
        "config": {
            "scenario": request.scenario.value,
            "arrival_rates": {tc.value: rate for tc, rate in scenario["arrival_rates"].items()},
            "queue_capacity": scenario["queue_capacity"],
            "service_rate": scenario["service_rate"],
            "duration": scenario["duration"],
            "scheduler": request.scheduler.value,
            "alpha": request.alpha,
            "seed": request.seed,
            "drop_policy": request.drop_policy.value,
        },
        "summary": summary,
        "queue_utilisation_history": result.utilisation_history,
        "packet_samples": packet_samples,
    }


@app.post("/api/compare")
def compare(request: CompareRequest) -> dict:
    scenario = _resolve_scenario(
        request.scenario, request.arrival_rates, request.queue_capacity, request.service_rate, request.duration
    )
    if scenario["arrival_rates"] is None:
        raise HTTPException(status_code=422, detail="arrival_rates is required for a custom scenario")

    try:
        if request.mode == CompareMode.SCHEDULING_ONLY:
            results = run_mode_a_from_config(scenario, alpha=request.alpha, seed=request.seed)
        else:
            results = run_mode_b_from_config(scenario, alpha=request.alpha, seed=request.seed)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return {
        "mode": request.mode.value,
        "config": {
            "scenario": request.scenario.value,
            "arrival_rates": {tc.value: rate for tc, rate in scenario["arrival_rates"].items()},
            "queue_capacity": scenario["queue_capacity"],
            "service_rate": scenario["service_rate"],
            "duration": scenario["duration"],
            "alpha": request.alpha,
            "seed": request.seed,
        },
        "results": results,
    }
