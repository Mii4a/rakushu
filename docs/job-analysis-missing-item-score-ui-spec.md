# Job Analysis Missing-Item Score UI Spec

## Goal

求人本文に採点に必要な情報が最初から書かれていない場合でも、その求人を評価対象から外さず、

1. **どの項目が未記載かを明示する**
2. **未記載項目は最低点として扱う**
3. **「内容が薄い求人である」という事実自体をユーザーへ返す**

ことを、UI と出力文言で一貫して実現する。

---

## Product framing

この仕様の前提は次の通り。

- らくしゅうの主価値は、まず **求人を貼ればその内容を採点できること**
- 次に **その採点基準をみんなで共有できること**
- 比較機能は重要だが、唯一の中心ではない
- したがって、情報が薄い求人は sign-off 母集団から除外するのではなく、**情報不足そのものを採点結果として返す**

---

## Current behavior snapshot

### Current user-facing behavior
- `unknown` / `不明` 表示はある
- ただし「本文に書かれていないため不明」なのか「解析に失敗したため不明」なのかが UI 上で分かりにくい
- 一部 rank は `UNKNOWN` として扱われ、**最低点としては見えない**
- Job 一覧 / 詳細 / チェックリスト / 解析要点で、未記載理由の見せ方が揃っていない

### Current relevant code paths
- Rank 算出: `src/lib/analysis/scoring.ts`
- Parsed shape: `src/lib/analysis/types.ts`
- Job 詳細画面と解析要点: `src/app/jobs/page.tsx`
- チェックリスト表示: `src/components/jobs/JobCheckList.tsx`
- 基準共有画面: `src/app/criteria/page.tsx`

---

## Problem to solve

非エンジニア視点では、今の `不明` は次の 2 パターンを混同しやすい。

1. **求人本文にそもそも書いていない**
2. **書いてあるかもしれないが、うまく取り切れていない**

今回の方針では、少なくとも user-facing result では 1 を明確に前へ出す。

つまり、ユーザーには

- 「解析できませんでした」
ではなく
- 「この求人はこの項目が未記載です」

と返す。

---

## Scope

### In scope
- 求人詳細画面での未記載項目表示
- JobCheckList の文言整理
- 解析要点の文言整理
- ランク表示での「最低点扱い」ルール
- 薄い求人用の summary / badge / callout 表示
- 将来の criteria 共有に耐える説明文の統一

### Out of scope
- parser fallback の追加
- holdout cohort の再定義
- 新しい comparison-grade sign-off 方式への切り替え
- LLM ベース補完

---

## User-facing policy

## 1. Missing item policy

採点に必要な項目が raw text に存在しない場合、その項目は:

- **未記載** と表示する
- 内部的には **source-thinness** として区別する
- user-facing score では **最低点** として扱う

### Target items (first phase)
まずは critical / 比較直結項目を優先する。

- 会社名
- 雇用形態
- 給与
- 年間休日

次点:
- 賞与制度
- 退職金制度
- 福利厚生
- 固定残業
- 休日制度

---

## 2. Display wording policy

### Do
- 「未記載」
- 「本文に記載が見当たりません」
- 「この求人は情報が薄めです」
- 「次の項目は本文未記載のため最低点扱いです」

### Don’t
- 「不明」だけで終える
- 「比較できません」で片づける
- parser failure と source-thinness を同じ文言で隠す

---

## 3. Lowest-score policy

### User-facing rule
- 本文未記載の critical item は、**ユーザーに見える採点結果では最低点** として扱う
- ただし内部では、次を区別して保持する
  - `missing_in_raw_text`
  - `unknown_due_to_parser`

### Why this split matters
- ユーザーには「その求人説明が弱い」ことを返したい
- しかし開発/評価では parser miss と source-thinness を混同したくない

### Recommended display behavior
- 詳細 UI の rank 表示では `UNKNOWN` をそのまま出さず、未記載由来なら **E + 未記載ラベル** に寄せる
- 開発/検証 artifact では raw status を保持し続ける

