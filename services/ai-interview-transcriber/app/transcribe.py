from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class NormalizedSegment:
    start_ms: int
    end_ms: int
    text: str
    avg_logprob: float | None
    no_speech_prob: float | None


def normalize_segments(raw_segments: list[Any]) -> list[NormalizedSegment]:
    normalized: list[NormalizedSegment] = []
    for segment in raw_segments:
        normalized.append(
            NormalizedSegment(
                start_ms=max(0, round(float(getattr(segment, "start", 0)) * 1000)),
                end_ms=max(0, round(float(getattr(segment, "end", 0)) * 1000)),
                text=str(getattr(segment, "text", "")).strip(),
                avg_logprob=float(getattr(segment, "avg_logprob", 0)) if getattr(segment, "avg_logprob", None) is not None else None,
                no_speech_prob=float(getattr(segment, "no_speech_prob", 0)) if getattr(segment, "no_speech_prob", None) is not None else None,
            )
        )
    return normalized


def transcribe_audio_file(audio_path: Path, *, model_name: str, language_code: str) -> dict[str, Any]:
    from faster_whisper import WhisperModel  # lazy import so unit tests can run without model load

    model = WhisperModel(model_name)
    segments, info = model.transcribe(str(audio_path), language=language_code)
    normalized_segments = normalize_segments(list(segments))
    raw_transcript_text = " ".join(segment.text for segment in normalized_segments).strip()

    return {
        "model_name": model_name,
        "language_code": getattr(info, "language", language_code) or language_code,
        "raw_transcript_text": raw_transcript_text,
        "normalized_transcript_text": raw_transcript_text,
        "segments": [
            {
                "startMs": segment.start_ms,
                "endMs": segment.end_ms,
                "text": segment.text,
                "avgLogprob": segment.avg_logprob,
                "noSpeechProb": segment.no_speech_prob,
            }
            for segment in normalized_segments
        ],
    }
