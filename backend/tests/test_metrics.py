from metrics import (
    average_queueing_delay,
    jains_fairness_index,
    packet_loss_rate,
    packet_loss_rate_by_class,
    queue_utilisation_stats,
    throughput,
)
from traffic import Packet, TrafficClass


def delivered_packet(pid, tc, arrival, delay):
    p = Packet(packet_id=pid, traffic_class=tc, arrival_time=arrival)
    p.service_start_time = arrival + delay
    p.outcome = "delivered"
    return p


def dropped_packet(pid, tc, arrival):
    p = Packet(packet_id=pid, traffic_class=tc, arrival_time=arrival)
    p.outcome = "dropped"
    p.drop_reason = "buffer_full"
    return p


# --- packet loss rate -----------------------------------------------------

def test_packet_loss_rate_hand_computed():
    packets = [
        delivered_packet(0, TrafficClass.VOICE, 0, 1),
        delivered_packet(1, TrafficClass.VOICE, 0, 1),
        delivered_packet(2, TrafficClass.VOICE, 0, 1),
        dropped_packet(3, TrafficClass.VOICE, 0),
    ]
    assert packet_loss_rate(packets) == 25.0


def test_packet_loss_rate_empty_is_zero():
    assert packet_loss_rate([]) == 0.0


def test_packet_loss_rate_by_class_hand_computed():
    packets = [
        delivered_packet(0, TrafficClass.VOICE, 0, 1),
        dropped_packet(1, TrafficClass.VOICE, 0),
        delivered_packet(2, TrafficClass.BACKGROUND, 0, 1),
        delivered_packet(3, TrafficClass.BACKGROUND, 0, 1),
    ]
    result = packet_loss_rate_by_class(packets)
    assert result[TrafficClass.VOICE] == 50.0
    assert result[TrafficClass.BACKGROUND] == 0.0
    # a class with zero generated packets must not raise or appear nonzero
    assert result[TrafficClass.GAMING] == 0.0


# --- queueing delay ---------------------------------------------------

def test_average_queueing_delay_hand_computed():
    packets = [
        delivered_packet(0, TrafficClass.VOICE, 0, 2),
        delivered_packet(1, TrafficClass.VOICE, 0, 4),
        delivered_packet(2, TrafficClass.VOICE, 0, 6),
    ]
    assert average_queueing_delay(packets) == 4.0


def test_average_queueing_delay_ignores_dropped_packets():
    packets = [
        delivered_packet(0, TrafficClass.VOICE, 0, 10),
        dropped_packet(1, TrafficClass.VOICE, 0),
    ]
    assert average_queueing_delay(packets) == 10.0


def test_average_queueing_delay_no_delivered_packets_is_zero():
    assert average_queueing_delay([dropped_packet(0, TrafficClass.VOICE, 0)]) == 0.0


# --- throughput ---------------------------------------------------------

def test_throughput_hand_computed():
    packets = [delivered_packet(i, TrafficClass.VOICE, 0, 1) for i in range(5)]
    assert throughput(packets, duration=10) == 0.5


def test_throughput_zero_duration_raises():
    import pytest

    with pytest.raises(ValueError):
        throughput([], duration=0)


# --- queue utilisation --------------------------------------------------

def test_queue_utilisation_stats_hand_computed():
    history = [(0, 0.1), (1, 0.5), (2, 0.9)]
    stats = queue_utilisation_stats(history)
    assert abs(stats["average"] - 50.0) < 1e-9
    assert abs(stats["maximum"] - 90.0) < 1e-9


def test_queue_utilisation_stats_empty_history():
    stats = queue_utilisation_stats([])
    assert stats == {"average": 0.0, "maximum": 0.0}


# --- Jain's fairness index ------------------------------------------------

def test_jains_fairness_index_perfectly_fair():
    assert jains_fairness_index([1.0, 1.0, 1.0, 1.0]) == 1.0


def test_jains_fairness_index_unfair_hand_computed():
    # one class gets everything: J = (4)^2 / (4 * 16) = 16/64 = 0.25
    assert jains_fairness_index([4.0, 0.0, 0.0, 0.0]) == 0.25


def test_jains_fairness_index_all_zero_throughput():
    assert jains_fairness_index([0.0, 0.0, 0.0]) == 1.0


def test_jains_fairness_index_empty_list():
    assert jains_fairness_index([]) == 1.0
