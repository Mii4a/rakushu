from types import SimpleNamespace

from app.transcribe import normalize_segments


def test_normalize_segments_converts_seconds_to_millis():
    segments = normalize_segments(
        [
            SimpleNamespace(start=0.12, end=1.57, text=" こんにちは ", avg_logprob=-0.12, no_speech_prob=0.01),
            SimpleNamespace(start=1.57, end=2.10, text="世界", avg_logprob=None, no_speech_prob=None),
        ]
    )

    assert segments[0].start_ms == 120
    assert segments[0].end_ms == 1570
    assert segments[0].text == "こんにちは"
    assert segments[1].text == "世界"
