# Job Analysis Holdout Sign-off Notes

## Review scope
- review_window: 2026-05-29 rerun batch
- total approved samples reviewed: 50
- corpus source: docs/evaluations/job-analysis-holdout-raw/approved

## Method
- seed manifest: docs/evaluations/job-analysis-holdout-2026-05-27-task14-summary-line-only-v1-scorecard.csv
- current parser: v1.6.1
- all 50 rows were re-parsed from approved raw-text holdout files
- source metadata (sample_id / job_id / analysis_id / source_shape / raw_text_origin_note) were inherited from the seed manifest
- rows with historical analysis_id keep observed feedback_saved from current shouldCreateFeedback simulation by default
- rows without historical analysis_id use current shouldCreateFeedback(report) as simulated feedback_saved
- therefore parser quality and feedback-loop quality should still be read as split evidence

## Observed vs simulated feedback evidence
- observed subset: 15 rows
  - feedback_expected: 3
  - feedback_saved: 3
  - recall: 100%
- simulated public subset: 35 rows
  - feedback_expected: 11
  - feedback_saved (simulated): 0
  - recall (simulated): 0%

## Dominant failure clusters
- none

## Shape interpretation note
- company_careers rows, especially Green-style search cards, must be split into thin-input vs parser-miss-worthy before they are used to justify parser fallback expansion.
- thin-input rows in this rerun: none
- parser-miss-worthy rows in this rerun: none
- mixed-signal rows in this rerun: none
- If companyName / salaryText are visible but employmentType / annualHolidays are absent from raw text, treat that row as thin-input evidence first.
- Only rows with missing critical fields that are visibly present in raw text should be used as parser-miss-worthy evidence.

## Task16 row-level reclassification proposal
- keep `feedback_expected=yes` only for rows where the missing critical field is visibly present in raw text and the miss is directly actionable.
- reclassify rows with only generic holiday-style signals (`完全週休2日`, `土日祝休み`) but no explicit annual-holiday count/value to `feedback_expected=no`.

### Candidate buckets
- parser-miss-worthy (`feedback_expected=yes`候補)
  - `holdout-candidate-015`: title line に `年休124日` が visible なのに `annualHolidays=unknown`
  - `holdout-candidate-016`: title / body line に `年休125日` が visible なのに `annualHolidays=unknown`
- likely no-feedback (`feedback_expected=no`候補)
  - `holdout-candidate-017`〜`020`, `022`〜`024`: `完全週休2日` は visible だが annual-holiday count は raw text に見えない
  - `holdout-candidate-021`: `土日祝休み` は visible だが annual-holiday count は raw text に見えない
  - `holdout-candidate-049`: `完全週休2日制` は visible だが employmentType / salaryText / annualHolidays の recoverable raw signal が足りない prose-heavy row

## Suggested next fix
- `015` / `016` は listcard title / teaser に出る `年休NN日` を `annualHolidays` へ正規化できるか、parser fixture と focused test で切り出して確認する。
- それ以外の 9件は current `shouldCreateFeedback()` と rubric を揃え、public simulated denominator から外す候補として扱う。

## Postfix outcome (2026-05-29)
- `parser.ts` に listcard / teaser line 向け `年休NN日` shorthand fallback を追加し、`holdout-candidate-015` / `016` の `annualHolidays` miss を focused regression test で固定した。
- `scripts/rescore-job-analysis-holdout.ts` には generic holiday signal 単独では `feedback_expected=yes` にしない narrow rule と、story-title `インターン` を employment visible signal に数えない noise guard を追加した。
- postfix rerun: `docs/evaluations/job-analysis-holdout-2026-05-29-task16-postfix-{scorecard,summary,notes}`
  - simulated public subset: `feedback_expected=0 / feedback_saved=0`
  - remaining `feedback_expected=yes`: observed subset の `holdout-bootstrap-001`, `holdout-candidate-012` のみ
- したがって Task 16 の public simulated residual は、この postfix rerun で解消したと判断してよい。

## Verification suggestion
- ./node_modules/.bin/tsx scripts/rescore-job-analysis-holdout.ts --seed docs/evaluations/job-analysis-holdout-2026-05-27-task14-summary-line-only-v1-scorecard.csv --output-prefix docs/evaluations/job-analysis-holdout-2026-05-29-task16-recheck --review-date 2026-05-29 --reviewer taro-bot --observed-feedback-source simulate
