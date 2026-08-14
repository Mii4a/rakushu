from __future__ import annotations

from pydantic import BaseModel


class CallbackPayload(BaseModel):
    recordingSessionId: str
    status: str
    modelName: str
    languageCode: str
    rawTranscriptText: str | None = None
    normalizedTranscriptText: str | None = None
    tempObjectKey: str | None = None
    startedAt: str | None = None
    finishedAt: str | None = None
    deleteOutcome: str | None = None
    deleteActor: str | None = None
    deleteDetailCode: str | None = None
    errorCode: str | None = None
    errorMessage: str | None = None
    segments: list[dict] = []
