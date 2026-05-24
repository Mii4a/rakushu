# Parser Feedback Hardening Phase 1 Implementation Plan

> For Hermes: Use subagent-driven-development skill to implement this plan task-by-task.

Goal: parser feedback から高シグナル失敗を fixture 化し、求人解析の壊れやすい summary-line ケースに対して salary / benefits fallback を強化する。

Architecture: 既存の deterministic parser を維持しつつ、失敗の再現性を fixtures/jobs と parser.test.ts に寄せる。Phase 1 は parser 全分割には入らず、fixture 追加 → failing test → minimal parser hardening の順で進める。quality.ts の failure signal は活かし、parser.ts の summary-line / global-scan fallback を局所強化する。

Tech Stack: Next.js 15, TypeScript, Vitest, existing parser in src/lib/analysis/parser.ts

---

## Current grounding

確認済みファイル:
- `docs/job-analysis-stability-plan.md`
- `src/lib/analysis/parser.ts`
- `src/lib/analysis/parser.test.ts`
- `src/lib/analysis/types.ts`
- `src/lib/analysis/quality.ts`
- `src/app/internal/parser-feedback/page.tsx`
- `src/lib/jobs/latest-analysis-feedback.ts`

現状把握:
- parser 本体は `src/lib/analysis/parser.ts` に集中している
- fixture は `fixtures/jobs/` に 2 件だけある
  - `sns-media-anon.txt`
  - `media-summary-anon.txt`
- quality evaluator はすでにあり、`salary_text_without_base_salary` と `benefits_suspected_but_not_extracted` を高優先 failure として扱っている
- internal feedback UI もあるため、今不足しているのは「再現 fixture の厚み」と「summary line / prose-heavy post への deterministic fallback」

## Scope for this phase

この plan でやること:
1. high-signal feedback を fixture 化しやすい形に整理
2. `salaryText` fallback を summary line / prose で強化
3. `benefits` fallback を summary line / prose で強化
4. 失敗再現テストを追加

この phase でやらないこと:
- parser.ts の全面分割
- low-confidence LLM fallback
- feedback status 更新 UI
- schema migration

---

### Task 1: fixture 候補の受け皿を増やす

Objective: 既存 fixture ディレクトリに phase1 用の匿名求人 fixture を追加できる状態を作る。

Files:
- Create: `fixtures/jobs/README.md`
- Create: `fixtures/jobs/phase1-salary-summary-anon.txt`
- Create: `fixtures/jobs/phase1-benefits-summary-anon.txt`
- Create: `fixtures/jobs/phase1-mixed-prose-anon.txt`

Step 1: Write the fixture policy file

Content to write in `fixtures/jobs/README.md`:
```md
# Job Fixtures

- すべて匿名化済み本文のみを置く
- 会社名、住所、URL、担当者名、電話番号はダミー化する
- parser failure を再現するのに必要な行だけ残す
- 命名は `phase{n}-{failure-shape}-anon.txt` を使う
- 新しい fixture を追加したら、対応する parser test を同時に追加する
```

Step 2: Add salary-summary fixture

Example content for `fixtures/jobs/phase1-salary-summary-anon.txt`:
```txt
株式会社サンプルキャリア / 正社員 / 東京都新宿区 / 年収320万円〜420万円
求人のポイント：未経験歓迎、研修あり
待遇：社会保険完備、交通費支給、資格手当
勤務時間：9:00〜18:00
休日休暇：完全週休2日制（土日祝）、年間休日125日
```

Step 3: Add benefits-summary fixture

Example content for `fixtures/jobs/phase1-benefits-summary-anon.txt`:
```txt
合同会社ワークデザイン
Web運用サポート 正社員
月給24万円〜28万円
福利厚生は充実。社会保険完備、交通費支給、住宅手当、書籍購入補助あり。
完全週休2日制、年間休日120日以上。
```

Step 4: Add mixed-prose fixture

Example content for `fixtures/jobs/phase1-mixed-prose-anon.txt`:
```txt
株式会社キャリアノートでは、採用広報を支える編集アシスタントを募集します。
雇用形態は正社員。想定年収は300万円〜360万円です。
福利厚生として社会保険完備、PC支給、通勤手当、社宅制度を用意。
休日は完全週休2日制（土日祝）で、年間休日は123日です。
```

Step 5: Verify files exist

