# resume template path / CI repair

## Task
resume workbook export が参照する template path を、現在の repo 配置に合わせて修正し、同種の CI 再発を防ぐテストを追加する。

## Goal
- `buildResumeWorkbookFromTemplate` が repo 内の正しい template を読める
- 古い `UI_samples` 参照が残っていても当面はフォールバックできる
- template が両方に存在しない場合、調査しやすい明示的なエラーになる
- resume 関連の unit test が CI 上で再び赤くならない

## Scope
- `src/lib/resume/xlsx-template.server.ts`
- `src/lib/resume/xlsx-template.server.test.ts`
- 作業記録 (`task.md`, `implementation_plan.md`, `walkthrough.md`)

## Non-goals
- resume template の見た目変更
- 履歴書生成 UI の改修
- 本番デプロイ

## Notes
- 現在の tracked fixture は `UI-mock/resume/resume_template.xlsx`
- `UI_samples/resume/resume_template.xlsx` は現行ブランチ群では未追跡
