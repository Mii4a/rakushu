# Job Analysis Holdout Sign-off Notes

## Review scope
- review_window: 2026-05-25 rerun batch
- total approved samples reviewed: 50
- corpus source: docs/evaluations/job-analysis-holdout-raw/approved

## Method
- seed manifest: docs/evaluations/job-analysis-holdout-2026-05-25-task16-grok-reverify-scorecard.csv
- current parser: v1.6.2
- all 50 rows were re-parsed from approved raw-text holdout files
- source metadata (sample_id / job_id / analysis_id / source_shape / raw_text_origin_note) were inherited from the seed manifest
- rows with historical analysis_id keep observed feedback_saved from current shouldCreateFeedback simulation by default
- rows without historical analysis_id use current shouldCreateFeedback(report) as simulated feedback_saved
- therefore parser quality and feedback-loop quality should still be read as split evidence

## Observed vs simulated feedback evidence
- observed subset: 15 rows
  - feedback_expected: 0
  - feedback_saved: 0
  - recall: 0%
- simulated public subset: 35 rows
  - feedback_expected: 0
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

## Verification suggestion
- ./node_modules/.bin/tsx scripts/rescore-job-analysis-holdout.ts --seed docs/evaluations/job-analysis-holdout-2026-05-25-task16-grok-reverify-scorecard.csv --output-prefix docs/evaluations/job-analysis-holdout-2026-05-25-task19-bonus-secondary-alignment --review-date 2026-05-25 --reviewer taro-bot --observed-feedback-source simulate
