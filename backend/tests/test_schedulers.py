from schedulers import (
    congestion_level,
    select_adaptive_priority,
    select_fifo,
    select_static_priority,
)
from traffic import Packet, TrafficClass


def make_packet(packet_id: int, traffic_class: TrafficClass, arrival_time: int) -> Packet:
    return Packet(packet_id=packet_id, traffic_class=traffic_class, arrival_time=arrival_time)


# --- congestion_level -------------------------------------------------

def test_congestion_level_thresholds():
    assert congestion_level(0.0) == "low"
    assert congestion_level(0.49) == "low"
    assert congestion_level(0.5) == "moderate"
    assert congestion_level(0.8) == "moderate"
    assert congestion_level(0.81) == "high"
    assert congestion_level(1.0) == "high"


# --- FIFO ---------------------------------------------------------------

def test_fifo_always_serves_oldest_regardless_of_priority():
    queue = [
        make_packet(0, TrafficClass.BACKGROUND, arrival_time=0),
        make_packet(1, TrafficClass.VOICE, arrival_time=1),
    ]
    assert select_fifo(queue, current_time=5) == 0


def test_fifo_preserves_arrival_order_as_served():
    queue = [make_packet(i, TrafficClass.NORMAL_DATA, arrival_time=i) for i in range(5)]
    order = []
    t = 10
    while queue:
        idx = select_fifo(queue, t)
        order.append(queue.pop(idx).packet_id)
    assert order == [0, 1, 2, 3, 4]


# --- Static priority ------------------------------------------------------

def test_static_priority_serves_highest_priority_first():
    queue = [
        make_packet(0, TrafficClass.BACKGROUND, arrival_time=0),
        make_packet(1, TrafficClass.VOICE, arrival_time=5),
    ]
    # Voice (priority 5) arrived later but must be served first.
    assert select_static_priority(queue, current_time=5) == 1


def test_static_priority_tie_breaks_fifo():
    queue = [
        make_packet(0, TrafficClass.VIDEO, arrival_time=0),
        make_packet(1, TrafficClass.VIDEO, arrival_time=1),
    ]
    assert select_static_priority(queue, current_time=5) == 0


def test_static_priority_allows_overtaking():
    """Demonstrates the starvation RISK the brief asks to explain: a
    continuously-arriving high-priority stream can keep overtaking an
    old low-priority packet under static priority (no aging)."""
    background = make_packet(0, TrafficClass.BACKGROUND, arrival_time=0)
    queue = [background]
    for t in range(1, 21):
        queue.append(make_packet(t, TrafficClass.VOICE, arrival_time=t))
        idx = select_static_priority(queue, current_time=t)
        served = queue.pop(idx)
        assert served.traffic_class == TrafficClass.VOICE
    # The background packet is still waiting after 20 steps of contention.
    assert background in queue


# --- Adaptive priority -----------------------------------------------------

def test_adaptive_low_congestion_behaves_like_fifo():
    queue = [
        make_packet(0, TrafficClass.BACKGROUND, arrival_time=0),
        make_packet(1, TrafficClass.VOICE, arrival_time=1),
    ]
    idx = select_adaptive_priority(queue, current_time=2, alpha=1.0, utilisation=0.3)
    assert idx == 0  # ignores priority, serves oldest


def test_adaptive_moderate_congestion_is_priority_aware():
    queue = [
        make_packet(0, TrafficClass.BACKGROUND, arrival_time=0),
        make_packet(1, TrafficClass.VOICE, arrival_time=1),
    ]
    # At t=2, waiting times are small so base priority dominates: voice wins.
    idx = select_adaptive_priority(queue, current_time=2, alpha=0.1, utilisation=0.6)
    assert idx == 1


def test_adaptive_aging_lets_old_low_priority_packet_win():
    background = make_packet(0, TrafficClass.BACKGROUND, arrival_time=0)
    voice = make_packet(1, TrafficClass.VOICE, arrival_time=19)
    queue = [background, voice]
    # background score at t=20: 1 + 0.5*20 = 11; voice score: 5 + 0.5*1 = 5.5
    idx = select_adaptive_priority(queue, current_time=20, alpha=0.5, utilisation=0.6)
    assert idx == 0


def test_adaptive_high_congestion_scales_alpha():
    background = make_packet(0, TrafficClass.BACKGROUND, arrival_time=0)
    voice = make_packet(1, TrafficClass.VOICE, arrival_time=9)
    queue = [background, voice]
    # waiting times: background=10, voice=1. alpha=0.3.
    # moderate score: bg=1+0.3*10=4, voice=5+0.3*1=5.3 -> voice wins
    idx_moderate = select_adaptive_priority(queue, current_time=10, alpha=0.3, utilisation=0.6)
    assert idx_moderate == 1
    # high congestion doubles alpha to 0.6: bg=1+0.6*10=7, voice=5+0.6*1=5.6 -> bg wins
    idx_high = select_adaptive_priority(queue, current_time=10, alpha=0.3, utilisation=0.9)
    assert idx_high == 0


def test_adaptive_tie_breaks_fifo():
    queue = [
        make_packet(0, TrafficClass.VIDEO, arrival_time=0),
        make_packet(1, TrafficClass.VIDEO, arrival_time=0),
    ]
    idx = select_adaptive_priority(queue, current_time=0, alpha=0.5, utilisation=0.6)
    assert idx == 0


def test_adaptive_prevents_starvation_under_sustained_high_priority_load():
    """The aging term must eventually overtake a fixed base-priority gap,
    so a background packet is not starved forever even while voice
    packets keep arriving every step."""
    background = make_packet(0, TrafficClass.BACKGROUND, arrival_time=0)
    queue = [background]
    alpha = 0.5
    served_background_at = None
    for t in range(1, 51):
        queue.append(make_packet(t, TrafficClass.VOICE, arrival_time=t))
        idx = select_adaptive_priority(queue, current_time=t, alpha=alpha, utilisation=0.9)
        served = queue.pop(idx)
        if served.packet_id == 0:
            served_background_at = t
            break
    assert served_background_at is not None
    assert served_background_at < 50


def test_adaptive_empty_traffic_single_packet_queue():
    only = make_packet(0, TrafficClass.BACKGROUND, arrival_time=0)
    assert select_adaptive_priority([only], current_time=5, alpha=0.5, utilisation=0.9) == 0
