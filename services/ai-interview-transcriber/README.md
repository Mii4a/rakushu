# AI interview transcriber service

このディレクトリは、`/ai-interview` の音声回答を `faster-whisper` で文字起こしするための private Python service です。

役割:
- Next.js 側から内部認証つきで音声を受け取る
- 一時ディレクトリに private に保存する
- 文字起こし後に Next.js の callback endpoint へ結果を返す
- 成功/失敗どちらでも temp audio を削除する
- stale temp file を cleanup コマンドで削除する

必要な環境変数:
- `AI_INTERVIEW_TRANSCRIBER_SECRET`
- `AI_INTERVIEW_TRANSCRIBER_TEMP_DIR` (default: `/tmp/rakushu-ai-interview`)
- `AI_INTERVIEW_CALLBACK_TIMEOUT_SECONDS` (default: `30`)
- `AI_INTERVIEW_TRANSCRIBER_MODEL` (default: `large-v3-turbo`)
- `AI_INTERVIEW_TRANSCRIBER_LANGUAGE` (default: `ja`)
- `AI_INTERVIEW_TRANSCRIBER_MAX_AUDIO_BYTES` (default: `8388608`)

ローカル起動:
```bash
cd /home/openclaw/rakushu
./scripts/start-ai-interview-transcriber.sh
```

手動で直接起動する場合:
```bash
cd /home/openclaw/rakushu/services/ai-interview-transcriber
set -a && source /home/openclaw/rakushu/.env.local && set +a
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 18080
```

起動確認:
```bash
curl http://127.0.0.1:18080/health
```

テスト:
```bash
cd services/ai-interview-transcriber
uv run pytest tests -q
```

stale temp audio cleanup:
```bash
cd services/ai-interview-transcriber
uv run python -m app.cleanup --older-than-seconds 900
```

出力は JSON です。`failed > 0` のときは exit code 1 を返します。
