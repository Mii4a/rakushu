# Job Analysis Holdout Review Summary

## Run metadata
- review_window: 2026-05-22 sign-off batch
- reviewer: taro-bot
- scorecard_path: docs/evaluations/job-analysis-holdout-2026-05-22-signoff-scorecard.csv
- notes_path: docs/evaluations/job-analysis-holdout-2026-05-22-signoff-notes.md
- completion_criteria_version: `docs/job-analysis-completion-criteria.md`
- signoff_checklist_path: `docs/evaluations/job-analysis-feedback-signoff-checklist.md`
- scope_note: 50 approved holdout raw texts reviewed; saved-job subset keeps observed feedback evidence, public-web subset uses parser rerun with simulated feedback-save behavior

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
- B: 24
- C: 20
- A+B: 60%
- trust-breaking C count: 5
- comparison_usable_yes: 30
- comparison_usable_no: 20
- product gate: fail

## Critical field result
- 4/4 usable: 34%
- 3/4+ usable: 62%
- companyName wrong count: 1
- employmentType wrong count: 0
- salaryText wrong count: 4
- annualHolidays wrong count: 0
- total critical wrong present: 5 (10%)
- critical-field gate: fail

## Secondary field result
- benefits present_but_missed: 7
- benefits wrong: 0
- housingAllowance present_but_missed: 2
- housingAllowance wrong: 0
- companyHousing present_but_missed: 0
- companyHousing wrong: 0
- bonusCount present_but_missed: 4
- bonusCount wrong: 0
- retirementAllowance present_but_missed: 10
- retirementAllowance wrong: 0
- absent-but-found summary: no strong false-positive burst was detected in this pass, but salary/company critical wrongs remain
- secondary-field gate: blocking

## Failure type result
- salary_text_without_base_salary: 18
- benefits_suspected_but_not_extracted: 7
- too_many_unknown_critical_fields: 26
- summary_line_only_extraction: 0
- company_housing_unknown_with_keyword: 0
- housing_allowance_unknown_with_keyword: 2

## Recurrence / shape concentration
- same failure type recurring 3+ times in same shape: prose_heavy:too_many_unknown_critical_fields=5, prose_heavy:benefits_suspected_but_not_extracted=3, job_board_detail:salary_text_without_base_salary=5, noisy_promo:too_many_unknown_critical_fields=6, noisy_promo:salary_text_without_base_salary=5, company_careers:too_many_unknown_critical_fields=6, job_board_listcard:too_many_unknown_critical_fields=9, job_board_listcard:salary_text_without_base_salary=7
- high-priority fixture backlog: 28
- new common failure class found repeatedly: `too_many_unknown_critical_fields` across company_careers / prose_heavy / noisy_promo
- recurrence blocker: yes

## Feedback loop result
- feedback_expected: 40
- feedback_saved: 33
- recall: 82%
- noisy: 0
- noisy_rate: 0%
- save_miss: 7
- feedback gate: fail
- feedback evidence split:
  - observed saved-job subset: 4/7 (57%)
  - simulated public subset: 29/33 (88%)

## Regression safety
- high-signal fixtures from feedback: 9 current anonymized fixture texts in `fixtures/jobs/`
- focused parser tests: pass (`npm test -- src/lib/analysis/quality.test.ts src/lib/analysis/parser.test.ts`)
- full test suite: pass (`npm test`)
- regression gate: fail

## High-priority fixture candidates
- holdout-candidate-003: noisy_promo | companyName polluted by platform text
- holdout-candidate-010: noisy_promo | too_many_unknown_critical_fields
- holdout-candidate-015: job_board_listcard | too_many_unknown_critical_fields
- holdout-candidate-035: company_careers | too_many_unknown_critical_fields
- holdout-candidate-040: noisy_promo | critical wrong: salaryText

## Recommended parser fixes
- company_careers / Green card shape で `companyName` / `employmentType` / `salaryText` を top-line compressed prose から取る narrow fallback を追加する
- noisy_promo / Green detail shape で CTA 文言 (`年収、選考プロセスなどをご覧いただくには`) を salary と誤認しない guardrail を入れる
- Wantedly prose-heavy shape で company / employment / salary / annualHolidays の global prose fallback を増やし、`too_many_unknown_critical_fields` を先に減らす

## Recommended feedback-rule fixes
- observed saved-job subset の feedback recall が 57% なので、historical saved-analysis で `feedback_expected=yes` なのに未保存の経路を優先確認する
- `salary_text_without_base_salary` と company-name pollution のような high-signal failure が未保存になる条件差を洗う
- public holdout を内部 review queue に流せる ingest path を作り、simulation ではなく observed feedback evidence で再採点する

## Conclusion
- final decision: FAIL
- biggest remaining gap: company_careers / prose_heavy / noisy_promo で `too_many_unknown_critical_fields` が多発し、product usability が A+B 60% まで落ちている
- why it is not done yet / why it is good enough: dataset readiness は満たしたが、product gate / critical-field gate / feedback gate (observed) / regression gate が未達。特に 50件中 20件が C で、common shape の recurring failure を long-tail と呼べる段階ではない
- next fixture candidates: holdout-candidate-035, holdout-candidate-040, holdout-candidate-045, holdout-candidate-047, holdout-candidate-049
- next parser fixes: Green company-authored cards, Green noisy promo detail, Wantedly prose-heavy project pages
- next review trigger: 上記 3 shape を fixture-backed hardeningし、high-signal fixture 数を 10件以上にしたうえで同じ 50件 rubric を再実行する
