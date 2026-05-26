# Job Analysis Holdout Sign-off Notes

## Review scope
- review_window: 2026-05-29 alignment pass
- total approved samples reviewed: 50
- seed scorecard: `docs/evaluations/job-analysis-holdout-2026-05-25-task19-bonus-secondary-alignment-scorecard.csv`
- purpose: define how thin rows without annual-holiday totals should be interpreted in sign-off, then re-read the current summary under that rule

## Thin annual-holidays rule adopted for this pass
- `annualHolidays` remains a strict numeric critical field
- if raw text does **not** contain a recoverable count/value (`年間休日NN日`, `年休NN日` etc.), the row still counts as `annualHolidays=miss`
- however, that row is **not** parser-miss-worthy evidence by itself
- instead it is recorded as a `thin annual-holidays row`
- this preserves strict 4/4 usable math while separating parser-regression evidence from source-thinness evidence

## Residual-row readout
### 1) thin annual-holidays rows
- `holdout-candidate-006`: holiday section is visible, but no annual-holiday total exists in raw text
- `holdout-candidate-017`〜`024`: salary/company/title are usable, but annual-holiday total is not printed in the listcard raw text
- `holdout-candidate-038`: company card is comparison-usable except for annual-holiday total missing from raw text

### 2) mixed-signal / low-visibility rows
- `holdout-candidate-014`: annual holidays are visible, but employmentType explicit signal is not visible enough to justify a parser miss claim
- `holdout-candidate-035`〜`039`: companyName / salaryText may be visible, but `employmentType` / `annualHolidays` are missing or weak in the raw text itself
- `holdout-candidate-040`〜`049`: teaser / prose / noisy rows with too little visible critical evidence to justify a new parser fallback just from this rerun

### 3) rows that would justify narrow parser fixes
- none newly opened by this pass
- the clearest holiday shorthand parser-miss-worthy cases were `holdout-candidate-015`, `016`, and those are already fixed

## Product / critical gate interpretation
- current fail is still real: A+B is 72% and 4/4 usable is 50%
- but the fail now reads as **thin-input-limited usability**, not as **active recurring parser regression**
- that distinction matters because adding speculative fallbacks would likely raise false-positive risk without solving the actual source-thinness problem

## Feedback interpretation
- current rerun has `feedback_expected=0 / feedback_saved=0`
- under the zero-denominator rule, this is recorded as `no-open-feedback-row`, not as recall 0% fail
- latest observed DB-backed evidence remains 3/3 saved, so feedback loop is not the blocker in this pass

## Summary wording changes justified by this note
- do not write "company_careers split: none" when residual thin rows still exist; say they are residual thin/mixed-signal rows that do not currently justify parser fallback
- do not write "feedback gate: fail" only because the denominator is 0/0; separate zero-denominator current rerun from latest observed DB-backed evidence
- do write that remaining sign-off gap is concentrated in thin annual-holidays rows and low-visibility teaser/prose rows

## Recommended next action
1. keep the strict annual-holidays metric
2. keep thin annual-holidays rows separate from parser-miss-worthy rows in summary/checklist
3. avoid adding new parser fixes unless a residual row shows raw-text-visible recoverable evidence
