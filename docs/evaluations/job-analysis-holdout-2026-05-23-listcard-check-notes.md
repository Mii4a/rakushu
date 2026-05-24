# Job Analysis Holdout Sign-off Notes

## Review scope
- review_window: 2026-05-23 rerun batch
- total approved samples reviewed: 50
- corpus source: docs/evaluations/job-analysis-holdout-raw/approved

## Method
- seed manifest: docs/evaluations/job-analysis-holdout-2026-05-23-track2-check-scorecard.csv
- current parser: v1.6.0
- all 50 rows were re-parsed from approved raw-text holdout files
- source metadata (sample_id / job_id / analysis_id / source_shape / raw_text_origin_note) were inherited from the seed manifest
- rows with historical analysis_id keep observed feedback_saved from the seed manifest by default
- rows without historical analysis_id use current shouldCreateFeedback(report) as simulated feedback_saved
- therefore parser quality and feedback-loop quality should still be read as split evidence

## Observed vs simulated feedback evidence
- observed subset: 15 rows
  - feedback_expected: 11
  - feedback_saved: 4
  - recall: 36%
- simulated public subset: 35 rows
  - feedback_expected: 33
  - feedback_saved (simulated): 21
  - recall (simulated): 64%

## Dominant failure clusters
- too_many_unknown_critical_fields: 17
- benefits_suspected_but_not_extracted: 7
- salary_text_without_base_salary: 5
- negative_base_salary_detected: 2

## Verification suggestion
- npx --yes tsx scripts/rescore-job-analysis-holdout.ts --seed docs/evaluations/job-analysis-holdout-2026-05-23-track2-check-scorecard.csv --output-prefix docs/evaluations/job-analysis-holdout-2026-05-23-listcard-check --review-date 2026-05-23 --reviewer taro-bot