Run:
```bash
python - <<'PY'
from pathlib import Path
for p in [
    'fixtures/jobs/README.md',
    'fixtures/jobs/phase1-salary-summary-anon.txt',
    'fixtures/jobs/phase1-benefits-summary-anon.txt',
    'fixtures/jobs/phase1-mixed-prose-anon.txt',
]:
    print(p, Path(p).exists())
PY
```
Expected: all `True`

Step 6: Commit

```bash
git add fixtures/jobs/README.md fixtures/jobs/phase1-*.txt
git commit -m "test: add phase1 parser fixtures"
```

---

### Task 2: failing tests で salary / benefits の期待値を固定する

Objective: 現在落ちるか不安定な抽出ケースを parser test に明文化する。

Files:
- Modify: `src/lib/analysis/parser.test.ts`

Step 1: Add salary summary fixture test

Append a test like:
```ts
it("extracts salary text from summary-style fixture", () => {
  const raw = readFixture("phase1-salary-summary-anon.txt");

  const parsed = parseJobText(raw);

  expect(parsed.companyName.value).toBe("株式会社サンプルキャリア");
  expect(parsed.employmentType.value).toBe("正社員");
  expect(parsed.salaryText.status).toBe("found");
  expect(parsed.salaryText.value).toContain("320万円〜420万円");
  expect(parsed.benefits.value).toEqual(
    expect.arrayContaining(["社会保険完備", "交通費支給", "資格手当"])
  );
});
```

Step 2: Add benefits prose fixture test

```ts
it("extracts benefits from prose-heavy fixture", () => {
  const raw = readFixture("phase1-benefits-summary-anon.txt");

  const parsed = parseJobText(raw);

  expect(parsed.salaryText.status).toBe("found");
  expect(parsed.salaryText.value).toContain("24万円〜28万円");
  expect(parsed.benefits.value).toEqual(
    expect.arrayContaining(["社会保険完備", "交通費支給", "住宅手当", "書籍購入補助"])
  );
  expect(parsed.housingAllowance.status).toBe("found");
});
```

Step 3: Add mixed prose fixture test

```ts
it("extracts salary and benefits from mixed prose fixture", () => {
  const raw = readFixture("phase1-mixed-prose-anon.txt");

  const parsed = parseJobText(raw);

  expect(parsed.employmentType.value).toBe("正社員");
  expect(parsed.salaryText.status).toBe("found");
  expect(parsed.salaryText.value).toContain("300万円〜360万円");
  expect(parsed.benefits.value).toEqual(
    expect.arrayContaining(["社会保険完備", "PC支給", "通勤手当", "社宅制度"])
  );
  expect(parsed.companyHousing.status).toBe("found");
});
```

Step 4: Run the focused test file

Run:
```bash
npm test -- src/lib/analysis/parser.test.ts
```
Expected: at least the new tests fail before implementation if fallback is missing

Step 5: Commit

```bash
git add src/lib/analysis/parser.test.ts
git commit -m "test: lock parser fallback expectations"
```

---

### Task 3: salaryText の summary-line fallback を最小追加する

Objective: 明示見出しがなくても、先頭数行や prose から給与テキストを deterministic に拾えるようにする。

Files:
- Modify: `src/lib/analysis/parser.ts`
- Test: `src/lib/analysis/parser.test.ts`

Step 1: Locate the salary extraction function

Search for salary extraction logic in `src/lib/analysis/parser.ts` and identify where `salaryText` is assigned.

Run:
```bash
rg -n "salaryText|年収|月給|給与" src/lib/analysis/parser.ts
```
Expected: function(s) responsible for salary extraction

Step 2: Add a helper for summary/prose salary capture

Add a helper shaped like:
```ts
function findSalaryTextInLines(context: ParserContext): ExtractedValue<string> | null {
  const lines = context.text
    .split("\n")
    .map((line) => normalizeLineValue(line))
    .filter((line) => line.length > 0)
    .slice(0, 12);

  for (const line of lines) {
    if (/(年収\s*[:：]?\s*[^\n]+|月給\s*[:：]?\s*[^\n]+|給与\s*[:：]?\s*[^\n]+)/.test(line)) {
      return found(line, line, "summary_line", "medium");
    }
  }

  const proseMatch = captureByRegex(context.text, [
    /(想定年収は[^。\n]+(?:円|万円))/,
    /(月給[^。\n]+(?:円|万円))/,
    /(年収[^。\n]+(?:円|万円))/
  ]);
  if (proseMatch) {
    return found(proseMatch[1] ?? proseMatch[0], proseMatch[0], "global_scan", "medium");
  }

  return null;
}
```

