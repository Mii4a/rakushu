# walkthrough

## Manual review target
- Code path: `buildResumeWorkbookFromTemplate`
- Fixture: `/home/openclaw/rakushu/UI-mock/resume/resume_template.xlsx`

## What changed
- resume template の参照先を固定 1 パスから resolver 方式に変更
- 現行の `UI-mock` 配置を優先参照
- 旧 `UI_samples` 配置は互換フォールバックとして維持
- 両方無い場合に調査しやすいエラーメッセージを返す
- 再発防止の unit test を追加

## Validation checkpoints
- 現行 fixture で workbook 生成 test が通る
- TypeScript typecheck が通る
- lint は error なしで通る
- template 欠落時のエラーが checked paths を含む

## Validation commands
- `npm test -- --run src/lib/resume/xlsx-template.server.test.ts`
- `npm run typecheck`
- `npm run lint`

## Notes
- 今回の本質は fixture 欠落ではなく、コードの参照先 drift
- repo 上の tracked fixture は `UI-mock/resume/resume_template.xlsx`
