"""Pydantic request/response schemas for the API layer only. No simulation
logic lives here -- main.py resolves a validated request into a
simulator.SimulationConfig and calls into simulator/metrics/experiments."""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field, field_validator, model_validator

from traffic import TrafficClass


class ScenarioName(str, Enum):
    LIGHT = "light"
    MODERATE = "moderate"
    HEAVY = "heavy"
    CUSTOM = "custom"


class SchedulerName(str, Enum):
    FIFO = "fifo"
    STATIC_PRIORITY = "static_priority"
    ADAPTIVE_PRIORITY = "adaptive_priority"


class DropPolicyName(str, Enum):
    TAIL_DROP = "tail_drop"
    PRIORITY_DISPLACE = "priority_displace"


class CompareMode(str, Enum):
    SCHEDULING_ONLY = "scheduling_only"
    CONGESTION_PROTECTION = "congestion_protection"


class SimulationRequest(BaseModel):
    scenario: ScenarioName = ScenarioName.MODERATE
    # Only required/used when scenario == "custom"; ignored otherwise.
    arrival_rates: dict[TrafficClass, float] | None = None
    queue_capacity: int = Field(default=20, ge=1, le=1000)
    service_rate: int = Field(default=1, ge=1, le=100)
    duration: int = Field(default=500, ge=1, le=5000)
    scheduler: SchedulerName = SchedulerName.ADAPTIVE_PRIORITY
    alpha: float = Field(default=0.5, ge=0.0, le=10.0)
    seed: int = 42
    drop_policy: DropPolicyName = DropPolicyName.TAIL_DROP

    @field_validator("arrival_rates")
    @classmethod
    def _rates_in_range(cls, value: dict[TrafficClass, float] | None) -> dict[TrafficClass, float] | None:
        if value is None:
            return value
        for tc, rate in value.items():
            if not (0.0 <= rate <= 1.0):
                raise ValueError(f"arrival rate for {tc} must be in [0, 1], got {rate}")
        return value

    @model_validator(mode="after")
    def _custom_scenario_requires_full_rates(self) -> "SimulationRequest":
        if self.scenario == ScenarioName.CUSTOM:
            if self.arrival_rates is None or set(self.arrival_rates.keys()) != set(TrafficClass):
                raise ValueError(
                    "scenario='custom' requires arrival_rates with all 6 traffic classes"
                )
        return self


class CompareRequest(BaseModel):
    mode: CompareMode = CompareMode.SCHEDULING_ONLY
    scenario: ScenarioName = ScenarioName.MODERATE
    arrival_rates: dict[TrafficClass, float] | None = None
    queue_capacity: int = Field(default=20, ge=1, le=1000)
    service_rate: int = Field(default=1, ge=1, le=100)
    duration: int = Field(default=500, ge=1, le=5000)
    alpha: float = Field(default=0.5, ge=0.0, le=10.0)
    seed: int = 42

    @field_validator("arrival_rates")
    @classmethod
    def _rates_in_range(cls, value: dict[TrafficClass, float] | None) -> dict[TrafficClass, float] | None:
        if value is None:
            return value
        for tc, rate in value.items():
            if not (0.0 <= rate <= 1.0):
                raise ValueError(f"arrival rate for {tc} must be in [0, 1], got {rate}")
        return value

    @model_validator(mode="after")
    def _custom_scenario_requires_full_rates(self) -> "CompareRequest":
        if self.scenario == ScenarioName.CUSTOM:
            if self.arrival_rates is None or set(self.arrival_rates.keys()) != set(TrafficClass):
                raise ValueError(
                    "scenario='custom' requires arrival_rates with all 6 traffic classes"
                )
        return self
