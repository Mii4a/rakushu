from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    service_token: str
    temp_dir: Path
    callback_timeout_seconds: float
    transcription_model: str
    transcription_language: str
    max_audio_bytes: int


def get_settings() -> Settings:
    return Settings(
        service_token=os.environ.get("AI_INTERVIEW_TRANSCRIBER_SECRET", "dev-secret"),
        temp_dir=Path(os.environ.get("AI_INTERVIEW_TRANSCRIBER_TEMP_DIR", "/tmp/rakushu-ai-interview")),
        callback_timeout_seconds=float(os.environ.get("AI_INTERVIEW_CALLBACK_TIMEOUT_SECONDS", "30")),
        transcription_model=os.environ.get("AI_INTERVIEW_TRANSCRIBER_MODEL", "large-v3-turbo"),
        transcription_language=os.environ.get("AI_INTERVIEW_TRANSCRIBER_LANGUAGE", "ja"),
        max_audio_bytes=int(os.environ.get("AI_INTERVIEW_TRANSCRIBER_MAX_AUDIO_BYTES", str(8 * 1024 * 1024))),
    )
