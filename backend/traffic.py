"""Packet model and arrival generation.

Assumption (documented per project spec): arrivals are independent Bernoulli
trials per traffic class per simulation time slot. At most one packet per
class can arrive in a single slot; all packets are the same size (size=1).
This is a simplification of real bursty/self-similar network traffic.
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from enum import Enum


class TrafficClass(str, Enum):
    VOICE = "voice"
    GAMING = "gaming"
    VIDEO = "video"
    NORMAL_DATA = "normal_data"
    FILE_TRANSFER = "file_transfer"
    BACKGROUND = "background"


# Illustrative base priorities from the project proposal, not a real-world
# standard (e.g. not DSCP/QoS values used by actual ISPs).
BASE_PRIORITY: dict[TrafficClass, int] = {
    TrafficClass.VOICE: 5,
    TrafficClass.GAMING: 5,
    TrafficClass.VIDEO: 4,
    TrafficClass.NORMAL_DATA: 3,
    TrafficClass.FILE_TRANSFER: 2,
    TrafficClass.BACKGROUND: 1,
}


@dataclass
class Packet:
    packet_id: int
    traffic_class: TrafficClass
    arrival_time: int
    size: int = 1
    service_start_time: int | None = None
    departure_time: int | None = None
    # Exactly one of these must be set by the end of a simulation run.
    outcome: str | None = None  # "delivered" | "dropped"
    drop_reason: str | None = None  # "buffer_full" | "displaced"

    @property
    def base_priority(self) -> int:
        return BASE_PRIORITY[self.traffic_class]

    def waiting_time(self, current_time: int) -> int:
        """Time slots spent in the queue so far (not yet served)."""
        return current_time - self.arrival_time

    def queueing_delay(self) -> int:
        """Service start minus arrival time. Only meaningful once served."""
        if self.service_start_time is None:
            raise ValueError("packet has not been served yet")
        delay = self.service_start_time - self.arrival_time
        if delay < 0:
            raise ValueError("queueing delay cannot be negative")
        return delay


class ArrivalGenerator:
    """Generates arrivals for one simulation using independent per-class
    Bernoulli trials, driven by a seeded RNG for reproducibility."""

    def __init__(self, arrival_rates: dict[TrafficClass, float], seed: int = 42):
        for tc, rate in arrival_rates.items():
            if not (0.0 <= rate <= 1.0):
                raise ValueError(f"arrival rate for {tc} must be in [0, 1], got {rate}")
        self._rates = arrival_rates
        self._rng = random.Random(seed)
        self._next_id = 0

    def step(self, t: int) -> list[Packet]:
        """Return the list of packets arriving at time slot t (order follows
        the fixed dict iteration order of arrival_rates, which is stable)."""
        arrivals: list[Packet] = []
        for tc, rate in self._rates.items():
            if self._rng.random() < rate:
                arrivals.append(Packet(packet_id=self._next_id, traffic_class=tc, arrival_time=t))
                self._next_id += 1
        return arrivals
