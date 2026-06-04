# Job Analysis Stability Plan

## Goal
求人本文の抽出を、媒体差分や表記ゆれに対して壊れにくい形へ段階的に改善する。

短期は取りこぼし削減、中期は構造整理、長期は低信頼ケースの補完を目標にする。

## Principles
- 正規化、抽出、検証、補完を分離する
- `unknown` を減らすだけでなく誤抽出も抑える
- 実データ由来の匿名 fixture を増やして改善を固定する
- 媒体別の応急処置は、正式な fallback 段として定義する

## Current Risks
- `会社名:` や `雇用形態:` のような明示ラベルがない本文で取りこぼす
- 媒体の要約行に複数属性が圧縮され、単純な section 抽出が効かない
- 本文後半にだけ `想定年収`、`賞与`、`福利厚生` があるケースがある
- 抽出根拠が item ごとに揃っておらず、失敗分析がしづらい

## Phase 1: Deterministic Hardening
- `normalizeText` を前処理レイヤとして強化する
- 見出し alias を整理し、`section map` を導入する
- 各抽出器を `direct label -> section -> summary line -> global scan` の段階型にそろえる
- 媒体要約行から `companyName` と `employmentType` を拾う fallback を維持する
- 実失敗ケースを `fixtures/jobs/` に匿名化して保存する

## Phase 2: Validation and Confidence
- `ExtractedValue` に `confidence` を追加する
- `source` を `direct_label | section | summary_line | contact | global_scan` などで標準化する
- 妥当性チェックを抽出とは別層に分ける
- 不自然な値は `found` ではなく `low confidence` または `unknown` に落とす

## Phase 2.5: Lean Feedback Loop
- parser 実行ごとに品質 evaluator を走らせる
- `high` / `medium` のうち高シグナルな失敗だけ `job_analysis_feedback` に保存する
- feedback には `failureTypes`、短い summary、analysis 参照、triage 用 quick checks を持たせる
- internal review 用の一覧ページで fixture 化・parser 修正候補を見返せるようにする

## Phase 3: Parser Structure
- `parser.ts` の単一ファイル構成を分割する
- 候補:
  - `normalizer.ts`
  - `section-map.ts`
  - `extractors/company.ts`
  - `extractors/employment.ts`
  - `extractors/salary.ts`
  - `extractors/holiday.ts`
  - `validators.ts`
- 抽出器ごとに unit test を分け、失敗原因を局所化する

## Phase 4: Low-Confidence Fallback
- deterministic 抽出で `unknown` または `low confidence` の項目だけ補完する
- 補完は項目単位で行い、全文一括解析にしない
- 補完結果も evidence と confidence を持たせる

## Fixtures Policy
- 生データは repo に入れず、匿名化した本文だけ保存する
- 少なくとも次の類型を持つ
  - section 型
  - 媒体要約行圧縮型
  - SNS/広告系ノイズ多め型
  - 企業採用ページ型

## Immediate Next Tasks
1. fixture 読み込み型に parser test を寄せる
2. `section map` の専用ヘルパーを追加する
3. `ExtractedValue` の拡張案を型定義に落とす
4. `salaryText` と `benefits` の summary line fallback を強化する
5. 保存済み求人から匿名 fixture を継続追加する

## Phase 1 execution note
- `fixtures/jobs/phase1-salary-summary-anon.txt` を追加
- `fixtures/jobs/phase1-benefits-summary-anon.txt` を追加
- `fixtures/jobs/phase1-mixed-prose-anon.txt` を追加
- `src/lib/analysis/parser.test.ts` に fixture ベースの再現テストを追加
- `salaryText` の summary/prose fallback を強化
- `benefits` の prose fallback と benefit token を追加
- 次は internal parser feedback の open/high を 5件以上 fixture 化する

## Phase 2 execution note
- `fixtures/jobs/phase2-en-gage-fixed-overtime-anon.txt` を追加
- `fixtures/jobs/phase2-en-gage-trial-period-anon.txt` を追加
- `fixtures/jobs/phase2-en-japan-listcard-anon.txt` を追加
- `fixtures/jobs/phase2-kyujinbox-shortlines-anon.txt` を追加
- `src/lib/analysis/parser.test.ts` に web 由来 fixture の回帰テストを追加
- `parser.ts` で `想定年収` 見出し直下の金額行を優先するよう補強
- `parser.ts` で `みなし残業代` と `3万8000円` / `19万8,300円` 形式の金額正規化を追加
- `parser.ts` で `完全土日祝休み` を `完全週休2日制` 相当として扱う fallback を追加
