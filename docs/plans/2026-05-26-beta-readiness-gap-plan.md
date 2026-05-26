# らくしゅう Beta Readiness Gap Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** らくしゅうが「初期ユーザーを募集して実地テストしてよい状態」かを判定し、未達ギャップを最短で埋める。

**Architecture:** readiness を 2 段階に分けて扱う。`guided private beta`（少人数・案内制・無料前提）と、`self-serve public beta`（不特定多数が自走利用）を分けて評価する。現状は前者なら到達可能、後者は未達という前提で、ギャップを明文化して潰す。

**Tech Stack:** Next.js App Router / TypeScript / Turso / Better Auth / Stripe / Cloudflare Workers / Vitest

---

## Current evidence snapshot

- `npm test` → **100 tests passed**
- `npm run build` → **production build passed**
- LP / demo / beta intake / marketing events 実装あり
- 認証・求人保存・比較・進捗管理・履歴保存あり
- parser sign-off (`docs/evaluations/job-analysis-holdout-2026-05-29-task21-thin-row-signoff-alignment-summary.md`) は **full-cohort FAIL**
- 同 sign-off の解釈では、残課題の中心は新規 parser bug 群というより **thin-input / low-visibility row をどう扱うか**
- Stripe live E2E は未確認

---

## Beta readiness levels

### Level 1: Guided private beta

対象:
- 3〜10人程度
- 募集文で「β版・改善中・案内制」を明示
- 必要なら運営が個別にフォローする
- 課金なし、または課金を前提にしない

合格条件:
1. アプリが落ちずに主要導線を触れる
2. コア価値（求人貼り付け→整理→保存→比較の一部）が実演できる
3. フィードバック回収導線がある
4. 重大な trust-breaking wrong が common path で頻発していない
5. 不安定なケースに対して、期待値を下げる文言または案内がある

### Level 2: Self-serve public beta

対象:
- 不特定多数へ広く案内
- ユーザーが説明なしで自走利用する
- 課金導線を含めて公開してよい水準

合格条件:
1. Guided private beta 条件をすべて満たす
2. parser sign-off が official rubric 上で少なくとも Conditional Pass
3. thin-input / 未記載ケースの user-facing 表示が揃っている
4. live billing E2E が完了している
5. support / recovery が運営依存でなく回る

---

## Current verdict

### Guided private beta
**Verdict: GO with constraints**

理由:
- build/test は通っている
- LP デモ、βフォーム、イベント計測、ログイン後の保存・比較・進捗管理がつながっている
- parser の recurring trust-breaking wrong は大きく減っている
- 初期ユーザーから「どの入力で困るか」を集める段階としては十分価値がある

ただし制約:
- 「すべての求人で安定比較できる」とは言わない
- low-visibility / prose-heavy / company-card 系は弱いことを前提に運用する
- 課金訴求を前面に出さない
- 初回ユーザーは少人数に絞る

### Self-serve public beta
**Verdict: NO-GO**

理由:
- official parser sign-off は full-cohort でまだ FAIL
- thin-input row の product policy が確定していない
- thin-input / 本文未記載の user-facing 説明が全画面で統一されていない
- Stripe live E2E が未確認

---

## Required operating rules for immediate guided beta

### Task 1: β募集文の期待値を固定する

**Objective:** 募集時の誤解を防ぎ、「まだ改善中の案内制 beta」であることを明示する。

**Files:**
- Modify: `src/app/beta/page.tsx`
- Modify: `src/components/beta-intake-form.tsx`
- Reference: `docs/x-launch-plan-2026-05-22.md`

**Step 1: Add constraint copy**
- 追記する要点:
  - まだ改善中のβ版
  - すべての求人媒体で完全対応ではない
  - 困りごとの強い人から案内

**Step 2: Add “best-fit user” copy**
- 向いているユーザー:
  - 求人票を比較するときに毎回迷う人
  - 応募管理まで試したい人
- 向いていないケース:
  - すぐに完璧な自動判定を期待する人

**Step 3: Verify copy tone**
Run: `npm run build`
Expected: PASS

---

### Task 2: 初期βの対象入力を明文化する

**Objective:** 今の parser が比較的強い入力と弱い入力を、運営ルールとして決める。

**Files:**
- Create: `docs/beta-user-ops.md`
- Reference: `docs/evaluations/job-analysis-holdout-2026-05-29-task21-thin-row-signoff-alignment-summary.md`
- Reference: `docs/evaluations/job-analysis-holdout-2026-05-29-task24-cohort-definition-decision-memo.md`

**Step 1: Write allowed/strong input examples**
- `job_board_detail`
- `job_board_listcard` のうち critical field が visible なもの

**Step 2: Write weak-input examples**
- `company_careers` の teaser/search card
- `prose_heavy`
- `noisy_promo`
- Wantedly / Green の low-visibility row

**Step 3: Define support behavior**
- weak-input の場合は「不具合」扱いせず、まず `本文未記載 / 要確認` の説明対象にする

---

### Task 3: beta feedback loop を運用可能な形で固定する

**Objective:** 初期ユーザーから来る定性/定量フィードバックを迷子にしない。

**Files:**
- Modify: `docs/beta-intake-and-traction-spec.md`
- Create: `docs/beta-feedback-review-loop.md`
- Reference: `src/actions/beta-actions.ts`
- Reference: `src/lib/marketing/events.ts`

