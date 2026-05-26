# Job Analysis Sign-off Decision Memo: 評価母集団の定義

## 問い
比較-grade sign-off の評価母集団に、`low-visibility teaser / prose rows` を同一 cohort のまま残すか。

## 前提
- 今回の論点は parser fallback の追加ではない。
- 先に決めるべきなのは、sign-off が何を PASS / FAIL とみなすかという評価母集団の定義。
- UNKNOWN は 1 種類として扱わない。
  - **本文未記載 UNKNOWN**: 本文に比較に必要な記載が本当にない。
  - **抽出失敗 UNKNOWN**: 本文には見えているが、ルールベース解析で取り切れていない。
- `抽出失敗 UNKNOWN` を採点に混ぜて E 扱いすると、採点の信用度が大きく落ちる。
- この分別が安定しない間は、UNKNOWN→E の全面変換は保留が妥当。

---

## 案A: full-cohort FAIL維持案

### 定義
`low-visibility teaser / prose rows` も比較-grade sign-off の同一母集団に残す。
本文未記載の重要項目は最低点候補として扱う。

### 判定の考え方
- 比較機能は「現実の求人入力に対して、どこまで比較判断を支えられるか」を問う。
- 入力ソース側が薄いことも、実運用上の比較失敗コストに含める。
- よって、低可視性 row も cohort から外さず、full-cohort で FAIL を維持する。

### メリット
- 実ユーザー体験に最も忠実。
- 「求人を貼れば採点できるか」という核機能の厳しめ定義を守れる。
- parser 改善と product limitation を同じ scorecard 上で可視化できる。

### デメリット
- parser 側で改善不能な入力薄さが混ざり、実装改善の達成感が見えにくい。
- sign-off FAIL が長引きやすい。
- holdout / rubric の数値が「抽出品質」より「入力品質」に強く引っ張られる。

### この案で必要な運用
- UI で `本文未記載` を明示する。
- UNKNOWN は `本文未記載` と `要確認` に分ける。
- sign-off summary では「FAIL の内訳」を少なくとも次の 2 軸で分ける。
  1. 本文未記載による最低点
  2. 抽出失敗による UNKNOWN / usability loss

### 向いている条件
- プロダクトの核を「どんな求人でも比較に使えるか」に置く場合。
- 厳しめの product readiness gate を維持したい場合。

---

## 案B: cohort分離してConditional Pass線を作る案

### 定義
`low-visibility teaser / prose rows` は comparison-grade main cohort から外し、`thin-input cohort` として別管理する。
main cohort に対して Conditional Pass 線を定義する。

### 判定の考え方
- sign-off は「比較に必要な最低情報がある求人に対して、比較-grade が成立しているか」を測る。
- 情報が薄すぎる row は parser 品質評価とは別問題として扱う。
- そのため holdout / rubric を main cohort と thin-input cohort に分ける。

### メリット
- parser / scoring の改善度が見えやすい。
- 「比較可能な求人に対しては十分使える」という Conditional Pass を切り出せる。
- 実装可能性・保守性の面では前進を示しやすい。

### デメリット
- sign-off 数値が良く見えやすくなり、実ユーザー体験の厳しさを薄める恐れがある。
- cohort 分離基準が曖昧だと、評価逃れに見える。
- thin-input cohort を別で追わないと、プロダクトとしての弱点が隠れる。

### この案で必要な運用
- holdout / rubric に cohort 列を追加する。
- thin-input 判定ルールを明文化する。
  - 例: 重要項目のうち本文未記載が 1 つ以上ある場合は thin-input cohort
- sign-off は 2 枚で出す。
  1. main cohort: Conditional Pass / Fail
  2. thin-input cohort: product limitation report

### 向いている条件
- まずは比較可能な入力で品質達成を示したい場合。
- parser 品質と入力薄さを切り分けてロードマップ管理したい場合。

---

## 比較表

| 観点 | 案A: full-cohort FAIL維持 | 案B: cohort分離 + Conditional Pass |
|---|---|---|
| ユーザー体験への忠実さ | 高い | 中くらい |
| parser 改善の見えやすさ | 低い | 高い |
| sign-off の厳しさ | 高い | 中〜高 |
| product limitation の可視化 | 高い | 運用次第 |
| 評価設計の複雑さ | 低い | 高い |
| 「甘く見せる」リスク | 低い | やや高い |

---

## 現時点の推奨
**第一推奨: 案A（full-cohort FAIL維持）を baseline に置く。**

理由:
1. らくしゅうの核機能は「求人を貼ればその内容を採点できること」であり、入力の薄さもユーザー体験の一部だから。
2. いま主論点は fallback 不足ではなく、比較-grade sign-off が何を保証するかの定義だから。
3. 案B は有効だが、基準が固まる前に導入すると評価逃れに見えやすいから。

ただし、**運用上は案Aを採りつつ、補助レポートとして案B相当の cohort 分解を併記する**のが現実的。
つまり:
- 公式 sign-off 判定は full-cohort で出す
- 参考値として main cohort / thin-input cohort の分解を出す

これなら gate は甘くしないまま、何が parser 問題で何が入力問題かを説明できる。

---

## 次アクション
1. missing-item helper で `本文未記載` と `要確認` を分ける。
2. jobs detail / checklist に thin-input callout を出す。
3. holdout CSV / rubric に cohort 列を追加するかを決める。
4. 次回 sign-off では、少なくとも参考表として `full cohort` と `thin-input除外 cohort` の両方を並べる。
