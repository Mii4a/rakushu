# Job Analysis Holdout Cohort Definition Decision Memo

## Purpose

次の意思決定を明文化する。

1. low-visibility teaser / prose rows を、比較-grade sign-off の同一母集団に残すか
2. 残すなら、現時点の最終 verdict は `FAIL` 維持でよいか
3. 残さないなら、holdout / rubric を別 cohort に分けて `Conditional Pass` 線を新設するか

このメモは **parser fallback 追加の議論ではなく、評価母集団の定義** を決めるための材料。

---

## Current baseline (seed scorecard)

参照:
- `docs/evaluations/job-analysis-holdout-2026-05-25-task19-bonus-secondary-alignment-scorecard.csv`
- `docs/evaluations/job-analysis-holdout-2026-05-29-task21-thin-row-signoff-alignment-summary.md`
- `docs/evaluations/job-analysis-holdout-2026-05-29-task23-conditional-pass-boundary-summary.md`

### Full cohort result
- total: 50
- A / B / C: 25 / 11 / 14
- A+B: 72.0%
- critical 3/4+ usable: 72.0%
- critical 4/4 usable: 50.0%
- current official read: `FAIL`

### Residual split used in this memo

#### 1) Thin annual-holidays rows
- count: 10
- rows: `006`, `017`〜`024`, `038`
- profile: 全件 `B`, `comparison_usable=yes`, `critical usable 3/4`
- meaning: `annualHolidays` total が raw text に無く、strict metric 上は miss だが parser-miss-worthy ではない

#### 2) Low-visibility teaser / prose / thin company-card rows
- count: 15
- rows: `014`, `035`〜`037`, `039`〜`049`
- profile: `B=1`, `C=14`
- meaning: critical field の visible signal 自体が薄く、comparison-grade sign-off に残すべきかが今回の policy 論点

#### 3) Core comparison-readable rows
- count: 25
- rows: 上記 2 群を除いた残り
- profile: `A=25`, `B=0`, `C=0`
- meaning: recurring parser blocker はこの層では事実上閉じている

### Important correction
- Task 23 文書では `038` が thin annual-holidays rows と mixed-signal rows の両方に入っていたが、scorecard 上の実態は **thin annual-holidays B row**。
- このメモでは `038` を low-visibility cohort から外し、cohort を **重複なし** で扱う。

---

## The actual decision

論点は「thin annual-holidays row をどう読むか」より一段上。

> low-visibility teaser / prose rows を、比較-grade sign-off の official cohort に含め続けるか？

ここを決めない限り、`FAIL` も `Conditional Pass` も定義がぶれる。

---

## Option A: Full-cohort FAIL 維持案

## Definition
- 現行 50 件 cohort をそのまま official sign-off cohort とする
- low-visibility teaser / prose / thin company-card rows も、実ユーザーが遭遇する入力として母集団に残す
- thin annual-holidays rows は parser-accountability 上は別扱いにするが、**full-cohort verdict 自体は動かさない**

## Result under this option
- official cohort: 50 rows
- verdict: `FAIL`
- rationale:
  - A+B 72.0% で product fail line 未達
  - critical 4/4 usable 50.0% で critical fail line 未達
  - recurring parser blocker は概ね閉じているが、user-facing 比較利用性はまだ不足

## What this option is saying
- 比較-grade sign-off は「raw text が薄い row も含めた現実入力耐性」の判定である
- parser の責任範囲が狭まったことと、product sign-off が通ることは別問題
- low-visibility row が多く残る以上、official verdict を上げない

## Pros
- 一番ごまかしがない
- user-facing reality をそのまま測れる
- 「parser bug は減ったのに FAIL」の理由を product limitation として正直に出せる
- rubric 変更を最小限にできる

## Cons
- parser-accountability 的にはかなり片付いていても、sign-off は進まない
- 実装論点ではなく input policy 論点で止まり続ける
- low-visibility row を product 完成基準へどこまで含めるのかが、曖昧なままだと FAIL が固定化しやすい

## Best fit when
- 「比較-grade sign-off は low-visibility input まで含めて耐えるべき」と考える
- raw text が薄いこと自体も product limitation として正面から採点したい
- Conditional Pass を作るなら、実 usability 改善が起きた時だけにしたい

## Required wording if chosen
- final verdict: `FAIL`
- parser-accountability read: `Recurring parser blocker closed` を補助表示
- next question: parser fallback 追加ではなく、low-visibility rows を今後も official cohort に含めるかの product policy review

---

## Option B: Cohort 分離 + Conditional Pass 線を作る案

## Definition
- official sign-off を 2 cohort に分ける
  1. **comparison-grade cohort**: raw text に比較用 critical field が一定以上 visible な rows
  2. **low-visibility cohort**: teaser / prose / thin company-card で、comparison-grade 判定には直接使わない rows
- low-visibility cohort は coverage / limitation 監視用に残すが、comparison-grade sign-off の pass/fail denominator から外す
- thin annual-holidays rows (`006`, `017`〜`024`, `038`) は comparison-grade cohort に残す

## Result under this option
low-visibility cohort を外した comparison-grade cohort は次の通り。

- cohort size: 35
- A / B / C: 25 / 10 / 0
- A+B: 100.0%
- critical 3/4+ usable: 100.0%
- critical 4/4 usable: 71.4%

この数値なら:
- product gate は `PASS` 水準
- critical-field gate は `Conditional Pass` 水準（4/4 usable 71.4%）
- よって **comparison-grade cohort 限定なら `Conditional Pass` を引ける**