---

## UX design

## A. Job detail header area

### Add a thin-input alert box
場所:
- `src/app/jobs/page.tsx`
- 詳細パネル上部、総合ランクと主要メトリクスの下、解析要点の前

### Purpose
その求人が「採点不能」なのではなく、**本文が薄いので低く出ている** ことを即座に伝える。

### Example copy
- タイトル: `この求人は情報が薄めです`
- 本文: `採点に必要な情報の一部が本文に記載されていません。未記載項目は最低点として扱っています。`
- 箇条書き:
  - `雇用形態：本文未記載`
  - `年間休日：本文未記載`

### Display condition
以下のいずれかで表示:
- critical item の本文未記載が 1 件以上
- または missing secondary item が 3 件以上

---

## B. Detail metric cards

現状 `不明` と出している項目の一部を、未記載と明示する。

### Example replacements
- `不明` → `本文未記載`
- `－` → `未記載`
- `求人票を確認` → `本文未記載の可能性あり / 要原文確認`（勤務地など扱いが別なら保留）

### Rule
- raw text に signal がないと判定できる項目は `本文未記載`
- signal はあるが確定できない項目は `あいまい` または `要確認`
- parser miss 疑いは user-facing では原則直接出さない

---

## C. 解析要点 block

現状の「読み取れませんでした」を、未記載理由へ寄せる。

### Current-style examples
- `年間休日は求人票から読み取れませんでした。`

### Replace with
- `年間休日の記載が本文に見当たりませんでした。`
- `雇用形態の明記が本文に見当たりませんでした。`
- `給与の明記が本文に見当たりませんでした。`

### Add final summary line when thin-input
- `この求人は採点に必要な情報が不足しているため、未記載項目は最低点として扱っています。`

---

## D. JobCheckList

### Current issue
- `不明` が neutral/caution として出るだけで、未記載の重さが見えにくい

### New behavior
- 本文未記載なら value を `本文未記載` に変更
- tone は `caution` ではなく、未記載項目数が閾値超えなら `concern` に引き上げる

### Example
- 年間休日: `本文未記載`
- 雇用形態: `本文未記載`
- 福利厚生: `本文の情報が少ない`

---

## E. Total-rank explanation

総合ランクが低い/保留のとき、その原因が「怪しい条件」なのか「情報不足」なのかを分ける。

### Add one-line reason near rank
- `低評価の主因: 本文未記載項目が多い` 
- `低評価の主因: 条件が弱い` 
- `低評価の主因: 気になる表現が多い`

優先順位:
1. 本文未記載項目が多い
2. 条件が弱い
3. 警告表現が多い

---

## Data / domain design

## Recommended new derived concept

`ParsedJob` 自体を大きく壊さず、UI 層または analysis helper で次を導入する。

### `missingItemSummary`
```ts
type MissingItemKey =
  | "companyName"
  | "employmentType"
  | "salaryText"
  | "annualHolidays"
  | "bonusCount"
  | "retirementAllowance"
  | "benefits"
  | "fixedOvertimeHours"
  | "holidayType";

type MissingItemSummary = {
  missingInRawText: MissingItemKey[];
  ambiguousButVisible: MissingItemKey[];
  thinInput: boolean;
  thinInputReason: string[];
};
```

### Purpose
- scoring.ts とは別に user-facing explanation を安定化する
- UI 全体で同じ missing 判定を共有する
- docs / criteria 共有でも同じ言葉を再利用しやすくする

---

## Scoring behavior recommendation

## Current issue
- `UNKNOWN` は「採点不能」っぽく見える
- でも今回の product 方針は「採点不能ではなく、未記載として低く評価する」

## Recommended rule

### Internal scoring
- raw parser result は保持する
- `status: unknown` を消さない

### User-facing scoring adapter
別レイヤーで:
- `unknown + visible signalなし` → `lowest score due to missing_in_raw_text`
- `unknown + visible signalあり` → `unknown / 要確認`