**Step 1: Define weekly review cadence**
- 毎週見る数字:
  - `lp_view`
  - `demo_interaction_started`
  - `job_text_pasted`
  - `analysis_completed`
  - `beta_form_submit`

**Step 2: Define qualitative buckets**
- 期待と違った
- 入力が薄くて判定できない
- UIが分かりづらい
- 保存/比較/進捗管理が役立った

**Step 3: Define escalation path**
- parser bug
- input thinness
- onboarding/copy problem
- product scope mismatch

---

### Task 4: user-facing missing-item explanation をベータ必須ラインまで揃える

**Objective:** 未記載と抽出失敗の違いを、少なくとも主要画面で分かるようにする。

**Files:**
- Modify: `src/app/jobs/[id]/page.tsx`
- Modify: `src/app/jobs/page.tsx`
- Modify: `src/components/jobs/JobCheckList.tsx`
- Reference: `src/lib/analysis/missing-items.ts`
- Reference: `docs/job-analysis-missing-item-score-ui-spec.md`

**Step 1: Audit current labels**
- `本文未記載`
- `要確認`
- `不明`
の出方を一覧化する

**Step 2: Add short helper copy**
- `本文未記載`: 元の求人文に比較材料が見当たらない
- `要確認`: 書かれていそうだが自動整理が不安定

**Step 3: Verify top 3 surfaces**
- job new / result
- job detail
- jobs list

---

### Task 5: beta launch checklist を作る

**Objective:** 「募集してよいか」を感覚で決めないようにする。

**Files:**
- Create: `docs/beta-launch-checklist.md`

**Step 1: Add hard gates**
- `npm test` pass
- `npm run build` pass
- beta form submit works
- marketing events persist
- login works
- create/save/edit job works
- compare page opens

**Step 2: Add soft gates**
- 3件以上の自前手動シナリオで操作確認
- weak-input expectation copy reviewed
- feedback review owner decided

**Step 3: Add no-go items**
- common path で保存失敗
- login failure
- rawText 保存欠落
- build/test 赤

---

## Gaps to clear before self-serve public beta

### Task 6: evaluation population policy を official 化する

**Objective:** parser sign-off の official verdict 定義を固定する。

**Files:**
- Modify: `docs/job-analysis-completion-criteria.md`
- Modify: `docs/job-analysis-holdout-review-runbook.md`
- Modify: `docs/evaluations/job-analysis-feedback-signoff-checklist.md`
- Reference: `docs/evaluations/job-analysis-holdout-2026-05-29-task24-cohort-definition-decision-memo.md`

**Step 1: Choose official policy**
- A: full-cohort official
- B: comparison-grade official + thin-input separate

**Step 2: Rewrite docs to one interpretation**
- official verdict
- shadow verdict
- conditional pass meaning

**Step 3: Re-run holdout summary**
Run:
`./node_modules/.bin/tsx scripts/rescore-job-analysis-holdout.ts --seed docs/evaluations/job-analysis-holdout-2026-05-24-rerun-signoff-scorecard.csv --output-prefix /tmp/beta-policy-rerun --review-date 2026-05-26 --reviewer taro-bot --observed-feedback-source simulate`
Expected: summary regenerates cleanly

---

### Task 7: parser sign-off を official beta line まで上げる、または beta line 自体を policy で確定する

**Objective:** self-serve beta で説明可能な quality line にする。

**Files:**
- Reference: `docs/evaluations/job-analysis-holdout-2026-05-29-task21-thin-row-signoff-alignment-summary.md`
- Reference: `scripts/rescore-job-analysis-holdout.ts`
- Modify: parser/quality files only if a new parser-miss-worthy batch is confirmed

**Step 1: Reconfirm current row split**
- parser-miss-worthy rows
- thin-input rows

**Step 2: Avoid random fallback work**
- parser-miss-worthy evidence がない row は fix backlog に積まない

**Step 3: Declare target**
- self-serve beta は official verdict が少なくとも Conditional Pass になるまで待つ
  or
- policy上 full-cohort FAIL のままでも出すと決めるなら、その代わり user-facing limitation disclosure を強化する

---

### Task 8: Stripe live E2E を完了する

**Objective:** 課金導線込みの public beta を可能にする。

**Files:**
- Reference: `docs/stripe-activation-checklist.md`
- Reference: `docs/production-deploy.md`

**Step 1: Verify live env readiness**
- live key
- live webhook secret
- live price IDs
- billing portal settings

**Step 2: Run real E2E**
- checkout
- webhook sync
- portal cancellation

**Step 3: Record smoke test evidence**
- 実施日時
- plan
- webhook events
- DB subscription row

---

## Recommended execution order

1. β募集文の期待値を固定する
2. 初期βの対象入力を明文化する
3. beta feedback loop を運用化する
4. missing-item explanation を主要画面に揃える
5. beta launch checklist を作る
6. ここまで終わったら **guided private beta を開始**
7. その後に official sign-off policy を固定
8. Stripe live E2E を完了
9. self-serve public beta 判定へ進む

---

## Success criteria

### Guided private beta success
- build/test green
- 初期ユーザー募集ページとフォームが機能
- コア導線が手動確認済み
- input-thinness の期待値が説明されている
- feedback review owner / cadence が決まっている

### Self-serve public beta success
- guided private beta success を満たす
- official sign-off policy fixed
- parser beta line explained and accepted
- Stripe live E2E complete
- user-facing limitation disclosure complete
