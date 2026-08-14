from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import os
import uuid


@dataclass(frozen=True)
class StoredAudio:
    temp_path: Path
    temp_object_key: str


def persist_temp_audio(*, temp_dir: Path, suffix: str, content: bytes) -> StoredAudio:
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_object_key = str(uuid.uuid4())
    temp_path = temp_dir / f"{temp_object_key}{suffix}"
    temp_path.write_bytes(content)
    return StoredAudio(temp_path=temp_path, temp_object_key=temp_object_key)


def delete_temp_audio(path: Path) -> str:
    try:
        path.unlink()
        return "deleted"
    except FileNotFoundError:
        return "not_found"
    except OSError:
        return "failed"


def pick_suffix(filename: str, mime_type: str) -> str:
    if filename.endswith(".ogg") or "ogg" in mime_type:
        return ".ogg"
    if filename.endswith(".m4a") or "mp4" in mime_type:
        return ".m4a"
    return ".webm"


def list_stale_files(temp_dir: Path, *, older_than_seconds: int, now: float) -> list[Path]:
    if not temp_dir.exists():
        return []
    stale_paths: list[Path] = []
    for entry in temp_dir.iterdir():
        if not entry.is_file():
            continue
        age = now - entry.stat().st_mtime
        if age >= older_than_seconds:
            stale_paths.append(entry)
    return stale_paths