### First-phase practical mapping
- fixedOvertime: 未記載なら `E` ではなく `UNKNOWN` 維持もありうるが、説明文は必ず「本文未記載」
- annualHolidays: 本文未記載なら user-facing rank は `E` 相当の見え方
- bonus / retirement / benefits: 同様に最低評価寄りで表示
- totalRank: 平均計算ロジックを直接壊す前に、まず explanation layer で整合を取る

### Safer rollout order
1. 文言とラベルを先に実装
2. missing summary を導入
3. user-facing rank adapter を追加
4. 必要なら scoring.ts 本体へ最低点ロジックを反映

こうすると既存評価 artifact との衝突を最小化できる。

---

## Criteria-sharing implications

基準共有画面では、将来的に次の説明が必要になる。

- この基準では「本文に書かれていない項目は低評価」と扱う
- つまり、評価は企業の条件だけでなく、**求人票の説明の丁寧さ** も反映する

これはむしろ共有価値が高い。
なぜなら、ユーザー同士で

- 条件が悪い求人
- 説明が雑な求人

を同じ採点基準の中で話せるから。

---

## Acceptance criteria

### UX acceptance
- ユーザーが詳細画面を見たとき、未記載項目を 3 秒以内に把握できる
- `不明` と `本文未記載` が使い分けられている
- thin-input 求人では「情報が薄い求人」という説明が出る
- 未記載項目が最低点扱いであることが明記される

### Product acceptance
- thin-input row を official cohort から外さずに扱える
- parser miss と source-thinness を docs / sign-off 上で混同しない
- 比較機能だけでなく、「求人を採点する」中核価値に沿った表示になる

### Implementation acceptance
- `src/app/jobs/page.tsx` に thin-input explanation を追加
- `src/components/jobs/JobCheckList.tsx` に未記載表現を追加
- missing summary の判定ロジックを 1 箇所へ寄せる
- user-facing 文言が複数箇所で矛盾しない

---

## Likely files to change

### First phase
- `src/app/jobs/page.tsx`
- `src/components/jobs/JobCheckList.tsx`
- `src/lib/analysis/types.ts`
- `src/lib/analysis/scoring.ts`

### Recommended new helper
- `src/lib/analysis/missing-items.ts`
  - missing summary 算出
  - thin-input 判定
  - label / copy helper

### Optional later phase
- `src/app/criteria/page.tsx`
- `src/lib/criteria/templates.ts`
- `docs/job-analysis-completion-criteria.md`

---

## Implementation order

### Phase 1: Explanation-first
1. missing summary helper を作る
2. Job detail に thin-input alert を出す
3. 解析要点を `本文未記載` 文言へ変更
4. JobCheckList の `不明` を文脈に応じて `本文未記載` へ置換

### Phase 2: Rank semantics
5. user-facing rank adapter を導入する
6. 未記載項目を最低点として見せる
7. 総合ランク理由に「本文未記載項目が多い」を追加

### Phase 3: Criteria-sharing alignment
8. 基準共有 UI でも「未記載は低評価」方針を説明する
9. 必要なら基準テンプレ文言へ反映する

---

## Open questions

1. user-facing 最低点は必ず `E` に寄せるか、`未評価/未記載` badge を併記するか
2. `UNKNOWN` を UI から完全に隠すか、一部 developer-facing surface に残すか
3. 勤務地など critical 外項目の「未記載」を first phase から同じ扱いにするか
4. criteria 共有画面で、企業条件の低さと説明不足の低さを同じランクに混ぜるか、補足ラベルで分けるか

---

## Recommended default answers

- Q1: first phase は `最低点 + 未記載ラベル` を推奨
- Q2: `UNKNOWN` は developer / evaluation artifacts に残し、user-facing UI では出さない
- Q3: first phase は critical 直結項目を優先
- Q4: ランクは同じでも、理由ラベルで `条件が弱い` と `情報が薄い` を分ける

---

## One-sentence product rule

> 本文に採点項目が書かれていない求人は除外しない。未記載項目を明示し、その欠落自体を最低点として採点結果に反映する。
