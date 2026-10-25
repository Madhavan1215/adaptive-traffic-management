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


def test_priority_displace_keeps_queue_in_arrival_order():
    """FIFO and every FIFO tie-break assume index 0 is the oldest packet.
    An evicting newcomer must therefore join the back of the queue, not
    take the evicted packet's slot."""
    queue = [
        make_packet(0, TrafficClass.VOICE, 0),
        make_packet(1, TrafficClass.BACKGROUND, 1),
        make_packet(2, TrafficClass.VIDEO, 2),
    ]
    _admit(queue, make_packet(3, TrafficClass.GAMING, 3), capacity=3, drop_policy="priority_displace")
    arrival_times = [p.arrival_time for p in queue]
    assert arrival_times == sorted(arrival_times)
    assert [p.packet_id for p in queue] == [0, 2, 3]


def test_admit_returns_the_dropped_packet():
    queue = [make_packet(0, TrafficClass.BACKGROUND, 0)]
    newcomer = make_packet(1, TrafficClass.VOICE, 1)
    assert _admit(queue, newcomer, capacity=1, drop_policy="priority_displace").packet_id == 0
    rejected = make_packet(2, TrafficClass.BACKGROUND, 2)
    assert _admit(queue, rejected, capacity=1, drop_policy="tail_drop") is rejected
    assert _admit([], make_packet(3, TrafficClass.VOICE, 3), capacity=1, drop_policy="tail_drop") is None


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
            assert p.outcome in ("delivered", "dropped", "queued_at_end")


def test_packets_left_in_queue_at_the_end_are_accounted_for():
    """Under overload the run ends with packets still waiting; they must be
    labelled, so delivered + dropped + still-queued always equals generated."""
    config = _small_config(queue_capacity=5, duration=25, arrival_rates={TrafficClass.VOICE: 0.9, TrafficClass.BACKGROUND: 0.9})
    result = run_simulation(config)
    outcomes = [p.outcome for p in result.packets]
    assert set(outcomes) <= {"delivered", "dropped", "queued_at_end"}
    assert outcomes.count("queued_at_end") > 0
    assert outcomes.count("queued_at_end") <= config.queue_capacity


def test_no_double_counting_total_packets_equals_delivered_plus_dropped():
    result = run_simulation(_small_config(scheduler="adaptive_priority", drop_policy="priority_displace"))
    delivered = sum(1 for p in result.packets if p.outcome == "delivered")
    dropped = sum(1 for p in result.packets if p.outcome == "dropped")
    queued = sum(1 for p in result.packets if p.outcome == "queued_at_end")
    assert delivered + dropped + queued == len(result.packets)


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


@pytest.mark.parametrize("scheduler", ["fifo", "static_priority", "adaptive_priority"])
@pytest.mark.parametrize("drop_policy", ["tail_drop", "priority_displace"])
def test_replay_matches_the_simulation_it_records(scheduler, drop_policy):
    config = _small_config(
        scheduler=scheduler,
        drop_policy=drop_policy,
        queue_capacity=4,
        arrival_rates={TrafficClass.VOICE: 0.6, TrafficClass.BACKGROUND: 0.6},
    )
    result = run_simulation(config, replay_steps=60)
    assert [frame["t"] for frame in result.replay] == list(range(60))

    by_id = {p.packet_id: p for p in result.packets}
    for frame, (t, utilisation) in zip(result.replay, result.utilisation_history):
        assert frame["utilisation"] == utilisation
        # queue at decision time = what is left after service + what was served
        assert len(frame["queue"]) + len(frame["served"]) == round(utilisation * config.queue_capacity)
        assert len(frame["queue"]) <= config.queue_capacity
        queue_arrivals = [q["arrival"] for q in frame["queue"]]
        assert queue_arrivals == sorted(queue_arrivals)
        for s in frame["served"]:
            assert by_id[s["id"]].service_start_time == t
            assert s["wait"] == t - by_id[s["id"]].arrival_time
        for d in frame["dropped"]:
            assert by_id[d["id"]].outcome == "dropped"
            assert by_id[d["id"]].drop_reason == d["reason"]
    # every packet served at a recorded step appears in exactly that frame
    served_in_replay = {s["id"] for frame in result.replay for s in frame["served"]}
    assert served_in_replay == {p.packet_id for p in result.packets if p.service_start_time is not None and p.service_start_time < 60}


def test_replay_scores_use_the_adaptive_formula():
    config = _small_config(scheduler="adaptive_priority", alpha=0.5, queue_capacity=4,
                           arrival_rates={TrafficClass.VOICE: 0.7, TrafficClass.BACKGROUND: 0.7})
    result = run_simulation(config, replay_steps=80)
    scored = 0
    for frame in result.replay:
        alpha_eff = 1.0 if frame["level"] == "high" else 0.5
        for s in frame["served"]:
            if frame["level"] == "low":
                assert "score" not in s
            else:
                base = 5 if s["cls"] == "voice" else 1
                assert s["score"] == pytest.approx(base + alpha_eff * s["wait"])
                scored += 1
    assert scored > 0


def test_replay_is_empty_by_default_and_bounded_by_duration():
    assert run_simulation(_small_config()).replay == []
    assert len(run_simulation(_small_config(duration=10), replay_steps=100).replay) == 10


def test_queue_occupancy_is_identical_across_schedulers_under_tail_drop():
    """Explains a Deep Analysis observation: with the same trace and tail-drop,
    scheduling changes WHICH packet leaves, never HOW MANY are queued."""
    trace = generate_trace({TrafficClass.VOICE: 0.6, TrafficClass.BACKGROUND: 0.6}, duration=200, seed=3)
    histories = [
        run_simulation(_small_config(scheduler=s), trace=trace).utilisation_history
        for s in ("fifo", "static_priority", "adaptive_priority")
    ]
    assert histories[0] == histories[1] == histories[2]


def test_service_rate_above_one_serves_multiple_packets_per_step():
    config = _small_config(queue_capacity=10, service_rate=3, arrival_rates={TrafficClass.VOICE: 1.0})
    result = run_simulation(config)
    # with 1 arrival/step and 3 service slots/step, the queue should never
    # build up beyond the first couple of steps.
    later_utilisations = [u for t, u in result.utilisation_history if t > 2]
    assert all(u <= 0.2 for u in later_utilisations)
