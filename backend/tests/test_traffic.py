import pytest

from traffic import ArrivalGenerator, Packet, TrafficClass


def test_zero_arrival_rate_never_generates():
    gen = ArrivalGenerator({TrafficClass.VOICE: 0.0}, seed=1)
    for t in range(100):
        assert gen.step(t) == []


def test_rate_one_always_generates_exactly_one_per_class_per_step():
    gen = ArrivalGenerator({TrafficClass.VOICE: 1.0, TrafficClass.VIDEO: 1.0}, seed=1)
    arrivals = gen.step(0)
    assert len(arrivals) == 2
    assert {p.traffic_class for p in arrivals} == {TrafficClass.VOICE, TrafficClass.VIDEO}


def test_invalid_rate_rejected():
    with pytest.raises(ValueError):
        ArrivalGenerator({TrafficClass.VOICE: 1.5})


def test_same_seed_is_deterministic():
    rates = {TrafficClass.VOICE: 0.5, TrafficClass.BACKGROUND: 0.5}
    gen_a = ArrivalGenerator(rates, seed=7)
    gen_b = ArrivalGenerator(rates, seed=7)
    trace_a = [len(gen_a.step(t)) for t in range(50)]
    trace_b = [len(gen_b.step(t)) for t in range(50)]
    assert trace_a == trace_b


def test_different_seeds_can_diverge():
    rates = {TrafficClass.VOICE: 0.5}
    gen_a = ArrivalGenerator(rates, seed=1)
    gen_b = ArrivalGenerator(rates, seed=2)
    trace_a = [len(gen_a.step(t)) for t in range(50)]
    trace_b = [len(gen_b.step(t)) for t in range(50)]
    assert trace_a != trace_b


def test_packet_queueing_delay_matches_definition():
    p = Packet(packet_id=0, traffic_class=TrafficClass.VOICE, arrival_time=3)
    p.service_start_time = 10
    assert p.queueing_delay() == 7


def test_packet_queueing_delay_before_service_raises():
    p = Packet(packet_id=0, traffic_class=TrafficClass.VOICE, arrival_time=3)
    with pytest.raises(ValueError):
        p.queueing_delay()


def test_base_priority_matches_spec_table():
    assert Packet(0, TrafficClass.VOICE, 0).base_priority == 5
    assert Packet(0, TrafficClass.GAMING, 0).base_priority == 5
    assert Packet(0, TrafficClass.VIDEO, 0).base_priority == 4
    assert Packet(0, TrafficClass.NORMAL_DATA, 0).base_priority == 3
    assert Packet(0, TrafficClass.FILE_TRANSFER, 0).base_priority == 2
    assert Packet(0, TrafficClass.BACKGROUND, 0).base_priority == 1