## What this option is saying
- low-visibility rows は「比較-grade parser 完成度」を測る母集団ではなく、別の product coverage problem とみなす
- sign-off の主目的を「比較表として機能する入力群での完成判定」に絞る
- official verdict は one-number ではなく、cohort 別に出す

## Pros
- parser-accountability と comparison-grade sign-off が噛み合う
- 実装完了判定を、recoverable signal がある母集団に寄せられる
- low-visibility policy を別トラックで管理できる
- `FAIL` が input-thinness に永久拘束される状態を避けられる

## Cons
- rubric の変更量が大きい
- 「都合の悪い row を外してよく見せた」と読まれるリスクがある
- low-visibility cohort の inclusion rule が曖昧だと、新しい恣意性が生まれる
- holdout 収集・review・summary・checklist を cohort 前提で作り直す必要がある

## Best fit when
- 「比較-grade sign-off は、そもそも比較可能性がある raw text 群に対して定義すべき」と考える
- low-visibility teaser / prose row は parser quality より source coverage policy の問題だと整理したい
- Conditional Pass を前進の意思決定として実用的に使いたい

## Required rubric changes if chosen
最低でも以下を更新する必要がある。

1. `docs/job-analysis-completion-criteria.md`
   - comparison-grade cohort の inclusion rule
   - low-visibility cohort の定義
   - cohort 別 verdict の出し方
2. `docs/job-analysis-holdout-review-runbook.md`
   - row を採点前 or 採点後にどの cohort へ入れるかの手順
   - borderline row の adjudication rule
3. `docs/evaluations/job-analysis-feedback-signoff-checklist.md`
   - full-cohort snapshot と comparison-grade verdict を分けて書く形式
4. holdout summary template
   - official verdict と shadow/supporting cohort result の見出し固定

---

## Comparison table

| 観点 | Option A: full-cohort FAIL維持 | Option B: cohort分離 + Conditional Pass線 |
|---|---|---|
| official母集団 | 50 rows 全部 | comparison-grade 35 rows / low-visibility 15 rows を分離 |
| final verdict | FAIL | comparison-grade は Conditional Pass 可能 |
| parser-accountability との整合 | 中 | 高 |
| user-facing reality の反映 | 高 | 中 |
| rubric変更コスト | 低 | 高 |
| ごまかしに見えるリスク | 低 | 中〜高 |
| 今の議論に対する解像度 | 「現実入力込みでまだ未達」 | 「比較可能群では前進、coverage群は別管理」 |

---

## Recommendation framing

このメモの結論は、どちらが“正しい数値”かではなく、**何を official sign-off と呼ぶか** を決めること。

### If the team wants one official verdict only
- Option A が自然
- 理由: one-number sign-off に low-visibility rows を含めるなら、今はまだ `FAIL` が正直

### If the team wants implementation-completion と source-coverage limitation を分けたい
- Option B が自然
- 理由: comparison-grade parser sign-off と low-visibility coverage sign-off を分離した方が、次アクションが明確になる

---

## Recommended decision prompt

次の二択として決めるとぶれにくい。

1. **比較-grade sign-off は low-visibility teaser / prose rows も含む**
   - → official verdict は `full-cohort FAIL` 維持

2. **比較-grade sign-off は low-visibility teaser / prose rows を別 cohort に分ける**
   - → holdout / rubric / checklist を cohort-aware に更新し、comparison-grade cohort に `Conditional Pass` 線を作る

---

## Suggested next action after decision

### If Option A is chosen
- completion criteria / checklist / summary wording を `full-cohort FAIL + parser-accountability read` で固定する
- parser fallback 追加ではなく、low-visibility rows を product limitation としてどう扱うかの説明責任を整える
- ユーザー向けには「比較できない」の一言で流さず、**どの critical item が元本文に未記載なのか** を明示する
- 元本文に採点に必要な項目が無い場合、その項目は **最低点** として扱い、内容が薄い求人であること自体を採点結果として返す
- つまり Option A は「薄い入力も official cohort に残して FAIL を維持する」だけでなく、「薄さを可視化してユーザーに返す」運用まで含めて完成させる

### If Option B is chosen
- first task は parser code ではなく **rubric refactor**
- cohort definitions, inclusion rules, and reporting format を先に確定する
- そのあと同じ seed scorecard を cohort-aware に再集計して official summary を更新する

---

## Current direction selected

- 現時点の方向性は **Option A: full-cohort FAIL 維持案** を採る
- 理由: low-visibility / thin-input rows も、実ユーザーが実際に貼る求人として official sign-off から外さないため
- ただし、ここでの FAIL は「比較機能が主役なのに未完成」という意味に限定しない

### Product framing for non-engineers
- らくしゅうの主な価値は、まず **求人を貼ればその内容を採点できること**
- 次に **その採点基準をみんなで共有できること**
- 比較機能は重要だが、プロダクトの唯一の中心ではない

### Implication of that framing
- したがって、元本文が薄く比較用の critical item が最初から書かれていない求人でも、評価対象から外さない
- その代わり、その求人には
  - 「この求人説明は内容が薄い」
  - 「どの項目が未記載か」
  - 「未記載項目は最低点として扱った」
  を明示して返す
- この方針では、missing は parser の言い訳ではなく、**求人内容の薄さそのものをユーザーに伝える評価結果** になる
