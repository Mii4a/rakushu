# Job Analysis Holdout Review Summary

## Run metadata
- review_window: 2026-05-22 trial batch
- reviewer: taro-bot
- scorecard_path: docs/evaluations/job-analysis-holdout-2026-05-22-trial-scorecard.csv
- notes_path: docs/evaluations/job-analysis-holdout-2026-05-22-trial-notes.md
- completion_criteria_version: docs/job-analysis-completion-criteria.md
- scope_note: local saved analyses first; supplemented with one unparsed saved job because only 9 analyzable rows existed locally

## Dataset
- total: 10
- unique_job_ids: 7
- shapes:
  - job_board_detail: 1
  - job_board_listcard: 3
  - company_careers: 0
  - prose_heavy: 4
  - noisy_promo: 0
  - other: 2

## Product-level result
- A: 0
- B: 5
- C: 5
- A+B: 50%
- comparison_usable_yes: 5
- comparison_usable_no: 5

## Critical field result
- 4/4 usable: 30%
- 3/4+ usable: 50%
- companyName wrong count: 0
- employmentType wrong count: 0
- salaryText wrong count: 0
- annualHolidays wrong count: 0
- total critical wrong present: 0

## Secondary field result
- benefits present_but_missed: 0
- benefits wrong: 0
- housingAllowance present_but_missed: 1
- housingAllowance wrong: 0
- companyHousing present_but_missed: 0
- companyHousing wrong: 0
- bonusCount present_but_missed: 4
- bonusCount wrong: 0
- retirementAllowance present_but_missed: 1
- retirementAllowance wrong: 0

## Failure type result
- salary_text_without_base_salary: 6
- benefits_suspected_but_not_extracted: 0
- too_many_unknown_critical_fields: 5
- summary_line_only_extraction: 0
- company_housing_unknown_with_keyword: 0
- housing_allowance_unknown_with_keyword: 1

## Feedback loop result
- feedback_expected: 9
- feedback_saved: 1
- recall: 11%
- noisy: 0
- save_miss: 8

## High-priority fixture candidates
- trial-002: too-many-unknown-critical-fields
- trial-003: salary-text-without-base-salary
- trial-004: salary-text-without-base-salary
- trial-005: salary-text-without-base-salary
- trial-006: salary-text-without-base-salary

## Recommended parser fixes
- trial-010: no analysis snapshot available

## Recommended feedback-rule fixes
- trial-002: too_many_unknown_critical_fields
- trial-003: salary_text_without_base_salary
- trial-004: salary_text_without_base_salary
- trial-005: salary_text_without_base_salary
- trial-006: salary_text_without_base_salary | too_many_unknown_critical_fields

## Conclusion
- provisional decision: trial only / not full holdout pass-fail
- biggest remaining gap: only 7 unique local jobs are available, so this batch is useful for scorecard shakeout but not for completion sign-off
- why it is not done yet / why it is good enough: enough to validate columns, identifiers, duplicate handling, and feedback linkage; not enough for final holdout judgment
- next fixture candidates: trial-002, trial-003, trial-004, trial-005, trial-006
- next parser fixes: trial-010
- next review trigger: once 10+ new unique pasted jobs are available, rerun with unique raw texts only
