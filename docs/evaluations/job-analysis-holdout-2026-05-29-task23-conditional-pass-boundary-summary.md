# Job Analysis Holdout Conditional-pass Boundary Summary

## Run metadata
- review_window: 2026-05-29 boundary pass
- reviewer: taro-bot
- scorecard_path: `docs/evaluations/job-analysis-holdout-2026-05-25-task19-bonus-secondary-alignment-scorecard.csv`
- notes_path: `docs/evaluations/job-analysis-holdout-2026-05-29-task23-conditional-pass-boundary-notes.md`
- purpose: determine whether the current thin-row reinterpretation is enough to move the sign-off verdict from FAIL to CONDITIONAL PASS

## Question
- Can the current scorecard be honestly upgraded to `CONDITIONAL PASS` just by separating thin annual-holidays rows from parser-miss-worthy rows?

## Short answer
- No.
- Thin-row reinterpretation is enough to say **recurring parser blockers are mostly closed**.
- It is **not** enough to say the full-cohort sign-off has reached conditional pass.

## Full-cohort result
- total rows: 50
- A: 25
- B: 11
- C: 14
- A+B: 72%
- critical 3/4+ usable: 72%
- critical 4/4 usable: 50%
- recurring parser-quality blocker: 0
- feedback current rerun open rows: 0/0
- feedback latest observed DB-backed rerun: 3/3 saved
- verdict under current rubric: FAIL

## Boundary split
### 1) Thin annual-holidays rows
- count: 10
- rows: `006`, `017`〜`024`, `038`
- row profile: all 10 are `B`, `critical usable 3/4`, `comparison_usable=yes`
- interpretation: these rows hurt strict 4/4 usable math, but they are not new parser-regression evidence by themselves

### 2) Mixed-signal / low-visibility residual rows
- count: 16
- rows: `014`, `035`〜`049`
- grade split:
  - B: 2 (`014`, `038`)
  - C: 14 (`035`〜`037`, `039`〜`049`)
- interpretation: this is the real reason the sign-off cannot be lifted yet

### 3) Clean parser-accountability subset
- count: 25
- grade split: A 25 / B 0 / C 0
- interpretation: on rows that are neither thin annual-holidays nor mixed-signal low-visibility, the current parser/rule stack is already clean

## Why thin-row reinterpretation alone is not enough
- If we only separate the 10 thin annual-holidays B rows, the 14 low-visibility C rows still remain.
- Those C rows keep product usability far below the conditional-pass line.
- Therefore, the honest read is:
  - parser-accountability: largely closed
  - full-cohort user-facing sign-off: still fail

## Recommended wording
### Full-cohort verdict
- `FAIL`: product gate and critical-field gate remain below line because too many low-visibility rows are still not comparison-usable.

### Parser-accountability read
- `Recurring parser blocker closed`: no unresolved narrow parser-fix batch is currently justified by raw-text-visible evidence.

## Recommended next move
- Keep the full-cohort final verdict as `FAIL`.
- Add the parser-accountability read as a shadow interpretation, not as a replacement verdict.
- If the team wants a future conditional pass path, it should come from an explicit rubric decision about low-visibility rows, not from quietly reclassifying thin annual-holidays rows alone.
