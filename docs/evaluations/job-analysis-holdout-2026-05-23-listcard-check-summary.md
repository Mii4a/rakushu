# Job Analysis Holdout Review Summary

## Run metadata
- review_window: 2026-05-23 rerun batch
- reviewer: taro-bot
- scorecard_path: docs/evaluations/job-analysis-holdout-2026-05-23-listcard-check-scorecard.csv
- notes_path: docs/evaluations/job-analysis-holdout-2026-05-23-listcard-check-notes.md
- completion_criteria_version: `docs/job-analysis-completion-criteria.md`
- signoff_checklist_path: `docs/evaluations/job-analysis-feedback-signoff-checklist.md`
- scope_note: 50 approved holdout raw texts re-parsed with current parser v1.6.0; rows with historical analysis_id keep observed feedback_saved from manifest while public-holdout rows use current shouldCreateFeedback simulation

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
- A: 6
- B: 27
- C: 17
- A+B: 66%
- trust-breaking C count: 0
- comparison_usable_yes: 33
- comparison_usable_no: 17
- product gate: fail

## Critical field result
- 4/4 usable: 38%
- 3/4+ usable: 66%
- companyName wrong count: 0
- employmentType wrong count: 0
- salaryText wrong count: 0
- annualHolidays wrong count: 0
- total critical wrong present: 0 (0%)
- critical-field gate: fail

## Secondary field result
- benefits present_but_missed: 7
- benefits wrong: 0
- housingAllowance present_but_missed: 0
- housingAllowance wrong: 0
- companyHousing present_but_missed: 0
- companyHousing wrong: 0
- bonusCount present_but_missed: 2
- bonusCount wrong: 0
- retirementAllowance present_but_missed: 10
- retirementAllowance wrong: 0
- absent-but-found summary: no strong secondary false-positive burst was detected in this rerun
- secondary-field gate: review

## Failure type result
- salary_text_without_base_salary: 5
- negative_base_salary_detected: 2
- company_name_suspected_platform_noise: 0
- benefits_suspected_but_not_extracted: 7
- too_many_unknown_critical_fields: 17
- summary_line_only_extraction: 0
- company_housing_unknown_with_keyword: 0
- housing_allowance_unknown_with_keyword: 0

## Recurrence / shape concentration
- same failure type recurring 3+ times in same shape: noisy_promo:too_many_unknown_critical_fields=6, company_careers:too_many_unknown_critical_fields=6, job_board_detail:salary_text_without_base_salary=5, prose_heavy:too_many_unknown_critical_fields=5, prose_heavy:benefits_suspected_but_not_extracted=3
- high-priority fixture backlog: 17
- most common failure class: `too_many_unknown_critical_fields` (17 / 50)
- recurrence blocker: yes

## Feedback loop result
- feedback_expected: 44
- feedback_saved: 25
- recall: 57%
- noisy: 0
- noisy_rate: 0%
- save_miss: 19
- feedback gate: fail
- feedback evidence split:
  - observed saved-job subset: 4/11 (36%)
  - simulated public subset: 21/33 (64%)
  - current simulated all-row recall: 26/44 (59%)

## Regression safety
- high-signal fixtures from feedback: 16 current anonymized fixture texts in `fixtures/jobs/`
- regression gate: pass

## High-priority fixture candidates
- holdout-candidate-010: noisy_promo | too_many_unknown_critical_fields
- holdout-candidate-014: company_careers | too_many_unknown_critical_fields
- holdout-candidate-035: company_careers | too_many_unknown_critical_fields
- holdout-candidate-036: company_careers | too_many_unknown_critical_fields
- holdout-candidate-037: company_careers | too_many_unknown_critical_fields

## Recommended parser fixes
- company_careers / compressed company card shape で companyName・employmentType・salaryText の top-line fallback を強化する
- prose_heavy shape で company / employment / salary / annualHolidays の global prose fallback を増やす
- 福利厚生 prose 抽出の narrow fallback を追加し、benefits の空振りを減らす

## Recommended feedback-rule fixes
- observed saved-job subset で feedback_expected=yes なのに未保存の分析経路を優先調査する
- current parser rerun では save 条件を満たすが historical observed rows では未保存のケースを洗い出す
- public holdout は simulation なので、current parser の observed feedback recall を測る rerun ingest path を別途用意する

## Conclusion
- final decision: FAIL
- biggest remaining gap: noisy_promo:too_many_unknown_critical_fields recurring 6 times
- why it is not done yet / why it is good enough: rerun parser quality is updated, but observed feedback evidence is still tied to historical saved analyses; judge parser improvements and feedback-loop improvements separately
- next review trigger: parser fixes + fixture additions + observed feedback rerun を揃えたあと、同じ 50件 rubric を再実行する
