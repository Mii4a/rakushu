# Job Analysis Completion Criteria

## Goal

求人本文のコピペ入力に対して、らくしゅうの解析結果が「比較判断に使える水準」に達しているかを判定する。

この文書は parser / feedback loop の「実装が存在するか」ではなく、「完成と言ってよいか」を判定するための完了基準を定義する。

## Core question

最上位の問いはこれだけに絞る。

- 実在する求人本文をコピペしたとき、ユーザーが元本文を毎回読み直さなくても比較判断を進められるか

したがって、完成判定は単なる field 精度ではなく、次の 4 層で見る。

1. dataset readiness
2. product-level usability
3. extraction quality
4. feedback-loop / regression safety

## What “満足な情報抽出” means

「満足な情報抽出」は、次を満たす状態と定義する。

- 会社名、雇用形態、給与、休日のような比較に直結する情報が大きな手直しなしで読める
- 情報が曖昧なときは、雑に誤抽出するより `unknown` を返す
- ノイズが多い本文でも、致命的な誤認が頻発しない
- 取りこぼしや parser miss が起きても、その多くが high-signal feedback として回収される
- 回収した失敗が fixture / test / parser hardening に接続され、同型の失敗が繰り返し残らない

## Decision states

完成判定は 3 段階で行う。

### Pass
- feedback 追加は「完成水準」とみなしてよい
- 追加の改善はロングテール対応として扱う

### Conditional pass
- 実運用投入は可能だが、「完成」と言い切るには 1 ラウンド追加改善が必要
- 改善対象は明確で、再評価条件も決まっている

### Fail
- まだ完成扱いにしない
- common shape で recurring failure が残っているか、feedback loop 自体が回収不足

## 1. Dataset readiness gate

実装に使った fixture だけで完成判定しない。holdout データセットで評価する。

### Required gate
- approved holdout が 50件以上
- 開発に使った fixture と重複しない
- 明らかな duplicate / rerun 混入を除外済み
- raw text を事前整形せず、コピペに近い形で保存している
- 少なくとも次の 5 種類の source shape を含める
  1. 求人媒体の詳細ページ (`job_board_detail`)
  2. 求人媒体の一覧カード / 要約型 (`job_board_listcard`)
  3. 企業採用ページ (`company_careers`)
  4. prose-heavy な紹介文 / スカウト文型 (`prose_heavy`)
  5. ノイズ混在型 (`noisy_promo`)
- 各 source shape が最低 5件以上ある

### Recommended gate
- 各 source shape を 8件以上に近づける
- 単一 shape が全体の 50%を超えない
- high-risk shape (`company_careers`, `prose_heavy`, `noisy_promo`) が合計 40%以上ある

### Interpretation
- Required gate 未達なら、parser が良く見えても sign-off しない
- Recommended gate 未達でも Required gate を満たしていれば評価実施は可能。ただし conclusion に偏りを明記する
- high-risk shape に含まれる row のうち、raw text 自体が薄く critical field が露出していない thin-input row は別途ラベルする。high-risk shape だからといって、そのまま parser hardening の根拠にしない

## 2. Product-level usability gate

各求人を次の 3 段階で評価する。

- A: そのまま比較・保存してよい
- B: 軽微な取りこぼしはあるが比較に使える
- C: 比較判断の材料として弱く、要改善

### Grade rules

#### A
- critical fields が 4/4 usable、または 3/4 usable でも比較に必要な本文理解が十分ある
- trust-breaking mistake がない
- 元本文を読み直さなくても比較判断を進めやすい

#### B
- minor miss はある
- ただし companyName / employmentType / salaryText / annualHolidays の致命傷はない
- 読み直しが必要でも確認は局所的で済む

#### C
- companyName / employmentType / salaryText / annualHolidays のいずれかに trust-breaking mistake がある
- 取りこぼしが多く、比較判断がかなり不安定
- 元本文をほぼ読み直さないと使いづらい

### Pass line
- A + B が 90%以上
- C が 10%以下
- trust-breaking C が 2件以下
- C 判定の主因が「誤抽出」より「unknown / 取りこぼし」に寄っている

