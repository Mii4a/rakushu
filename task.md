# Task

## Title
らくしゅうを案内制の初期β募集へ進めるため、期待値・対象入力・フィードバック運用・missing-item説明・launch checklist を整える

## Goal
少人数の guided private beta を安全に始められる状態まで、ユーザー向け文言と運用ドキュメントを揃える。課金込みの public beta ではなく、まずは「改善中であることを明示した案内制β」を成立させる。

## Scope for this task
1. β募集文の期待値を固定する
2. 初期βで受ける入力の範囲を明文化する
3. βフィードバック回収ループを運用化する
4. `本文未記載 / 要確認` の説明を主要画面で揃える
5. beta launch checklist を作る

## Non-goals
- Stripe live E2E の実施
- public beta の正式解禁
- parser sign-off policy の最終決定
- fallback の追加実装

## Deliverables
- updated `src/app/beta/page.tsx`
- updated `src/components/beta-intake-form.tsx`
- updated `src/components/job-create-form.tsx`
- updated `src/app/jobs/page.tsx`
- new reusable helper component(s) if needed under `src/components/`
- `docs/beta-user-ops.md`
- updated `docs/beta-intake-and-traction-spec.md`
- `docs/beta-feedback-review-loop.md`
- `docs/beta-launch-checklist.md`
- updated `implementation_plan.md`
- updated `walkthrough.md`

## Completion criteria
- βページに「改善中」「完全対応ではない」「困りごとの強い人から案内」の期待値が明記されている
- 初期βで受ける入力の強いケース / 弱いケース / 運営対応ルールが docs にまとまっている
- βフィードバックの weekly review 指標・定性バケット・エスカレーション先が docs にまとまっている
- 主要画面で `本文未記載` と `要確認` の意味が短く説明されている
- launch checklist が hard gate / soft gate / no-go を分けて記載している
- `npm test` と `npm run build` が green

## Current decision
- 今は self-serve public beta ではなく guided private beta を先に成立させる
- parser quality 論点は残っているが、初期β募集の直近ボトルネックは user-facing expectation と運用ルールの未整備
- thin-input / low-visibility row は「不具合扱いする前に、入力情報不足として説明する」運用を採る
