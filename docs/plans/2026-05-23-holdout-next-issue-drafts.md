# Holdout rerun v1.6.1 次アクション issue drafts

> For Hermes: 親 agent がこの文書を元に issue / plan / 実装方針を確定する。subagent の調査結果は材料として使い、最終 wording は親が持つ。

## Summary
v1.6.1 rerun で `job_board_listcard` は大きく改善した。
次の blocker は 3 束に絞れた。

1. Re就活 `noisy_promo` critical-field hardening
2. Green `company_careers` top-line fallback 強化
3. Wantedly `prose_heavy` critical + benefits prose 抽出強化

---

## Issue 1: Re就活 noisy_promo で critical-field miss を減らす

**Why now**
- latest blocker: `noisy_promo:too_many_unknown_critical_fields = 6`
- representative rows: `holdout-candidate-010`, `043`, `044`
- `holdout-candidate-010` は `employmentType` / `annualHolidays` miss で comparison unusable

**Scope**
- `src/lib/analysis/parser.ts`
- `src/lib/analysis/parser.test.ts`
- new fixtures under `fixtures/jobs/`

**Non-scope**
- feedback-save path 修正
- broad quality gate redesign
- unrelated Green / Wantedly prose fixes

**Acceptance**
- `noisy_promo` cluster の recurring `too_many_unknown_critical_fields` を 6 → 2 以下へ下げる
- `holdout-candidate-010` を comparison usable に引き上げる
- `043` / `044` が少なくとも悪化しない
- focused parser tests green

**Suggested fixtures**
- `holdout-candidate-010`
- `holdout-candidate-043`
- `holdout-candidate-044`

**Implementation hint**
- Re就活系の logged-in nav / CTA ノイズを跨いで、summary / headline / section fallback から `employmentType` / `annualHolidays` / `salaryText` を拾う

---

## Issue 2: Green company_careers の quality / signoff 先行整理

**Why now**
- latest blocker: `company_careers:too_many_unknown_critical_fields = 6`
- representative rows: `holdout-candidate-014`, `035`
- `014` は `companyName` / `employmentType` miss
- `035` は `employmentType` / `annualHolidays` miss で、raw text 自体がかなり薄い
- 少なくともこの 2 行は parser recoverable miss というより input insufficiency 寄りの疑いが強い

**Scope**
- `docs/job-analysis-completion-criteria.md`
- `src/lib/analysis/quality.ts`
- `src/lib/analysis/quality.test.ts`
- signoff / evaluation notes under `docs/evaluations/`

**Non-scope**
- noisy_promo cluster 修正
- Wantedly prose-wide fallback
- feedback persistence path
- raw text に存在しない critical field を parser で無理に埋めること

**Acceptance**
- `014` / `035` のような thin card を parser fix と quality論点に切り分けて説明できる
- current gate が shape-agnostic な generic rule なのか、company_careers を暗黙に厳しく見ているのかを docs / code / tests で一致させる
- quality / signoff wording を更新した場合は focused quality tests green

**Suggested evidence rows**
- `holdout-candidate-014`
- `holdout-candidate-035`
- nearby reference: `fixtures/jobs/phase3-green-company-search-card-anon.txt`
- nearby reference: `fixtures/jobs/phase3-green-company-search-card-condensed-topline-anon.txt`

**Implementation hint**
- まず `014` / `035` の raw text に critical field がどこまで現れているかを再確認する
- そのうえで、thin company-authored search card に generic critical-field gate をそのまま当てるか、shape note を追加するかを quality / signoff 側で明文化する
- parser fallback は、別の recoverable `company_careers` 代表行が見つかったときだけ新規 issue として切り出す

---

## Issue 3: Wantedly prose-heavy で critical と benefits の prose 抽出を強化する

**Why now**
- latest blocker: `prose_heavy:too_many_unknown_critical_fields = 5`
- additional blocker: `prose_heavy:benefits_suspected_but_not_extracted = 3`
- representative rows: `holdout-candidate-047`, `049`
- 両方とも `employmentType` / `salaryText` / `annualHolidays` miss + benefits prose miss

**Scope**
- `src/lib/analysis/parser.ts`
- `src/lib/analysis/parser.test.ts`
- `src/lib/analysis/quality.ts`
- `src/lib/analysis/quality.test.ts`
- new fixtures under `fixtures/jobs/`

**Non-scope**
- Green company card fixes
- Re就活 noisy promo fixes
- feedback-save observed subset repair

**Acceptance**
- `prose_heavy` の recurring `too_many_unknown_critical_fields` を 5 → 2 以下へ下げる
- `benefits_suspected_but_not_extracted` を 3 → 1 以下へ下げる
- `047` / `049` の critical usable count を 1/4 から改善する
- focused parser / quality tests green

**Suggested fixtures**
- `holdout-candidate-047`
- `holdout-candidate-049`
- nearby reference: `fixtures/jobs/phase1-mixed-prose-anon.txt`
- nearby reference: `fixtures/jobs/phase1-benefits-summary-anon.txt`

**Implementation hint**
- Wantedly 長文 prose block から company / employment / salary / annualHolidays を拾う global fallback を限定付きで追加し、福利厚生 prose の narrow fallback も足す

---

## Follow-up after the 3 issues
1. `job_board_detail` に残る `salary_text_without_base_salary` 5件を narrow fix
2. observed feedback recall 36% の保存漏れを別 track で調査
3. same 50-row rubric を rerun して sign-off 再判定
