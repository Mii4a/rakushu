from __future__ import annotations

import asyncio
from datetime import datetime, timezone

import httpx
from fastapi import BackgroundTasks, FastAPI, File, Form, Header, HTTPException, UploadFile

from .config import get_settings
from .models import CallbackPayload
from .storage import delete_temp_audio, persist_temp_audio, pick_suffix
from .transcribe import transcribe_audio_file

app = FastAPI(title="Rakushu AI Interview Transcriber")
settings = get_settings()


async def post_callback(callback_url: str, callback_secret: str, payload: CallbackPayload) -> None:
    async with httpx.AsyncClient(timeout=settings.callback_timeout_seconds) as client:
        response = await client.post(
            callback_url,
            headers={"x-ai-interview-callback-secret": callback_secret},
            json=payload.model_dump(mode="json", exclude_none=True)
        )
        response.raise_for_status()


async def run_transcription_job(
    *,
    recording_session_id: str,
    callback_url: str,
    callback_secret: str,
    temp_object_key: str,
    temp_path,
) -> None:
    started_at = datetime.now(timezone.utc)
    print(f"[transcriber] job_started recording_session_id={recording_session_id} temp_path={temp_path}", flush=True)
    try:
        result = await asyncio.to_thread(
            transcribe_audio_file,
            temp_path,
            model_name=settings.transcription_model,
            language_code=settings.transcription_language,
        )
        print(
            f"[transcriber] transcribe_succeeded recording_session_id={recording_session_id} text_len={len(result['raw_transcript_text'])}",
            flush=True,
        )
        delete_outcome = delete_temp_audio(temp_path)
        payload = CallbackPayload(
            recordingSessionId=recording_session_id,
            status="succeeded",
            modelName=result["model_name"],
            languageCode=result["language_code"],
            rawTranscriptText=result["raw_transcript_text"],
            normalizedTranscriptText=result["normalized_transcript_text"],
            tempObjectKey=temp_object_key,
            startedAt=started_at.isoformat(),
            finishedAt=datetime.now(timezone.utc).isoformat(),
            deleteOutcome=delete_outcome,
            deleteActor="transcriber_finally",
            segments=result["segments"],
        )
    except Exception as error:  # noqa: BLE001
        print(f"[transcriber] transcribe_failed recording_session_id={recording_session_id} error={error}", flush=True)
        delete_outcome = delete_temp_audio(temp_path)
        payload = CallbackPayload(
            recordingSessionId=recording_session_id,
            status="failed",
            modelName=settings.transcription_model,
            languageCode=settings.transcription_language,
            tempObjectKey=temp_object_key,
            startedAt=started_at.isoformat(),
            finishedAt=datetime.now(timezone.utc).isoformat(),
            deleteOutcome=delete_outcome,
            deleteActor="transcriber_finally",
            errorCode="transcription_failed",
            errorMessage=str(error),
            segments=[],
        )

    try:
        await post_callback(callback_url, callback_secret, payload)
        print(
            f"[transcriber] callback_succeeded recording_session_id={recording_session_id} status={payload.status}",
            flush=True,
        )
    except Exception as error:  # noqa: BLE001
        print(f"[transcriber] callback_failed recording_session_id={recording_session_id} error={error}", flush=True)
        raise


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/transcriptions")
async def create_transcription(
    background_tasks: BackgroundTasks,
    recordingSessionId: str = Form(...),
    questionId: str = Form(...),
    mimeType: str = Form(...),
    durationMs: int = Form(...),
    byteSize: int = Form(...),
    callbackUrl: str = Form(...),
    callbackSecret: str = Form(...),
    audio: UploadFile = File(...),
    authorization: str | None = Header(default=None),
) -> dict[str, str | None]:
    if authorization != f"Bearer {settings.service_token}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    if byteSize > settings.max_audio_bytes:
        raise HTTPException(status_code=400, detail="Audio file too large")

    content = await audio.read()
    if len(content) > settings.max_audio_bytes:
        raise HTTPException(status_code=400, detail="Audio file too large")

    stored_audio = persist_temp_audio(
        temp_dir=settings.temp_dir,
        suffix=pick_suffix(audio.filename or "answer.webm", mimeType),
        content=content,
    )

    background_tasks.add_task(
      run_transcription_job,
      recording_session_id=recordingSessionId,
      callback_url=callbackUrl,
      callback_secret=callbackSecret,
      temp_object_key=stored_audio.temp_object_key,
      temp_path=stored_audio.temp_path,
    )

    return {"recordingSessionId": recordingSessionId, "tempObjectKey": stored_audio.temp_object_key, "questionId": questionId, "durationMs": str(durationMs)}
