# Job Analysis Holdout Review Runbook

## Goal

求人本文のコピペ入力 50件以上を holdout として評価し、らくしゅうの parser / feedback loop が `docs/job-analysis-completion-criteria.md` の完成基準に達しているかを判定する。

この runbook は、採点のばらつきを減らし、failure type ごとの改善優先度を揃えるための運用手順。

## Inputs

作業前に次を用意する。

- `docs/job-analysis-completion-criteria.md`
- `docs/job-analysis-evaluation-scorecard.md`
- `docs/job-analysis-holdout-collection-rules.md`
- holdout 求人本文 50件以上
- internal parser feedback 一覧へのアクセス
- parser の実際の出力を確認できる UI または保存結果

## Output artifacts

レビュー後に最低限残すもの。

- scorecard CSV
- 補足メモ Markdown
- 集計サマリ Markdown
- 必要なら fixture 化候補リスト

推奨パス:

- `docs/evaluations/job-analysis-holdout-YYYY-MM-scorecard.csv`
- `docs/evaluations/job-analysis-holdout-YYYY-MM-notes.md`
- `docs/evaluations/job-analysis-holdout-YYYY-MM-summary.md`

## Sampling rules

holdout 候補の収集・除外・shape 配分は `docs/job-analysis-holdout-collection-rules.md` を正本とする。
ここでは review 時に最低限守る確認項目だけを再掲する。

### Required mix

holdout 50件以上に対して、少なくとも次の shape を混ぜる。

- `job_board_detail`
- `job_board_listcard`
- `company_careers`
- `prose_heavy`
- `noisy_promo`

### Guardrails

- 既存 fixture と同文面を使わない
- parser hardening に使ったテキストを評価本体に混ぜすぎない
- 同一媒体だけに偏らせない
- 可能なら直近の real-world paste を優先する

## Review procedure

### Step 1: Prepare the scorecard

- `docs/job-analysis-evaluation-scorecard.md` の CSV header を使って評価ファイルを作る
- 各 sample に `sample_id` を振る
- saved job を使う場合は `job_id` / `analysis_id` / `parser_version` も最初から埋める
- source shape を先に埋めておく

### Step 2: Run or open the parser result

各求人について次を確認する。

- raw text 全体
- parser UI 上の抽出結果
- 可能なら evidence / source / confidence
- internal feedback に保存されているかどうか

### Step 3: Judge product usability first

最初に A / B / C を決める。

判定順は次の通り。

1. 比較に使えるか
2. critical fields がどれだけ usable か
3. 誤抽出があるか
4. secondary fields の不足がどこまで痛いか

ここで先に failure type から入らないこと。
まず体験として使えるかを決め、そのあと failure type を付ける。

### Step 4: Score critical fields

- `companyName`
- `employmentType`
- `salaryText`
- `annualHolidays`

各項目は `usable` / `weak` / `miss` / `wrong` で採点する。

判断の目安:

- `usable`: 比較判断にそのまま使える
- `weak`: 読めば意味は分かるが少し弱い
- `miss`: 取れていない / unknown
- `wrong`: 明らかに誤っている

### Step 5: Score secondary fields

- `benefits`
- `housingAllowance`
- `companyHousing`
- `bonusCount`
- `retirementAllowance`

各項目は `present_and_correct` / `present_but_missed` / `not_present` / `wrong` で採点する。

ここでは「本文にその情報が書いてあるか」を必ず先に見る。
書いてないものを `miss` にしない。

### Step 6: Assign failure types

現行 quality evaluator に合わせて、次を yes / no で記録する。

- `salary_text_without_base_salary`
- `benefits_suspected_but_not_extracted`
- `too_many_unknown_critical_fields`
- `summary_line_only_extraction`
- `company_housing_unknown_with_keyword`
- `housing_allowance_unknown_with_keyword`

### Failure type assignment rubric

#### `salary_text_without_base_salary`
付ける時:
- 給与文言自体はある
- ただし base salary 系への正規化が弱い
- 比較表の給与軸に落としにくい

付けない時:
- そもそも給与記述がない
- 数値正規化済みで問題ない

#### `benefits_suspected_but_not_extracted`
付ける時:
- raw text に 福利厚生 / 待遇 / 手当 / 制度 らしき記述がある
- なのに benefits が空または弱い

付けない時:
- 福利厚生記述自体が見当たらない
- benefits が十分拾えている

#### `too_many_unknown_critical_fields`
付ける時:
- critical fields が複数弱い
- product-level でも C に近い
- 比較判断に必要な骨格が崩れている

付けない時:
- 欠けは局所的
- A / B を維持できている

#### `summary_line_only_extraction`
付ける時:
- companyName / employmentType / salaryText の多くが summary line 依存
- 本文構造から取れていない
- 少し書式が変わると壊れそう

付けない時:
- summary line があっても section / direct_label で十分取れている

