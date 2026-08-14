from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

from .config import get_settings
from .storage import delete_temp_audio, list_stale_files


def cleanup_stale_audio(temp_dir: Path, *, older_than_seconds: int, now: float | None = None) -> dict[str, int]:
    current_time = now if now is not None else time.time()
    deleted = 0
    failed = 0
    for path in list_stale_files(temp_dir, older_than_seconds=older_than_seconds, now=current_time):
        outcome = delete_temp_audio(path)
        if outcome == "deleted":
            deleted += 1
        elif outcome == "failed":
            failed += 1
    return {"deleted": deleted, "failed": failed}


def build_cleanup_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Delete stale private AI interview audio files")
    parser.add_argument(
        "--older-than-seconds",
        type=int,
        default=15 * 60,
        help="Delete temp audio files older than this many seconds (default: 900)",
    )
    parser.add_argument(
        "--temp-dir",
        type=Path,
        default=None,
        help="Override the temp directory. Defaults to AI_INTERVIEW_TRANSCRIBER_TEMP_DIR.",
    )
    return parser


def main() -> int:
    parser = build_cleanup_parser()
    args = parser.parse_args()
    settings = get_settings()
    temp_dir = args.temp_dir or settings.temp_dir
    summary = cleanup_stale_audio(temp_dir, older_than_seconds=args.older_than_seconds)
    print(
        json.dumps(
            {
                "tempDir": str(temp_dir),
                "olderThanSeconds": args.older_than_seconds,
                **summary,
            },
            ensure_ascii=False,
        )
    )
    return 0 if summary["failed"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