### Conditional pass line
- A + B が 85%以上 90%未満
- C が 15%以下
- trust-breaking C が 3件以下
- 失敗 shape と次アクションが scorecard 上で特定済み

### Fail line
- A + B が 85%未満
- C が 15%超
- trust-breaking C が 4件以上
- 同じ common shape で C が 3件以上続く

## 3. Extraction-quality gate

### 3-1. Critical fields

比較に直結する主要項目を critical fields とみなす。

- `companyName`
- `employmentType`
- `salaryText`
- `annualHolidays`

### Critical-field pass line
- 90%以上の求人で、4項目中 3項目以上が usable
- 75%以上の求人で、4項目すべてが usable
- critical wrong present は全評価サンプルの 3%以下
- `companyName` と `employmentType` の wrong は合計 2件以下
- `salaryText` の wrong は 2件以下

### Critical-field conditional pass line
- 85%以上の求人で、4項目中 3項目以上が usable
- 70%以上の求人で、4項目すべてが usable
- critical wrong present は 5%以下

### Usable extraction definition
- exact match でなくても、UI 上で人が比較判断に使える
- `unknown` は許容するが、誤値より `unknown` を優先する
- evidence と source を見たときに抽出理由が説明できる
- summary / normalized value / raw text の間で明白な矛盾がない

### 3-2. Secondary fields

次の項目は比較の質を上げる準重要項目として扱う。

- `benefits`
- `housingAllowance`
- `companyHousing`
- `bonusCount`
- `retirementAllowance`

### Secondary-field pass line
- 本文に記述が存在するケースの 75%以上で正しく抽出される
- 「本文にあるのに `unknown`」は 25%未満
- 「本文にないのに `found`」は 10%未満

### Secondary-field interpretation
- secondary miss 単体で即 fail にはしない
- ただし prose-heavy / noisy shape で同じ miss が recurring するなら completion を止める理由になる

## 4. False-positive guardrail

次のような誤抽出が続く場合は未完成とみなす。

- 要約文の雰囲気語を福利厚生として拾う
- 休日の説明文から年間休日を誤認する
- 給与レンジとは無関係な数字を salary 系として拾う
- 会社紹介や媒体名を companyName と誤認する
- ナビゲーション文言や CTA を雇用形態・条件として誤認する

原則として、false positive は missing より重く扱う。

## 5. Feedback-loop completion gate

feedback loop は「失敗を保存できるか」ではなく、「改善価値の高い失敗を低ノイズで回収し、次の改善につなげられるか」で評価する。

### Pass line
- 改善価値の高い失敗の 80%以上が feedback に保存される
- noise feedback は 20%未満
- 同一 analysis に対して feedback が重複しない
- internal feedback 一覧だけで fixture 化候補を判断できる
  - `summaryText` が failure shape を説明している
  - `rawExcerpt` が短すぎず長すぎない
  - `parsedSnapshot` で原因切り分けに入れる

### Conditional pass line
- recall が 70%以上 80%未満
- noise が 25%未満
- 保存漏れの failure type が明確で、次の修正点が特定済み

### Fail line
- recall が 70%未満
- noise が 25%以上
- high-signal miss が save されず、fixture backlog に乗らない状態が続く

## 6. Failure-type-based completion gate

現行の `src/lib/analysis/quality.ts` で定義されている failure type を、そのまま完成判定の運用軸として使う。

### Current failure types
- `salary_text_without_base_salary`
- `negative_base_salary_detected`
- `company_name_suspected_platform_noise`
- `benefits_suspected_but_not_extracted`
- `too_many_unknown_critical_fields`
- `summary_line_only_extraction`
- `company_housing_unknown_with_keyword`
- `housing_allowance_unknown_with_keyword`

### Completion expectations by failure type

#### `salary_text_without_base_salary`
- holdout 全体で 10%未満
- 発生しても `salaryText` 自体は B を維持できることが多い
- 同じ salary shape の再発が 3件以上続かない

#### `negative_base_salary_detected`
- holdout 全体で 3%以下
- 発生したら high-signal feedback として必ず保存される
- 月給と固定残業代の解釈境界を fixture / test に固定できている

#### `company_name_suspected_platform_noise`
- holdout 全体で 3%以下
- 会社名の誤抽出を `unknown` より重く扱い、見つけたら必ず feedback に乗る
- 媒体名 / CTA / ナビ文言を companyName に巻き込む再発が 3件以上続かない