#### `company_housing_unknown_with_keyword`
付ける時:
- `社宅` / `借上社宅` の記述が raw text にある
- なのに `companyHousing` が unknown

#### `housing_allowance_unknown_with_keyword`
付ける時:
- `住宅手当` の記述が raw text にある
- なのに `housingAllowance` が unknown

### Step 7: Judge feedback behavior

各求人について次を記録する。

- `feedback_expected`
- `feedback_saved`
- `feedback_quality`

判断の目安:

- `feedback_expected=yes`: 見逃すと今後も壊れやすい failure shape
- `feedback_quality=high_signal`: summary / excerpt / parsed snapshot を見てすぐ次アクションが決まる
- `feedback_quality=noisy`: 見ても修正方針が出ない、または低価値

### Step 8: Set next action

各行に `next_action` を入れる。

- `ignore`: 問題なし
- `watch`: 今は様子見
- `fixture`: fixture 化優先
- `parser_fix`: parser 修正優先
- `feedback_rule_fix`: quality evaluator / feedback gating 修正優先

## Batch review rhythm

50件を一気に雑に見るより、10件ごとに小集計する。

### Suggested cadence

- 10件採点
- failure type の偏りをメモ
- 明らかな再発 shape を仮タグ化
- さらに 10件進める
- 50件到達後に最終集計

理由:
- 早い段階で同じ崩れ方の連続を検出できる
- fixture 化候補を忘れにくい
- 評価のぶれを途中で補正できる

## Aggregation procedure

50件以上の採点後、次を集計する。

### Product-level

- A 件数
- B 件数
- C 件数
- A+B 割合
- comparison_usable=yes の割合

### Critical fields

- 4/4 usable 率
- 3/4 以上 usable 率
- `wrong` を含む件数

### Secondary fields

- 記述ありケースでの miss 率
- `wrong` 率

### Failure types

- 各 failure type の発生件数
- source shape 別の偏り
- A / B / C との対応

### Feedback loop

- `feedback_expected=yes` 件数
- そのうち `feedback_saved=yes` 件数
- save recall (`feedback_saved / feedback_expected`)
- noisy feedback 件数

## Decision rules

### Call it good enough when

- A+B が 85%以上
- C が 15%未満
- `too_many_unknown_critical_fields` 発生率が 10%未満
- high severity feedback 発生率が 10%未満
- 同じ failure type の連続再発が目立たない

### Do not call it done when

- C の多くが誤抽出起因
- 福利厚生や給与の false positive が増えている
- `feedback_expected` に対して `feedback_saved` が弱い
- source shape の一部でだけ極端に崩れている

## How to turn results into action

### If `salary_text_without_base_salary` が多い

- salary 正規化の fallback を見直す
- 金額表現の別表記を fixture 化する
- summary line と prose で分けて再現テスト化する

### If `benefits_suspected_but_not_extracted` が多い

- benefits prose fallback を narrow に広げる
- benefit token の精度を見直す
- false positive とセットで確認する

### If `too_many_unknown_critical_fields` が多い

- まず source shape 別に分解する
- section map / summary fallback / global scan のどこが弱いか切る
- product-level C の主因として最優先で潰す

### If keyword 系 failure が多い

- `社宅` / `住宅手当` の近傍表現を fixture 化する
- boolean 判定の alias を増やす前に false positive も確認する

### If feedback 保存漏れが多い

- `shouldCreateFeedback(report)` の閾値を見直す
- excerpt / summaryText の質も同時に見る

## Recommended summary format

最終サマリは次の見出しで残すと見返しやすい。

```md
# Job Analysis Holdout Review Summary

## Dataset
- total: 50
- shapes:
  - job_board_detail: 10
  - job_board_listcard: 10
  - company_careers: 10
  - prose_heavy: 10
  - noisy_promo: 10

## Product-level result
- A: 28
- B: 16
- C: 6
- A+B: 88%

## Critical field result
- 4/4 usable: 72%
- 3/4+ usable: 90%
- wrong present: 4%

## Failure type result
- salary_text_without_base_salary: 4
- benefits_suspected_but_not_extracted: 6
- too_many_unknown_critical_fields: 5
- summary_line_only_extraction: 3
- company_housing_unknown_with_keyword: 2
- housing_allowance_unknown_with_keyword: 1

## Feedback loop result
- feedback_expected: 12
- feedback_saved: 10
- recall: 83%
- noisy: 2

## Conclusion
- provisional decision: pass / fail
- biggest remaining gap:
- next fixture candidates:
- next parser fixes:
```

## Notes

- failure type は parser の出来そのものではなく、次の改善導線として見る
- A/B/C 採点と failure type がズレるケースは重要。quality evaluator の調整候補になる
- 新しい failure type を quality.ts に追加したら、この runbook と scorecard も同時更新する
