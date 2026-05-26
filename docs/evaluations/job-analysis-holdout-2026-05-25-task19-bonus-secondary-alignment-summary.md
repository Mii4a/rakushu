# Job Analysis Holdout Review Summary

## Run metadata
- review_window: 2026-05-25 rerun batch
- reviewer: taro-bot
- scorecard_path: docs/evaluations/job-analysis-holdout-2026-05-25-task19-bonus-secondary-alignment-scorecard.csv
- notes_path: docs/evaluations/job-analysis-holdout-2026-05-25-task19-bonus-secondary-alignment-notes.md
- completion_criteria_version: `docs/job-analysis-completion-criteria.md`
- signoff_checklist_path: `docs/evaluations/job-analysis-feedback-signoff-checklist.md`
- scope_note: 50 approved holdout raw texts re-parsed with current parser v1.6.2; rows with historical analysis_id keep observed feedback_saved from current shouldCreateFeedback simulation while public-holdout rows use current shouldCreateFeedback simulation

## Dataset
- total: 50
- unique_job_ids: 15 saved internal jobs + 35 external public holdout captures
- shapes:
  - job_board_detail: 19
  - job_board_listcard: 10
  - company_careers: 6
  - prose_heavy: 7
  - noisy_promo: 8
  - other: 0
- high-risk shape total (`company_careers + prose_heavy + noisy_promo`): 21 (42%)
- dominant shape ratio: job_board_detail 19/50 (38%)
- dataset gate: pass (recommended mix also pass)

## Product-level result
- A: 25
- B: 11
- C: 14
- A+B: 72%
- trust-breaking C count: 0
- comparison_usable_yes: 36
- comparison_usable_no: 14
- product gate: fail

## Critical field result
- 4/4 usable: 50%
- 3/4+ usable: 72%
- companyName wrong count: 0
- employmentType wrong count: 0
- salaryText wrong count: 0
- annualHolidays wrong count: 0
- total critical wrong present: 0 (0%)
- critical-field gate: fail

## Secondary field result
- benefits present_but_missed: 0
- benefits wrong: 0
- housingAllowance present_but_missed: 0
- housingAllowance wrong: 0
- companyHousing present_but_missed: 0
- companyHousing wrong: 0
- bonusCount present_but_missed: 0
- bonusCount wrong: 0
- retirementAllowance present_but_missed: 0
- retirementAllowance wrong: 0
- absent-but-found summary: no strong secondary false-positive burst was detected in this rerun
- secondary-field gate: review

## Failure type result
- salary_text_without_base_salary: 0
- negative_base_salary_detected: 0
- company_name_suspected_platform_noise: 0
- benefits_suspected_but_not_extracted: 0
- too_many_unknown_critical_fields: 0
- summary_line_only_extraction: 0
- company_housing_unknown_with_keyword: 0
- housing_allowance_unknown_with_keyword: 0
- bonus_count_unknown_with_keyword: 0
- retirement_allowance_unknown_with_keyword: 0

## Recurrence / shape concentration
- same failure type recurring 3+ times in same shape: none
- high-priority fixture backlog: 14
- most common failure class: `salary_text_without_base_salary` (0 / 50)
- recurrence blocker: no

## company_careers split
- unknown-critical company_careers rows: 0
- thin-input rows: none
- parser-miss-worthy rows: none
- mixed-signal rows: none

## Feedback loop result
- feedback_expected: 0
- feedback_saved: 0
- recall: 0%
- noisy: 0
- noisy_rate: 0%
- save_miss: 0
- feedback gate: fail
- feedback evidence split:
  - observed saved-job subset: 0/0 (0%)
  - simulated public subset: 0/0 (0%)
  - current simulated all-row recall: 0/0 (0%)

## Regression safety
- high-signal fixtures from feedback: 41 current anonymized fixture texts in `fixtures/jobs/`
- regression gate: pass

## High-priority fixture candidates
- holdout-candidate-035: company_careers | thin-input company_careers row
- holdout-candidate-036: company_careers | thin-input company_careers row
- holdout-candidate-037: company_careers | thin-input company_careers row
- holdout-candidate-039: company_careers | thin-input company_careers row
- holdout-candidate-040: noisy_promo | thin-input noisy_promo row

## Recommended parser fixes
- recurring cluster を追加で確認し、dominant shape の parser miss から順に fixture-backed hardening する

## Recommended feedback-rule fixes
- public holdout は simulation なので、current parser の observed feedback recall を測る rerun ingest path を別途用意する

## Conclusion
- final decision: FAIL
- biggest remaining gap: feedback / regression evidence refresh
- why it is not done yet / why it is good enough: rerun parser quality is updated, but observed feedback evidence is still tied to historical saved analyses; judge parser improvements and feedback-loop improvements separately
- next review trigger: parser fixes + fixture additions + observed feedback rerun を揃えたあと、同じ 50件 rubric を再実行する
