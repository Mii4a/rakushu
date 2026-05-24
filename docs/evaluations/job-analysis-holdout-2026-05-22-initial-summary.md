# Job Analysis Holdout Review Summary

## Run metadata
- review_window: 2026-05-22 initial bootstrap batch
- reviewer: taro-bot
- scorecard_path: docs/evaluations/job-analysis-holdout-2026-05-22-initial-scorecard.csv
- notes_path: docs/evaluations/job-analysis-holdout-2026-05-22-initial-notes.md
- completion_criteria_version: docs/job-analysis-completion-criteria.md
- scope_note: initial formal review over currently available 14 unique saved jobs; useful for starting the real holdout process but not enough for 50-sample sign-off

## Dataset
- total: 14
- unique_job_ids: 14
- shapes:
  - job_board_detail: 9
  - job_board_listcard: 0
  - company_careers: 1
  - prose_heavy: 1
  - noisy_promo: 3
  - other: 0

## Product-level result
- A: 4
- B: 7
- C: 3
- A+B: 79%
- comparison_usable_yes: 11
- comparison_usable_no: 3

## Critical field result
- 4/4 usable: 50%
- 3/4+ usable: 86%
- companyName wrong count: 1
- employmentType wrong count: 0
- salaryText wrong count: 0
- annualHolidays wrong count: 0
- total critical wrong present: 1

## Secondary field result
- benefits present_but_missed: 0
- benefits wrong: 0
- housingAllowance present_but_missed: 1
- housingAllowance wrong: 0
- companyHousing present_but_missed: 0
- companyHousing wrong: 0
- bonusCount present_but_missed: 3
- bonusCount wrong: 0
- retirementAllowance present_but_missed: 5
- retirementAllowance wrong: 0

## Failure type result
- salary_text_without_base_salary: 2
- benefits_suspected_but_not_extracted: 0
- too_many_unknown_critical_fields: 2
- summary_line_only_extraction: 0
- company_housing_unknown_with_keyword: 0
- housing_allowance_unknown_with_keyword: 1

## Feedback loop result
- feedback_expected: 6
- feedback_saved: 3
- recall: 50%
- noisy: 0
- save_miss: 3

## High-priority fixture candidates
- initial-003: companyName polluted by platform text
- initial-004: salary-text-without-base-salary
- initial-010: noisy-promo-critical-fields
- initial-014: salary-text-without-base-salary

## Recommended parser fixes
- initial-010: too_many_unknown_critical_fields

## Recommended feedback-rule fixes
- initial-003: companyName polluted by platform text
- initial-011: secondary field misses only
- initial-014: salary_text_without_base_salary | too_many_unknown_critical_fields

## Conclusion
- provisional decision: bootstrap review only / not full 50-sample pass-fail
- biggest remaining gap: only 14 approved saved jobs are in the batch and source-shape balance is still heavily skewed toward detail pages
- why it is not done yet / why it is good enough: enough to start the real holdout operating loop, produce approved raw-text files, and expose current parser/feedback gaps; not enough for completion sign-off under the documented 50-sample rule
- next fixture candidates: initial-003, initial-004, initial-010
- next parser fixes: initial-010
- next review trigger: after collecting at least 36 more approved samples with real list-card and company-careers coverage, rerun the scorecard on the expanded batch
