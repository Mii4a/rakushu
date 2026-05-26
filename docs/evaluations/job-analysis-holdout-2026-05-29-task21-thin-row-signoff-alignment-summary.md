# Job Analysis Holdout Review Summary

## Run metadata
- review_window: 2026-05-29 alignment pass
- reviewer: taro-bot
- scorecard_path: `docs/evaluations/job-analysis-holdout-2026-05-25-task19-bonus-secondary-alignment-scorecard.csv`
- notes_path: `docs/evaluations/job-analysis-holdout-2026-05-29-task21-thin-row-signoff-alignment-notes.md`
- completion_criteria_version: `docs/job-analysis-completion-criteria.md`
- signoff_checklist_path: `docs/evaluations/job-analysis-feedback-signoff-checklist.md`
- scope_note: metrics are inherited from the current task19 rerun scorecard; this pass re-interprets residual B/C rows under the thin-row rules without changing parser output or row grades

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
- dataset gate: pass

## Product-level result
- A: 25
- B: 11
- C: 14
- A+B: 72%
- trust-breaking C count: 0
- comparison_usable_yes: 36
- comparison_usable_no: 14
- product gate: fail
- interpretation: fail 主因は trust-breaking wrong ではなく、thin-input row が比較利用性を押し下げていること

## Critical field result
- 4/4 usable: 50%
- 3/4+ usable: 72%
- companyName wrong count: 0
- employmentType wrong count: 0
- salaryText wrong count: 0
- annualHolidays wrong count: 0
- total critical wrong present: 0 (0%)
- critical-field gate: fail
- interpretation: 4/4 usable を押し下げている主因は parser wrong ではなく、annual-holiday total を raw text が持たない thin rows と low-visibility prose / teaser rows

## Secondary field result
- benefits present_but_missed: 0
- housingAllowance present_but_missed: 0
- companyHousing present_but_missed: 0
- bonusCount present_but_missed: 0
- retirementAllowance present_but_missed: 0
- secondary-field gate: acceptable / review

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
- recurrence blocker: no

## Thin-row interpretation
- thin annual-holidays rows (numeric total absent in raw text, so not parser-miss-worthy by themselves):
  - `holdout-candidate-006`
  - `holdout-candidate-017`〜`024`
  - `holdout-candidate-038`
- mixed-signal / low-visibility rows:
  - `holdout-candidate-014`
  - `holdout-candidate-035`〜`039`
  - `holdout-candidate-040`〜`049`
- unresolved parser-miss-worthy rows to send back into a narrow parser fix queue: none in the current rerun
- already-fixed parser-miss-worthy holiday shorthand rows: `holdout-candidate-015`, `016`

## Feedback loop result
- current rerun open rows: 0/0
- latest observed DB-backed rerun: 3/3 saved (100%)
- current simulated public subset: 0/0
- save_miss: 0
- feedback gate interpretation: current sign-off fail は feedback loop 不備ではなく、open high-signal feedback row が残っていない状態

## Regression safety
- high-signal fixtures from feedback / holdout: 41 current anonymized fixture texts in `fixtures/jobs/`
- focused analysis regression: pass
- regression gate: pass

## Recommended parser fixes
- no new parser fix is justified from the current residual rows alone
- any future narrow parser fix should require raw-text-visible critical evidence, like the already-resolved `年休NN日` shorthand rows (`015`, `016`)

## Recommended sign-off / rubric fixes
- keep `annualHolidays` strict as a numeric critical field
- report thin annual-holidays rows separately from parser-miss-worthy rows
- treat `feedback_expected=0 / feedback_saved=0` as no-open-feedback-row, not as automatic recall fail

## Conclusion
- final decision: FAIL
- biggest remaining gap: thin-input rows still keep product gate (A+B 72%) and critical 4/4 usable gate (50%) below sign-off lines
- why it is not done yet: parser recurring blockers, secondary misses, and feedback-rule drift are mostly closed; remaining gap is sign-off interpretation for thin rows, not a clear new parser bug batch
- next review trigger: after thin-row handling is explicitly accepted or revised in the sign-off rubric, rerun the same 50-row review and confirm whether any residual row newly qualifies as parser-miss-worthy
