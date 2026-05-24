# Job Analysis Evaluation Scorecard

## Purpose

`docs/job-analysis-completion-criteria.md` の基準に沿って、holdout 求人コピペ 50件以上を人手評価するための採点テンプレート。

この文書は次の 2 つを同時にやるために使う。

- 各求人が A / B / C のどこに入るかを判定する
- failure type ごとの傾向を集計し、fixture 化優先度を決める

## Basic usage

- 1 行 = 1 求人
- raw text を実際に解析したあとに記入する
- parser の表示結果と raw text を見比べて採点する
- 迷ったら「誤抽出」より「unknown / 取りこぼし」を優先して区別する
- コメントには「次に fixture 化すると何が改善できるか」を短く書く

## A / B / C rubric

### A

- そのまま比較・保存してよい
- critical fields がほぼ十分
- secondary fields に多少の欠けがあっても比較価値をほぼ損なわない
- 誤抽出がない、または無視できる

### B

- 軽微な取りこぼしはあるが比較に使える
- critical fields が 1 件弱い、または secondary fields に欠けがある
- UI 上で補助的に人が読むことで十分判断できる

### C

- 比較判断の材料として弱い
- critical fields の複数欠落、または誤抽出が目立つ
- parser hardening または feedback ルール調整の優先候補

## Column definitions

### Identification

- `sample_id`: 評価用の一意 ID。例: `holdout-001`
- `job_id`: 保存済み求人に紐づく内部 ID。saved jobs を見るレビューでは必須
- `analysis_id`: 解析スナップショットの内部 ID。feedback と結び直すために使う
- `parser_version`: どの parser 版の結果か。rerun 比較で重要
- `review_date`: 評価日
- `reviewer`: 評価者
- `source_shape`: 次のいずれか
  - `job_board_detail`
  - `job_board_listcard`
  - `company_careers`
  - `prose_heavy`
  - `noisy_promo`
  - `other`
- `raw_text_origin_note`: 取得元の簡単なメモ。媒体名やページ種別までで十分

### Product-level judgment

- `overall_grade`: `A` / `B` / `C`
- `overall_reason`: 主因を短く書く。例: `annualHolidays unknown only`
- `comparison_usable`: `yes` / `no`

### Critical fields

各欄には `usable` / `weak` / `miss` / `wrong` を入れる。

- `companyName_eval`
- `employmentType_eval`
- `salaryText_eval`
- `annualHolidays_eval`
- `critical_usable_count`: `usable` の数
- `critical_wrong_count`: `wrong` の数

### Secondary fields

各欄には `present_and_correct` / `present_but_missed` / `not_present` / `wrong` を入れる。

- `benefits_eval`
- `housingAllowance_eval`
- `companyHousing_eval`
- `bonusCount_eval`
- `retirementAllowance_eval`
- `secondary_miss_count`
- `secondary_wrong_count`

### Failure types

現行 `quality.ts` に合わせて `yes` / `no` を入れる。

- `salary_text_without_base_salary`
- `negative_base_salary_detected`
- `company_name_suspected_platform_noise`
- `benefits_suspected_but_not_extracted`
- `too_many_unknown_critical_fields`
- `summary_line_only_extraction`
- `company_housing_unknown_with_keyword`
- `housing_allowance_unknown_with_keyword`

### Feedback-loop columns

- `feedback_expected`: `yes` / `no`
- `feedback_saved`: `yes` / `no` / `unknown`
- `feedback_quality`: `high_signal` / `noisy` / `not_applicable`
- `fixture_priority`: `high` / `medium` / `low`
- `suggested_fixture_shape`: 例: `salary-next-line`, `benefits-prose`, `summary-line-only`

### Notes

- `notes`: 人間の補足
- `parser_regression_risk`: `high` / `medium` / `low`
- `next_action`: `ignore` / `watch` / `fixture` / `parser_fix` / `feedback_rule_fix`

## CSV header template

