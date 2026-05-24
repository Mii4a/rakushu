# Task

## Title
らくしゅう job-analysis feedback 追加の完成判定を、求人コピペ入力の実測ベースで確定する

## Goal
「feedback を追加した」だけで完成扱いにせず、実在求人のコピペ入力に対して十分な情報抽出と failure 回収ができているかを、holdout 50件の rubric で判定できる状態にする。

## Deliverables
- `fixtures/jobs/phase3-rekatsu-noisy-promo-010-anon.txt`
- `fixtures/jobs/phase3-rekatsu-noisy-promo-043-anon.txt`
- `fixtures/jobs/phase3-rekatsu-noisy-promo-044-anon.txt`
- updated `src/lib/analysis/parser.ts`
- updated `src/lib/analysis/parser.test.ts`
- Hermes cron job for nightly rakushu QA
- `scripts/rescore-job-analysis-holdout.ts`
- `docs/job-analysis-completion-criteria.md`
- `docs/evaluations/job-analysis-holdout-2026-05-23-v1.6.1-rerun-signoff-scorecard.csv`
- `docs/evaluations/job-analysis-holdout-2026-05-23-v1.6.1-rerun-signoff-summary.md`
- `docs/evaluations/job-analysis-holdout-2026-05-23-v1.6.1-rerun-signoff-notes.md`
- `docs/evaluations/job-analysis-holdout-2026-05-22-rerun-signoff-scorecard.csv`
- `docs/evaluations/job-analysis-holdout-2026-05-22-rerun-signoff-summary.md`
- `docs/evaluations/job-analysis-holdout-2026-05-22-rerun-signoff-notes.md`
- `docs/evaluations/job-analysis-holdout-2026-05-22-signoff-scorecard.csv`
- `docs/evaluations/job-analysis-holdout-2026-05-22-signoff-summary.md`
- `docs/evaluations/job-analysis-holdout-2026-05-22-signoff-notes.md`
- `implementation_plan.md`
- `walkthrough.md`

## Current verdict
- Final decision: FAIL
- Reason: dataset readiness は pass だが、product / critical-field / feedback(observed) の各 gate が未達。`job_board_listcard` は改善した一方で、`noisy_promo` / `company_careers` / `prose_heavy` の recurring failure が前面に出た

## Measured blockers
- A+B: 66%
- C: 17 / 50
- critical 3/4+ usable: 66%
- critical 4/4 usable: 38%
- observed feedback recall: 36% (4/11 observed saved-job subset)
- simulated public feedback recall: 64% (21/33 public rerun subset)
- high-signal fixture count: 19
- recurring common failures:
  - `too_many_unknown_critical_fields`
  - `benefits_suspected_but_not_extracted`
  - `salary_text_without_base_salary`

## Immediate targets
1. `holdout-candidate-035` を基準に、`company_careers` の C 判定が parser 責任か入力不足かを先に切り分ける
2. 入力不足寄りなら、quality / signoff 側で「薄い company-authored search card に generic critical-field gate をそのまま当てる妥当性」を整理する
3. Green 系 `company_careers` は、少なくとも `014` / `035` 代表行では input-insufficiency 寄りかを見極め、parser fix を急がない
4. Wantedly 系 `prose_heavy` の global prose fallback を強化する（候補: `holdout-candidate-047`, `049`）
5. `job_board_detail` に残る `salary_text_without_base_salary` 5件を narrow fix で削る
6. observed feedback recall を 80%以上へ上げる

## This turn
- `job_board_detail:salary_text_without_base_salary` に残っていた 5件（`004`, `026`, `030`, `032`, `034`）の raw text と parser / quality 出力を照合し、全件とも salaryText 自体は comparison-usable だが baseSalary 正規化だけが未完了な structured detail だと確認する
- `src/lib/analysis/quality.ts` の `needsBaseSalaryNormalization` を narrow に見直し、section / direct_label 由来の clean structured salary text は high-signal failure にしない
- fixture-backed tests と docs を更新し、Track 4 を締める
- Track 5 では `src/lib/analysis/feedback.ts` を新設して feedback insert payload を共通化し、`src/actions/job-actions.ts` の auto-save 条件を `evaluateParsedJobQuality` / `shouldCreateFeedback` と同一化した
- `quality.ts` / `quality.test.ts` に `bonus_count_unknown_with_keyword` と `retirement_allowance_unknown_with_keyword` を追加し、賞与・退職金の raw keyword があるのに unknown のケースを save-worthy feedback へ格上げした
- `scripts/rescore-job-analysis-holdout.ts` に `--observed-feedback-source manifest|db|simulate` を追加し、DB 実測ベースで observed feedback_saved を再採点できるようにした
- DB source で `docs/evaluations/job-analysis-holdout-2026-05-24-task5-db-check-{scorecard,summary,notes}` を再生成し、observed feedback recall が 3/10 (30%) のまま・public simulated recall が 22/30 (73%) であることを確認した
