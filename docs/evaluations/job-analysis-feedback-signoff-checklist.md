# Job Analysis Feedback Sign-off Checklist

このチェックリストは、holdout 50件を採点したあとに「feedback 追加を完成扱いにしてよいか」を判定するための運用メモ。

関連文書:
- `docs/job-analysis-completion-criteria.md`
- `docs/evaluations/job-analysis-holdout-template.csv`
- `docs/evaluations/job-analysis-holdout-template-summary.md`
- `docs/evaluations/job-analysis-holdout-2026-05-22-signoff-scorecard.csv`
- `docs/evaluations/job-analysis-holdout-2026-05-22-signoff-summary.md`

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
- thin-input note: `company_careers` の一部、特に Green 系 search-card row は high-risk shape だが raw text が薄い。shape 集計と parser-fix 優先度は分けて扱う。
- thin-input rule: raw text に比較用 critical field 自体が出ていない row は thin-input として数え、parser miss backlog に直接積まない。
- parser-miss-worthy rule: raw text に critical field が見えているのに parser が取り逃がした row だけを parser fix 候補に入れる。

## 2. Product-level outcome
- A: 6
- B: 24
- C: 20
- A+B rate: 60%
- trust-breaking C count: 5
- comparison_usable_yes: 30
- comparison_usable_no: 20

判定:
- [ ] product pass
- [ ] product conditional pass
- [x] product fail
- memo: C が多すぎる。common shape で recurring failure が残っており、比較判断に使える水準とは言えない。

## 3. Critical fields
- 3/4+ usable rate: 62%
- 4/4 usable rate: 34%
- critical wrong present rate: 10%
- companyName wrong count: 1
- employmentType wrong count: 0
- salaryText wrong count: 4
- annualHolidays wrong count: 0

判定:
- [ ] critical-field pass
- [ ] critical-field conditional pass
- [x] critical-field fail
- memo: `salaryText` wrong と `too_many_unknown_critical_fields` の両方が重く、usable line を大きく割っている。

## 4. Secondary fields
- benefits present-case hit rate: insufficient for pass; `present_but_missed` 7件
- housingAllowance present-case hit rate: watch; `present_but_missed` 2件
- companyHousing present-case hit rate: no recurring blocker observed
- bonusCount present-case hit rate: watch; `present_but_missed` 4件
- retirementAllowance present-case hit rate: blocking; `present_but_missed` 10件
- absent-but-found rate: strong false-positive burst は観測されず。ただし critical false positive は残る

判定:
- [ ] secondary-field acceptable
- [ ] secondary-field watch
- [x] secondary-field blocking
- memo: secondary 単体で即 fail にはしないが、retirementAllowance と benefits miss の recurring が common shape hardening 未完了を示している。

## 5. Failure types
- salary_text_without_base_salary: 18
- benefits_suspected_but_not_extracted: 7
- too_many_unknown_critical_fields: 26
- summary_line_only_extraction: 0
- company_housing_unknown_with_keyword: 0
- housing_allowance_unknown_with_keyword: 2

Recurrence checks:
- [ ] same failure type did not recur 3+ times in the same source shape
- [ ] high-priority fixture backlog is under 5
- [ ] no new common failure class appeared repeatedly in this batch
- memo: recurrence blocker 該当。`too_many_unknown_critical_fields` と `salary_text_without_base_salary` が複数 shape で 3回以上再発し、high-priority backlog も 28 件。
- company_careers note: `holdout-candidate-035/036/037` は `companyName` / `salaryText` は見えている一方で `employmentType` / `annualHolidays` が raw text にない thin-input search-card 寄り。ここは parser miss と別バケットで扱う。
- company_careers parser-miss-worthy note: raw text に missing critical field が実在する row が出た場合だけ parser hardening backlog に載せる。

## 6. Feedback loop
- feedback_expected: 40
- feedback_saved: 33
- recall: 82% (all rows mix)
- noisy_count: 0
- noisy_rate: 0%
- save_miss_count: 7

判定:
- [ ] feedback pass
- [ ] feedback conditional pass
- [x] feedback fail
- memo: 全体 recall だけ見ると pass に見えるが、observed saved-job subset は 4/7 = 57% で fail。public holdout rerun の simulated 29/33 = 88% を completion verdict にそのまま使わない。

## 7. Regression safety
- high-signal fixtures from feedback: 9
- focused parser tests: pass
- full test suite: pass
- regression notes: `npm run build` も pass したが、fixture 10件ライン未達

判定:
- [ ] regression-safe
- [x] regression-risk remains
- memo: parser 改善を sign-off できるだけの fixture-backed safety net がまだ足りない。

## 8. Final decision
- [ ] PASS
- [ ] CONDITIONAL PASS
- [x] FAIL

理由:
- Dataset readiness は十分だが product gate が未達
- critical-field usable rate が completion line を大きく下回る
- observed feedback recall が未達で、simulation を混ぜないと pass に見えない
- ただし `company_careers` fail の一部は parser 未実装というより thin-input 起因で、次ラウンドでは sign-off artifact 上で別ラベル化する
- `company_careers` で parser fix 候補に入れるのは、raw text に missing critical field が見えている parser-miss-worthy row のみ

## 9. Required next action by verdict

### If PASS
- release note に「完成水準到達」を記録
- 次回以降は long-tail monitor として holdout を増分運用する

### If CONDITIONAL PASS
- 最大 3件までの priority fixes を決める
- 対応 fixture と review trigger を同時に書く
- 同じ 50件 rubric で再評価する

### If FAIL
- [x] common failure class を parser_fix / feedback_rule_fix / fixture_gap に切り分ける
- [x] 最優先で C を生む failure から潰す
- [x] holdout を追加する前に recurring miss の改善を先に行う

Fail batch の優先修正:
1. `company_careers` thin-input / parser-miss 境界を script/docs に明記
2. Green / noisy promo CTA-noise guardrail
3. Wantedly `prose_heavy` fallback
4. observed feedback-save 漏れの修正
5. fixture を 10件以上へ増やす