#### `benefits_suspected_but_not_extracted`
- benefits 記述ありケースで 15%未満
- false positive を増やさずに減らせている
- 同型 prose shape の recurring miss が 3件以上続かない

#### `too_many_unknown_critical_fields`
- holdout 全体で 10%未満
- この failure type が付くケースの多くが C 判定に一致している
- C 判定なのにこの failure type が付かない見逃しが多くない
- ただし `company_careers` の compressed card / search-card shape では、critical field が raw text に存在しない thin-input row を parser miss と混同しない
- thin-input row = raw text に比較用 critical field 自体が露出していない row
- parser-miss-worthy row = raw text に critical field が露出しているのに parser が取り逃がしている row

#### `summary_line_only_extraction`
- holdout 全体で 10%未満
- 発生しても A/B を維持できることが多い
- structural fragility の監視対象として扱う

#### `company_housing_unknown_with_keyword`
- keyword ありケースの miss が 20%未満
- `housingAllowance` との混同 false positive が少ない

#### `housing_allowance_unknown_with_keyword`
- keyword ありケースの miss が 20%未満
- benefits 拡張の副作用で false positive が増えていない

### Recurrence blocker
次のいずれかを満たしたら completion を止める。

- 同じ failure type が同じ source shape で 3件以上連続再発
- high-priority fixture 候補が 5件以上未処理で溜まっている
- 新規 batch で毎回新しい common failure class が見つかる

## 7. Regression-safety gate

完成と呼ぶには、改善が fixture / test に固定されている必要がある。

### Pass line
- high-signal feedback 由来の匿名 fixture が 10件以上ある
- source shape が偏っていない
- 追加 fixture ごとに対応 parser test がある
- focused parser test が green
- full test suite が green
- 新しい fallback 追加で既存 fixture が壊れていない

## Final sign-off rule

### Pass
次のすべてを満たしたら pass。
- Dataset readiness required gate を満たす
- Product-level pass line を満たす
- Critical-field pass line を満たす
- Secondary-field pass line を概ね満たす
- Feedback-loop pass line を満たす
- Regression-safety gate を満たす
- Recurrence blocker に引っかからない

### Conditional pass
次の条件なら conditional pass。
- Dataset readiness required gate は満たす
- Product-level / extraction / feedback のどれかが conditional pass 止まり
- fail line には落ちていない
- 次の 1 ラウンドで潰す failure shape と review trigger が決まっている
- sign-off summary / notes 上で thin-input row と parser-miss-worthy row の境界が明示されている
- 特に `company_careers` では、thin-input sample_id と parser-miss-worthy sample_id が artifact 上で別々に列挙されている

### Fail
次のいずれかで fail。
- Dataset readiness required gate 未達
- Product-level fail line
- Feedback-loop fail line
- Recurrence blocker 該当
- trust-breaking mistake が common shape で残留

## Operating rule

parser 改善の優先順位は次の順に置く。

1. C 判定を生む `too_many_unknown_critical_fields`
2. 比較価値を落とす `salary_text_without_base_salary`
3. false positive を生む company / salary / holiday の誤認
4. `benefits_suspected_but_not_extracted`
5. keyword あり未判定の `company_housing_unknown_with_keyword` / `housing_allowance_unknown_with_keyword`
6. 将来の崩れ予兆としての `summary_line_only_extraction`

## Notes

- 完成判定は「parser が美しいか」ではなく「コピペしたら比較しやすいか」で置く
- `unknown` を無理に減らすための雑な false positive 増加は未完成扱いにする
- 新しい failure type を追加したら、この文書にも completion expectation を追加する
- 50件 holdout がそろっても、自動的に pass にはならない。holdout readiness は sign-off 実施権が得られた状態にすぎない
- 特に Green 系の `company_careers` search-card は、`companyName` / `salaryText` は見えていても `employmentType` / `annualHolidays` が raw text にないことがある。この shape は parser hardening 前に thin-input かどうかを先に切り分ける
- `company_careers` の sign-off artifact では、thin-input と parser-miss-worthy を同じ failure backlog に載せない
