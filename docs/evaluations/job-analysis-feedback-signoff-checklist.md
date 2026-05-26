# Job Analysis Feedback Sign-off Checklist

このチェックリストは、holdout 50件を採点したあとに「feedback 追加を完成扱いにしてよいか」を判定するための運用メモ。

関連文書:
- `docs/job-analysis-completion-criteria.md`
- `docs/evaluations/job-analysis-holdout-template.csv`
- `docs/evaluations/job-analysis-holdout-template-summary.md`
- `docs/evaluations/job-analysis-holdout-2026-05-25-task19-bonus-secondary-alignment-summary.md`
- `docs/evaluations/job-analysis-holdout-2026-05-29-task17-recheck-summary.md`
- `docs/evaluations/job-analysis-holdout-2026-05-25-task16-grok-reverify-summary.md`

## 0. Preconditions
- [x] approved holdout が 50件以上ある
- [x] duplicate / rerun / fixture overlap screening が済んでいる
- [x] raw text は事前整形していない
- [x] 各 source shape が最低 5件ある

## 1. Dataset snapshot
- total: 50
- job_board_detail: 19
- job_board_listcard: 10
- company_careers: 6
- prose_heavy: 7
- noisy_promo: 8
- other: 0
- high-risk shape total (`company_careers + prose_heavy + noisy_promo`): 21 (42%)
- dominant shape ratio: 19/50 (38%)

判定:
- [x] required gate pass
- [x] recommended gate pass
- memo: required / recommended ともに通過。shape 偏りで sign-off 自体を止める理由はない。
- thin-input note: `company_careers` / `noisy_promo` / `prose_heavy` には、raw text 自体が薄い row が残る。shape 集計と parser-fix 優先度は分けて扱う。
- thin-input rule: raw text に比較用 critical field 自体が出ていない row は thin-input として数え、parser miss backlog に直接積まない。
- parser-miss-worthy rule: raw text に critical field が見えているのに parser が取り逃がした row だけを parser fix 候補に入れる。
- official verdict rule: この checklist の PASS / CONDITIONAL PASS / FAIL は full-cohort を維持し、cohort split は補助 read としてだけ使う。

## 2. Product-level outcome
- A: 25
- B: 11
- C: 14
- A+B rate: 72%
- trust-breaking C count: 0
- comparison_usable_yes: 36
- comparison_usable_no: 14

判定:
- [ ] product pass
- [ ] product conditional pass
- [x] product fail
- memo: trust-breaking wrong は消えたが、A+B 72% / C 14件のため product gate は未達。止まっている理由は recurring parser bug ではなく、thin-input row が比較利用性を押し下げていること。

## 3. Critical fields
- 3/4+ usable rate: 72%
- 4/4 usable rate: 50%
- critical wrong present rate: 0%
- companyName wrong count: 0
- employmentType wrong count: 0
- salaryText wrong count: 0
- annualHolidays wrong count: 0

判定:
- [ ] critical-field pass
- [ ] critical-field conditional pass
- [x] critical-field fail
- memo: wrong present は 0 まで下がった。一方で 4/4 usable が 50% に留まり、主因は `annualHolidays` total を raw text が持たない thin rows と critical field 露出自体が薄い teaser / prose cluster。

## 4. Secondary fields
- benefits present-case miss: 0
- housingAllowance present-case miss: 0
- companyHousing present-case miss: 0
- bonusCount present-case miss: 0
- retirementAllowance present-case miss: 0
- absent-but-found summary: strong false-positive burst なし

判定:
- [x] secondary-field acceptable
- [ ] secondary-field watch
- [ ] secondary-field blocking
- memo: Task 19 の secondary drift 修正後、secondary recurring blocker は current rerun 上で消えている。

## 5. Failure types
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

Recurrence checks:
- [x] same failure type did not recur 3+ times in the same source shape
- [x] no new common failure class appeared repeatedly in this batch
- [ ] high-priority fixture backlog is under 5
- memo: failure-type recurrence blocker は解消済み。ただし residual B/C の説明用 fixture / evidence backlog は 14件残る。
- residual-row note: いまの残件は failure type 再発より、thin-input shape の sign-off 解釈整理に寄っている。

## 6. Residual row split
- thin-input / mixed-signal `company_careers`: `014`, `035`〜`039`
- thin-input annual-holidays listcards: `017`〜`024`
- teaser / noisy / prose thin cluster: `040`〜`049`
- detail-but-no-total holiday case: `006`
- parser-miss-worthy annual-holiday shorthand rows: `015`, `016` はすでに Task 16 で修正済み

判定メモ:
- `014` は一見リッチだが、approved raw text 上は `employmentType` 明示がなく parser miss と断定できない
- `017`〜`024` は salary / company / title は比較できる一方、`annualHolidays` total が raw text に無い B群
- `040`〜`049` は critical field の visible signal 自体が薄く、4/4 usable へ押し上げる余地が小さい
- したがって current fail 主因は parser hardening backlog ではなく、thin-input rows を product / critical gate でどう扱うかの sign-off 論点

## 6.5 Boundary read
- shadow read: `comparison_grade` cohort だけを見る Conditional Pass 線は別案として記録するが、この checklist 単体では verdict を持ち上げない
- thin annual-holidays rows: 10件（`006`, `017`〜`024`, `038`）
- これらは全件 B / critical usable 3/4 / comparison usable yes
- mixed-signal / low-visibility residual rows: 16件（うち B 2件 = `014`, `038`; C 14件 = `035`〜`037`, `039`〜`049`）
- したがって thin annual-holidays B rows だけを別扱いにしても、full-cohort verdict は conditional pass へは上がらない
- parser-accountability read としては recurring parser blocker は閉じているが、full-cohort verdict と混同しない

## 7. Feedback loop
- current rerun open rows: `feedback_expected=0` / `feedback_saved=0`
- current rerun recall: N/A (`0/0` は fail ではなく no-open-feedback-row 扱い)
- latest observed DB-backed check: `feedback_expected=3` / `feedback_saved=3` → recall 100% (`docs/evaluations/job-analysis-holdout-2026-05-29-task17-recheck-summary.md`)
- current simulated public subset: `0/0`（Task 16 postfix + Grok reverify で residual 解消）
- noisy_count: 0
- save_miss_count: 0

判定:
- [ ] feedback pass
- [x] feedback conditional pass
- [ ] feedback fail
- memo: current rerun では open な high-signal feedback row 自体が残っていない。よって `0/0` を機械的に 0% fail と読まない。observed DB-backed rerun では 3/3 を維持しているため、feedback loop は main blocker ではなくなった。

## 8. Regression safety
- high-signal fixtures from feedback / holdout: 41 current anonymized fixture texts in `fixtures/jobs/`
- focused parser tests: pass
- full test suite: pass
- focused analysis regression: `npm test -- src/lib/analysis/parser.test.ts src/lib/analysis/quality.test.ts` → 69 passed

判定:
- [x] regression-safe
- [ ] regression-risk remains
- memo: recurring parser-quality blocker は fixture-backed にかなり固定できている。

## 9. Final decision
- [ ] PASS
- [ ] CONDITIONAL PASS
- [x] FAIL

理由:
- Dataset readiness は十分
- parser / secondary / feedback-rule の recurring blocker は概ね解消済み
- ただし product gate (`A+B 72%`) と critical-field gate (`4/4 usable 50%`) が未達
- current fail 主因は parser wrong ではなく、thin-input `company_careers` / `job_board_listcard` / `noisy_promo` / `prose_heavy` が比較利用性を押し下げていること
- thin annual-holidays B rows を別解釈しても、`035`〜`037`, `039`〜`049` の low-visibility C rows が残るため conditional pass はまだ正当化できない
- 次ラウンドの本丸は parser hardening 追加より、thin-input rows を sign-off / completion criteria 上でどう扱うかの整理

## 10. Required next action by verdict

### If PASS
- release note に「完成水準到達」を記録
- 次回以降は long-tail monitor として holdout を増分運用する

### If CONDITIONAL PASS
- 最大 3件までの priority fixes を決める
- 対応 fixture と review trigger を同時に書く
- 同じ 50件 rubric で再評価する

### If FAIL
- [x] common failure class を parser_fix / feedback_rule_fix / sign-off-interpretation に切り分ける
- [x] parser wrong と thin-input を artifact 上で分離する
- [x] holdout を追加する前に residual B/C の扱い基準を明文化する

Fail batch の優先修正:
1. `annualHolidays` total を持たない thin rows を product / critical gate でどう扱うか、criteria / checklist / summary wording を揃える
2. `company_careers` / `noisy_promo` / `prose_heavy` の thin-input row を sign-off artifact 上で安定して列挙する
3. observed rerun evidence と simulated rerun evidence の見せ方を summary / checklist / runbook で固定する
4. そのうえで必要なら parser hardening を narrow に追加する
