# Job Analysis Holdout Review Summary

## Run metadata
- review_window:
- reviewer:
- scorecard_path:
- notes_path:
- completion_criteria_version: `docs/job-analysis-completion-criteria.md`
- signoff_checklist_path: `docs/evaluations/job-analysis-feedback-signoff-checklist.md`
- scope_note:

## Dataset
- total:
- unique_job_ids:
- shapes:
  - job_board_detail:
  - job_board_listcard:
  - company_careers:
  - prose_heavy:
  - noisy_promo:
  - other:
- high-risk shape total (`company_careers + prose_heavy + noisy_promo`):
- dominant shape ratio:
- dataset gate: pass / conditional / fail

## Cohort split
- official verdict cohort: full_cohort
- comparison_grade cohort:
- thin_input cohort:
- shadow comparison-grade decision:

## Product-level result
- A:
- B:
- C:
- A+B:
- trust-breaking C count:
- comparison_usable_yes:
- comparison_usable_no:
- product gate: pass / conditional / fail

## Critical field result
- 4/4 usable:
- 3/4+ usable:
- companyName wrong count:
- employmentType wrong count:
- salaryText wrong count:
- annualHolidays wrong count:
- total critical wrong present:
- critical-field gate: pass / conditional / fail

## Secondary field result
- benefits present_but_missed:
- benefits wrong:
- housingAllowance present_but_missed:
- housingAllowance wrong:
- companyHousing present_but_missed:
- companyHousing wrong:
- bonusCount present_but_missed:
- bonusCount wrong:
- retirementAllowance present_but_missed:
- retirementAllowance wrong:
- absent-but-found summary:
- secondary-field gate: pass / watch / blocking

## Failure type result
- salary_text_without_base_salary:
- benefits_suspected_but_not_extracted:
- too_many_unknown_critical_fields:
- summary_line_only_extraction:
- company_housing_unknown_with_keyword:
- housing_allowance_unknown_with_keyword:

## Recurrence / shape concentration
- same failure type recurring 3+ times in same shape:
- high-priority fixture backlog:
- new common failure class found repeatedly:
- recurrence blocker: yes / no

## Cohort decision read
- official full-cohort verdict:
- comparison-grade shadow verdict:
- thin-input shadow verdict:
- policy note: full-cohort verdict stays official unless criteria are explicitly revised

## Feedback loop result
- feedback_expected:
- feedback_saved:
- recall:
- noisy:
- noisy_rate:
- save_miss:
- feedback gate: pass / conditional / fail

## Regression safety
- high-signal fixtures from feedback:
- focused parser tests:
- full test suite:
- regression gate: pass / fail

## High-priority fixture candidates
- 
- 
- 

## Recommended parser fixes
- 
- 
- 

## Recommended feedback-rule fixes
- 
- 
- 

## Conclusion
- final decision: PASS / CONDITIONAL PASS / FAIL
- official policy frame: full-cohort verdict is source of truth
- shadow comparison-grade decision:
- biggest remaining gap:
- why it is not done yet / why it is good enough:
- next fixture candidates:
- next parser fixes:
- next review trigger:
