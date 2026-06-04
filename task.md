# dashboard UX / animation refinement

## Task
`/dashboard` に、見た目を壊さずに使いやすさを上げる UX と、やりすぎないアニメーションを追加する。

## Goal
- 最初に何をすればいいかが一目で分かる
- KPI / ToDo / おすすめ求人の視線誘導が自然になる
- hover / focus / enter animation が入っても、情報の読み取りを邪魔しない
- `prefers-reduced-motion` を尊重する
- 問題があれば dashboard 関連ファイルだけ即ロールバックできる

## Scope
- `src/components/dashboard/dashboard-mock-experience.tsx`
- `src/app/globals.css`
- 作業記録 (`task.md`, `implementation_plan.md`, `walkthrough.md`)

## Non-goals
- 求人解析ロジック変更
- DB / API 変更
- 本番デプロイ

## Rollback readiness
- 変更前バックアップ: `/home/openclaw/rakushu/.hermes/rollback/dashboard-ux-20260604-205459`
- 復元スクリプト: `/home/openclaw/rakushu/.hermes/rollback/dashboard-ux-20260604-205459/restore.sh`
- 戻す対象: `src/app/dashboard/page.tsx`, `src/components/dashboard/dashboard-mock-experience.tsx`, `src/components/dashboard-sidebar.tsx`, `src/app/globals.css`, `task.md`, `implementation_plan.md`, `walkthrough.md`