```csv
sample_id,job_id,analysis_id,parser_version,review_date,reviewer,source_shape,raw_text_origin_note,overall_grade,overall_reason,comparison_usable,companyName_eval,employmentType_eval,salaryText_eval,annualHolidays_eval,critical_usable_count,critical_wrong_count,benefits_eval,housingAllowance_eval,companyHousing_eval,bonusCount_eval,retirementAllowance_eval,secondary_miss_count,secondary_wrong_count,salary_text_without_base_salary,negative_base_salary_detected,company_name_suspected_platform_noise,benefits_suspected_but_not_extracted,too_many_unknown_critical_fields,summary_line_only_extraction,company_housing_unknown_with_keyword,housing_allowance_unknown_with_keyword,feedback_expected,feedback_saved,feedback_quality,fixture_priority,suggested_fixture_shape,notes,parser_regression_risk,next_action
```

## Sample rows

```csv
holdout-001,job-001,analysis-001,v1.6.0,2026-05-22,taro,job_board_detail,求人媒体詳細,A,salary ok and holidays ok,yes,usable,usable,usable,usable,4,0,present_and_correct,not_present,not_present,present_and_correct,not_present,0,0,no,no,no,no,no,no,no,no,no,unknown,not_applicable,low,,比較に十分使える,low,ignore
holdout-002,job-002,analysis-002,v1.6.0,2026-05-22,taro,prose_heavy,紹介文中心,B,benefits missed but comparison still possible,yes,usable,usable,usable,miss,3,0,present_but_missed,not_present,not_present,not_present,not_present,1,0,no,no,no,yes,no,no,no,no,yes,yes,high_signal,medium,benefits-prose,福利厚生 prose の再現に向く,medium,fixture
holdout-003,job-003,analysis-003,v1.6.0,2026-05-22,taro,noisy_promo,装飾文多め,C,critical fields too sparse,no,miss,miss,miss,miss,0,0,not_present,not_present,not_present,not_present,not_present,0,0,no,no,no,no,yes,no,no,no,yes,yes,high_signal,high,noisy-promo-critical-fields,summary 依存ではなく critical fields が不足,high,parser_fix
```

## Markdown review template

```md
## holdout-001
- source_shape: job_board_detail
- overall_grade: A
- overall_reason: salary / holidays / employmentType がそのまま比較に使える
- critical:
  - companyName: usable
  - employmentType: usable
  - salaryText: usable
  - annualHolidays: usable
- secondary:
  - benefits: present_and_correct
  - housingAllowance: not_present
  - companyHousing: not_present
  - bonusCount: present_and_correct
  - retirementAllowance: not_present
- failure_types:
  - salary_text_without_base_salary: no
  - negative_base_salary_detected: no
  - company_name_suspected_platform_noise: no
  - benefits_suspected_but_not_extracted: no
  - too_many_unknown_critical_fields: no
  - summary_line_only_extraction: no
  - company_housing_unknown_with_keyword: no
  - housing_allowance_unknown_with_keyword: no
- feedback_expected: no
- fixture_priority: low
- next_action: ignore
```

## Aggregation checklist

50件以上の採点後、最低限次を集計する。

- `overall_grade` の A / B / C 件数
- `comparison_usable=yes` の割合
- critical fields の 3/4 以上 usable 率
- critical fields の 4/4 usable 率
- `wrong` を含む件数
- failure type ごとの発生率
- `feedback_expected=yes` に対する `feedback_saved=yes` の割合
- `fixture_priority=high` の件数
- source shape ごとの偏り

## Decision rule after aggregation

- A+B が 85%以上なら product-level は一旦合格
- `too_many_unknown_critical_fields` が 10%超なら未完成寄り
- `salary_text_without_base_salary` と `benefits_suspected_but_not_extracted` が偏って多いなら parser fallback の優先改善対象
- `feedback_expected` に対して `feedback_saved` が弱いなら quality evaluator 側の取りこぼしを疑う
- `wrong` が増えるなら recall 改善より precision 改善を優先する

## Recommended file convention

採点運用時は次のように保存すると扱いやすい。

- `docs/evaluations/job-analysis-holdout-2026-05-scorecard.csv`
- `docs/evaluations/job-analysis-holdout-2026-05-notes.md`
- `docs/evaluations/job-analysis-holdout-2026-05-summary.md`