Step 3: Wire helper into salary extraction order

Order should be:
1. direct label
2. section
3. summary line
4. prose/global scan
5. unknown

Step 4: Re-run focused tests

Run:
```bash
npm test -- src/lib/analysis/parser.test.ts
```
Expected: salary-related new tests pass

Step 5: Commit

```bash
git add src/lib/analysis/parser.ts src/lib/analysis/parser.test.ts
git commit -m "feat: add salary summary-line fallback"
```

---

### Task 4: benefits の summary/prose fallback を最小追加する

Objective: 福利厚生セクションがなくても、待遇説明文から benefit token を抽出できるようにする。

Files:
- Modify: `src/lib/analysis/parser.ts`
- Test: `src/lib/analysis/parser.test.ts`

Step 1: Add a benefit token extractor helper

Add a helper shaped like:
```ts
const benefitTokens = [
  "社会保険完備",
  "交通費支給",
  "交通費",
  "通勤手当",
  "住宅手当",
  "社宅制度",
  "社宅あり",
  "書籍購入補助",
  "PC支給",
  "資格手当"
] as const;

function collectBenefitTokens(text: string): string[] {
  const foundTokens: string[] = [];
  for (const token of benefitTokens) {
    if (text.includes(token)) foundTokens.push(token);
  }
  return Array.from(new Set(foundTokens));
}
```

Step 2: Add summary/prose fallback for benefits

Use extraction order:
1. benefits-related section
2. summary line / prose scan over full text
3. unknown if nothing found

Suggested shape:
```ts
const proseBenefits = collectBenefitTokens(context.text);
if (proseBenefits.length > 0) {
  return found(proseBenefits, proseBenefits.join(" / "), "global_scan", "medium");
}
```

Step 3: Ensure existing housing/company housing signals still work

New fallback must not suppress:
- `housingAllowance`
- `companyHousing`
- `warnings`

Step 4: Re-run focused parser tests

Run:
```bash
npm test -- src/lib/analysis/parser.test.ts
```
Expected: benefits-related new tests pass and existing tests remain green

Step 5: Commit

```bash
git add src/lib/analysis/parser.ts src/lib/analysis/parser.test.ts
git commit -m "feat: add benefits prose fallback"
```

---

### Task 5: quality signal と fixture 運用をつなぐ

Objective: 新しい parser fallback が high-signal failure を減らしたか確認できる状態にする。

Files:
- Modify: `docs/job-analysis-stability-plan.md`
- Optional note: `fixtures/jobs/README.md`

Step 1: Add a short phase1 completion note

Append under `Immediate Next Tasks` or a new section:
```md
## Phase 1 execution note
- phase1-salary-summary-anon.txt を追加
- phase1-benefits-summary-anon.txt を追加
- phase1-mixed-prose-anon.txt を追加
- salaryText / benefits の summary/prose fallback を追加
- 次は internal parser feedback から open/high を 5件以上 fixture 化する
```

Step 2: Verify no test regressions

Run:
```bash
npm test
```
Expected: full test suite passes

Step 3: Commit

```bash
git add docs/job-analysis-stability-plan.md fixtures/jobs/README.md
git commit -m "docs: record parser phase1 hardening"
```

---

## Verification checklist

- [ ] `fixtures/jobs/` に phase1 fixture が 3 件増えている
- [ ] `src/lib/analysis/parser.test.ts` に fixture ベース test が追加されている
- [ ] `salaryText` が summary/prose でも `found` になる
- [ ] `benefits` が summary/prose でも `found` になる
- [ ] `housingAllowance` / `companyHousing` の既存判定が壊れていない
- [ ] `npm test -- src/lib/analysis/parser.test.ts` が通る
- [ ] `npm test` が通る

## Risks / pitfalls

- benefit token を増やしすぎるとノイズ語まで benefits 扱いになる
- salary prose regex を広げすぎると誤抽出しやすい
- summary line fallback を優先しすぎると、正確な section 抽出を上書きする危険がある
- fixture を増やす時に匿名化が甘いと生データ混入リスクがある

## Recommended next phase after this plan

1. `section map` を `parser.ts` から分離
2. internal parser feedback の open/high を定期的に fixture 化
3. failureType ごとのテスト命名と fixture 命名を統一
4. `ExtractedValue` の confidence/source を UI 側でも見えるようにする
