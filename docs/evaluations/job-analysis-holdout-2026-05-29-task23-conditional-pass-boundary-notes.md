# Job Analysis Holdout Conditional-pass Boundary Notes

## Scope
- seed scorecard: `docs/evaluations/job-analysis-holdout-2026-05-25-task19-bonus-secondary-alignment-scorecard.csv`
- purpose: check whether the thin-row rules adopted in Task 22 are sufficient to upgrade the sign-off verdict

## Boundary calculation used in this pass
### Full cohort
- 50 rows
- A/B/C = 25 / 11 / 14
- A+B = 72%
- critical 4/4 usable = 50%

### Thin annual-holidays rows
- `holdout-candidate-006`
- `holdout-candidate-017`〜`024`
- `holdout-candidate-038`
- count = 10
- all 10 rows are:
  - overall grade `B`
  - `critical_usable_count=3`
  - `comparison_usable=yes`
  - `annualHolidays=miss`

### Mixed-signal / low-visibility residual rows
- `holdout-candidate-014`
- `holdout-candidate-035`〜`039`
- `holdout-candidate-040`〜`049`
- count = 16
- grade split:
  - B = 2 (`014`, `038`)
  - C = 14 (`035`〜`037`, `039`〜`049`)

## Main finding
- The current sign-off gap is not just “strict annual-holiday math is too harsh.”
- Even after separating thin annual-holidays rows from parser-miss-worthy evidence, the scorecard still contains 14 low-visibility C rows.
- That means the current full-cohort fail is still real.

## What *is* true after this pass
- recurring parser-quality blockers are no longer the main reason for failure
- observed/simulated feedback drift is no longer the main reason for failure
- unresolved narrow parser-fix-worthy rows are currently absent

## What is *not* justified yet
- claiming `CONDITIONAL PASS` for the full-cohort sign-off
- implying that thin annual-holidays rows were the only blocker
- using parser-accountability cleanup as a substitute for product-level usability thresholds

## Recommended interpretation model
1. keep the official sign-off verdict on the full 50-row cohort
2. separately report a `parser-accountability read`
3. if future stakeholders want a softer verdict, require an explicit rubric decision about low-visibility rows first

## Practical implication
- next discussion should be policy, not fallback code:
  - are low-visibility teaser/prose rows in-scope for comparison-grade sign-off?
  - if yes, the product verdict should remain fail until those rows become more usable
  - if no, the holdout/rubric must explicitly split them into a separate cohort instead of silently reinterpreting the current result
