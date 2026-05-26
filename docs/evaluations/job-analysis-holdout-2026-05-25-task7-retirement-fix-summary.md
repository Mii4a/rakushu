# Job Analysis Holdout Review Summary

## Run metadata
- review_window: 2026-05-24 rerun batch
- reviewer: taro-bot
- scorecard_path: docs/evaluations/job-analysis-holdout-2026-05-25-task7-retirement-fix-scorecard.csv
- notes_path: docs/evaluations/job-analysis-holdout-2026-05-25-task7-retirement-fix-notes.md
- completion_criteria_version: `docs/job-analysis-completion-criteria.md`
- signoff_checklist_path: `docs/evaluations/job-analysis-feedback-signoff-checklist.md`
- scope_note: 50 approved holdout raw texts re-parsed with current parser v1.6.1; rows with historical analysis_id keep observed feedback_saved from database lookup while public-holdout rows use current shouldCreateFeedback simulation

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
- A: 18
- B: 18
- C: 14
- A+B: 72%
- trust-breaking C count: 0
- comparison_usable_yes: 36
- comparison_usable_no: 14
- product gate: fail

## Critical field result
- 4/4 usable: 42%
- 3/4+ usable: 72%
- companyName wrong count: 0
- employmentType wrong count: 0
- salaryText wrong count: 0
- annualHolidays wrong count: 0
- total critical wrong present: 0 (0%)
- critical-field gate: fail

## Secondary field result
- benefits present_but_missed: 4
- benefits wrong: 0
- housingAllowance present_but_missed: 0
- housingAllowance wrong: 0
- companyHousing present_but_missed: 0
- companyHousing wrong: 0
- bonusCount present_but_missed: 2
- bonusCount wrong: 0
- retirementAllowance present_but_missed: 0
- retirementAllowance wrong: 0
- absent-but-found summary: no strong secondary false-positive burst was detected in this rerun
- secondary-field gate: review

## Failure type result
- salary_text_without_base_salary: 0
- negative_base_salary_detected: 2
- company_name_suspected_platform_noise: 0
- benefits_suspected_but_not_extracted: 4
- too_many_unknown_critical_fields: 14
- summary_line_only_extraction: 1
- company_housing_unknown_with_keyword: 0
- housing_allowance_unknown_with_keyword: 0
- bonus_count_unknown_with_keyword: 2
- retirement_allowance_unknown_with_keyword: 0

## Recurrence / shape concentration
- same failure type recurring 3+ times in same shape: noisy_promo:too_many_unknown_critical_fields=5, prose_heavy:too_many_unknown_critical_fields=5, company_careers:too_many_unknown_critical_fields=4
- high-priority fixture backlog: 14
- most common failure class: `too_many_unknown_critical_fields` (14 / 50)
- recurrence blocker: yes

## company_careers split
- unknown-critical company_careers rows: 4
- thin-input rows: holdout-candidate-035, holdout-candidate-036, holdout-candidate-037, holdout-candidate-039
- parser-miss-worthy rows: none
- mixed-signal rows: none

## Feedback loop result
- feedback_expected: 31
- feedback_saved: 23
- recall: 74%
- noisy: 4
- noisy_rate: 17%
- save_miss: 8
- feedback gate: pass
- feedback evidence split:
  - observed saved-job subset: 6/6 (100%)
  - simulated public subset: 17/25 (68%)
  - current simulated all-row recall: 20/31 (65%)

## Regression safety
- high-signal fixtures from feedback: 28 current anonymized fixture texts in `fixtures/jobs/`
- regression gate: pass

## High-priority fixture candidates
- holdout-candidate-035: company_careers | thin-input company_careers row
- holdout-candidate-036: company_careers | thin-input company_careers row
- holdout-candidate-037: company_careers | thin-input company_careers row
- holdout-candidate-039: company_careers | thin-input company_careers row
- holdout-candidate-040: noisy_promo | too_many_unknown_critical_fields

## Recommended parser fixes
- company_careers shape は一括で parser fallback を広げず、Green search-card の thin-input row と parser-miss-worthy row を sign-off artifact 上で分離してから最小修正する
- prose_heavy shape で company / employment / salary / annualHolidays の global prose fallback を増やす

## Recommended feedback-rule fixes
- public holdout は simulation なので、current parser の observed feedback recall を測る rerun ingest path を別途用意する

## Conclusion
- final decision: FAIL
- biggest remaining gap: noisy_promo:too_many_unknown_critical_fields recurring 5 times
- why it is not done yet / why it is good enough: rerun parser quality is updated, but observed feedback evidence is still tied to historical saved analyses; judge parser improvements and feedback-loop improvements separately
- next review trigger: parser fixes + fixture additions + observed feedback rerun を揃えたあと、同じ 50件 rubric を再実行する
