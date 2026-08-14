from pathlib import Path

from app.cleanup import cleanup_stale_audio


def test_cleanup_stale_audio_deletes_only_old_files(tmp_path: Path):
    stale_file = tmp_path / "old.webm"
    stale_file.write_bytes(b"old")
    fresh_file = tmp_path / "new.webm"
    fresh_file.write_bytes(b"new")

    old_now = 1_000.0
    stale_mtime = old_now - 601
    fresh_mtime = old_now - 120

    stale_file.touch()
    fresh_file.touch()

    import os

    os.utime(stale_file, (stale_mtime, stale_mtime))
    os.utime(fresh_file, (fresh_mtime, fresh_mtime))

    summary = cleanup_stale_audio(tmp_path, older_than_seconds=600, now=old_now)

    assert summary == {"deleted": 1, "failed": 0}
    assert not stale_file.exists()
    assert fresh_file.exists()
