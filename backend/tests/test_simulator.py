import pytest

from simulator import SimulationConfig, _admit, generate_trace, run_simulation
from traffic import Packet, TrafficClass


def make_packet(packet_id: int, traffic_class: TrafficClass, arrival_time: int) -> Packet:
    return Packet(packet_id=packet_id, traffic_class=traffic_class, arrival_time=arrival_time)


# --- config validation -------------------------------------------------

@pytest.mark.parametrize(
    "overrides",
    [
        {"queue_capacity": 0},
        {"service_rate": 0},
        {"duration": 0},
        {"scheduler": "not_a_real_scheduler"},
        {"drop_policy": "not_a_real_policy"},
    ],
)
def test_invalid_config_raises(overrides):
    base = dict(
        arrival_rates={TrafficClass.VOICE: 0.5},
        queue_capacity=10,
        service_rate=1,
        duration=10,
        scheduler="fifo",
    )
    base.update(overrides)
    with pytest.raises(ValueError):
        SimulationConfig(**base)


# --- admission / drop policy --------------------------------------------

def test_tail_drop_admits_until_full_then_drops_newcomer():
    queue: list[Packet] = []
    for i in range(3):
        _admit(queue, make_packet(i, TrafficClass.BACKGROUND, 0), capacity=3, drop_policy="tail_drop")
    assert len(queue) == 3

    overflow = make_packet(99, TrafficClass.VOICE, 0)
    _admit(queue, overflow, capacity=3, drop_policy="tail_drop")
    assert len(queue) == 3  # capacity never exceeded
    assert overflow.outcome == "dropped"
    assert overflow.drop_reason == "buffer_full"


def test_priority_displace_evicts_lower_priority_packet():
    background = make_packet(0, TrafficClass.BACKGROUND, 0)
    queue = [background, make_packet(1, TrafficClass.FILE_TRANSFER, 0)]
    high = make_packet(2, TrafficClass.VOICE, 1)
    _admit(queue, high, capacity=2, drop_policy="priority_displace")

    assert len(queue) == 2
    assert high in queue
    assert background not in queue
    assert background.outcome == "dropped"
    assert background.drop_reason == "displaced"


def test_priority_displace_drops_newcomer_when_not_higher_priority():
    queue = [make_packet(0, TrafficClass.VOICE, 0), make_packet(1, TrafficClass.VOICE, 0)]
    newcomer = make_packet(2, TrafficClass.BACKGROUND, 1)
    _admit(queue, newcomer, capacity=2, drop_policy="priority_displace")
    assert len(queue) == 2
    assert newcomer.outcome == "dropped"
    assert newcomer.drop_reason == "buffer_full"
    assert newcomer not in queue


def test_priority_displace_tie_evicts_oldest_among_lowest_priority():
    queue = [make_packet(0, TrafficClass.BACKGROUND, 0), make_packet(1, TrafficClass.BACKGROUND, 1)]
    high = make_packet(2, TrafficClass.VOICE, 2)
    _admit(queue, high, capacity=2, drop_policy="priority_displace")
    remaining_ids = {p.packet_id for p in queue}
    assert remaining_ids == {1, 2}  # id 0 (oldest of the tied lowest) was evicted


def test_admission_never_exceeds_capacity():
    queue: list[Packet] = []
    for i in range(10):
        _admit(queue, make_packet(i, TrafficClass.NORMAL_DATA, i), capacity=4, drop_policy="tail_drop")
        assert len(queue) <= 4


# --- full simulation runs -----------------------------------------------

def _small_config(**overrides) -> SimulationConfig:
    base = dict(
        arrival_rates={
            TrafficClass.VOICE: 0.3,
            TrafficClass.BACKGROUND: 0.3,
        },
        queue_capacity=5,
        service_rate=1,
        duration=200,
        scheduler="fifo",
        seed=1,
    )
    base.update(overrides)
    return SimulationConfig(**base)


def test_every_packet_has_exactly_one_final_outcome():
    for scheduler in ("fifo", "static_priority", "adaptive_priority"):
        result = run_simulation(_small_config(scheduler=scheduler))
        for p in result.packets:
            assert p.outcome in ("delivered", "dropped")


def test_no_double_counting_total_packets_equals_delivered_plus_dropped():
    result = run_simulation(_small_config(scheduler="adaptive_priority", drop_policy="priority_displace"))
    delivered = sum(1 for p in result.packets if p.outcome == "delivered")
    dropped = sum(1 for p in result.packets if p.outcome == "dropped")
    assert delivered + dropped == len(result.packets)


def test_queueing_delay_never_negative():
    result = run_simulation(_small_config(scheduler="static_priority"))
    for p in result.packets:
        if p.outcome == "delivered":
            assert p.queueing_delay() >= 0


def test_queue_never_exceeds_capacity_during_simulation():
    result = run_simulation(_small_config(queue_capacity=5))
    assert all(utilisation <= 1.0 for _, utilisation in result.utilisation_history)


def test_deterministic_runs_with_identical_seeds():
    a = run_simulation(_small_config(seed=123))
    b = run_simulation(_small_config(seed=123))
    outcomes_a = [(p.packet_id, p.traffic_class, p.arrival_time, p.outcome, p.service_start_time) for p in a.packets]
    outcomes_b = [(p.packet_id, p.traffic_class, p.arrival_time, p.outcome, p.service_start_time) for p in b.packets]
    assert outcomes_a == outcomes_b


def test_different_seeds_can_produce_different_traces():
    a = run_simulation(_small_config(seed=1))
    b = run_simulation(_small_config(seed=2))
    trace_a = [(p.packet_id, p.arrival_time) for p in a.packets]
    trace_b = [(p.packet_id, p.arrival_time) for p in b.packets]
    assert trace_a != trace_b


def test_zero_arrival_rate_produces_no_packets():
    config = _small_config(arrival_rates={TrafficClass.VOICE: 0.0, TrafficClass.BACKGROUND: 0.0})
    result = run_simulation(config)
    assert result.packets == []
    assert all(u == 0.0 for _, u in result.utilisation_history)


def test_identical_trace_reused_across_policies():
    """Mode A's core guarantee: the same trace, replayed into different
    scheduler configs, produces identical arrival facts (id/class/time)
    for every policy -- only service order/outcome may differ."""
    trace = generate_trace({TrafficClass.VOICE: 0.4, TrafficClass.BACKGROUND: 0.4}, duration=100, seed=7)
    fifo_result = run_simulation(_small_config(scheduler="fifo"), trace=trace)
    adaptive_result = run_simulation(_small_config(scheduler="adaptive_priority"), trace=trace)

    fifo_arrivals = sorted((p.packet_id, p.traffic_class, p.arrival_time) for p in fifo_result.packets)
    adaptive_arrivals = sorted((p.packet_id, p.traffic_class, p.arrival_time) for p in adaptive_result.packets)
    assert fifo_arrivals == adaptive_arrivals


def test_service_rate_above_one_serves_multiple_packets_per_step():
    config = _small_config(queue_capacity=10, service_rate=3, arrival_rates={TrafficClass.VOICE: 1.0})
    result = run_simulation(config)
    # with 1 arrival/step and 3 service slots/step, the queue should never
    # build up beyond the first couple of steps.
    later_utilisations = [u for t, u in result.utilisation_history if t > 2]
    assert all(u <= 0.2 for u in later_utilisations)
