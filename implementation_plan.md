# Job-analysis Feedback Completion Recovery Plan

Goal: FAIL 判定になった sign-off を、次の 1 ラウンドで Conditional Pass 以上へ持っていくための実装順を固定する。

Architecture:
- v1.6.1 で `job_board_listcard` は大きく改善したため、次は `noisy_promo` / `company_careers` / `prose_heavy` の common shape parser failure を縮める。
- 残る `job_board_detail` の salary normalization は narrow fix として後段で回収する。
- parser の取りこぼしを fixture + test へ固定したうえで、最後に observed feedback-save 漏れを補修する。

Tech stack:
- Next.js app router
- TypeScript parser under `src/lib/analysis/`
- Vitest
- evaluation docs under `docs/evaluations/`

---

## Track 1: noisy_promo critical-field hardening
Objective: `noisy_promo` shape の recurring `too_many_unknown_critical_fields` を最優先で減らす。

Files:
- Modify: `src/lib/analysis/parser.ts`
- Modify: `src/lib/analysis/parser.test.ts`
- Add fixture(s): `fixtures/jobs/`
- Reference: `docs/evaluations/job-analysis-holdout-2026-05-23-v1.6.1-rerun-signoff-scorecard.csv`

Steps:
1. `holdout-candidate-010`, `043`, `044` の raw text を確認し、Re就活系 logged-in nav / CTA ノイズと critical miss の recurring shape を束ねる
2. 3件を anonymized fixture として `fixtures/jobs/phase3-rekatsu-noisy-promo-*.txt` に固定する
3. `employmentType` / `annualHolidays` / `salaryText` が top summary から落ちるパターンを parser trace で確認する
4. noisy_promo で summary / headline / section fallback を追加する failing parser test を先に書く
5. minimal fix を `parser.ts` に入れる
6. focused parser tests を通す

Success condition:
- `noisy_promo:too_many_unknown_critical_fields` recurring count が 6 → 2 以下になる
- `holdout-candidate-010` が comparison usable へ上がる

Nightly QA add-on:
- Hermes cron で `npm test -- src/lib/analysis/parser.test.ts src/lib/analysis/quality.test.ts && npm run build` を夜間実行し、失敗時だけでなく成功時も要約を返す job を作る

## Track 2: Green company_careers triage and hardening
Objective: `company_careers` shape の `too_many_unknown_critical_fields` について、parser で救えるケースと入力不足で quality 側判断が必要なケースを分離する。

Files:
- Modify: `src/lib/analysis/parser.ts`
- Modify: `src/lib/analysis/parser.test.ts`
- Add fixture(s): `fixtures/jobs/`
- Reference: `docs/evaluations/job-analysis-holdout-2026-05-23-v1.6.1-rerun-signoff-scorecard.csv`

Steps:
1. `holdout-candidate-014` と `035` の raw text / parser output を比較し、`companyName` / `employmentType` / `annualHolidays` の落ち方を切り分ける
2. `035` で critical field の原文露出が薄いなら、parser fix 対象から外して quality / signoff docs の論点として明示する
3. `014` も含めて representative row が input-insufficiency 寄りなら、company_careers は parser fix より quality / signoff 整理を先に進める
4. recoverable な company-authored compressed prose case が別途見つかった場合に限って `companyName` / `employmentType` / `salaryText` / `annualHolidays` の narrow fallback を検討する
5. false positive guardrail を先に書く
6. fixture と parser test を追加する
7. `npm test -- src/lib/analysis/parser.test.ts`

Success condition:
- company_careers の C 行を「parser fix 対象」と「入力不足ゆえ quality 整理対象」に分けて説明できる
- representative row が input-insufficiency 寄りなら、Issue を parser hardening ではなく quality / signoff alignment へ切り替える根拠が残る

## Track 3: Wantedly prose-heavy fallback
Objective: prose-heavy で critical field が全滅するケースを減らす。

Files:
- Modify: `src/lib/analysis/parser.ts`
- Modify: `src/lib/analysis/parser.test.ts`
- Modify: `src/lib/analysis/quality.ts`
- Modify: `src/lib/analysis/quality.test.ts`
- Add fixture(s): `fixtures/jobs/`

Steps:
1. `holdout-candidate-047` と `049` を読み、Wantedly 長文 prose で落ちている `employmentType` / `salaryText` / `annualHolidays` / `benefits` の共通パターンを確認する
2. prose block から company / employment / salary / annualHolidays を探す global fallback を限定付きで追加する
3. 福利厚生 prose 抽出の narrow fallback を追加する failing test を先に書く
4. 後段の注意書き・募集注記に出る `正社員募集` のような late note も recover できるかを別 fixture で確認する
5. `unknown` 優先原則を壊さない minimal fix を入れる
6. focused parser / quality tests を通す

Success condition:
- prose_heavy の `too_many_unknown_critical_fields` を 5 → 2 以下へ落とす
- prose_heavy の `benefits_suspected_but_not_extracted` を 3 → 1 以下へ落とす

## Track 4: job_board_detail salary normalization cleanup
Objective: `job_board_detail` に残る `salary_text_without_base_salary` 5件を narrow fix で減らす。

Files:
- Modify: `src/lib/analysis/quality.ts`
- Modify: `src/lib/analysis/quality.test.ts`
- Modify: `src/lib/analysis/parser.test.ts`
- Add fixture(s): `fixtures/jobs/`

Steps:
1. `job_board_detail:salary_text_without_base_salary` に残っていた 5件（`004`, `026`, `030`, `032`, `034`）を洗い出し、annual salary only ではなく「salaryText 自体は comparison-usable な structured detail」クラスタとして再解釈する
2. clean structured salary text を high-signal failure にしない failing tests を fixture-backed で先に書く
3. `quality.ts` の `needsBaseSalaryNormalization` を narrow にし、`section` / `direct_label` 由来の clean numeric salary text は feedback-worthy failure から外す
4. focused parser / quality tests を通す

Success condition:
- `job_board_detail:salary_text_without_base_salary` を 5 → 2 以下へ落とす
- structured detail の clean salary text は comparison-usable として扱われ、high-signal feedback のノイズにならない

## Track 5: feedback-save observed recall repair
Objective: observed saved-job subset で `feedback_expected=yes` なのに未保存になる経路を潰す。

Files:
- Inspect: feedback save action / DB write path related files
- Modify: implementation target discovered during inspection
- Add tests near that path
- Update docs if save criteria change

Steps:
1. `analysis_id` 付き observed subset 11件の expected feedback row を比較し、未保存 7件の差分を特定する
2. current `shouldCreateFeedback(report)` と実保存経路の条件差を洗う
3. duplicate suppression と noise guard を壊さず保存漏れを埋める
4. observed subset ベースで再採点する
5. DB 実測で rerun できるよう `scripts/rescore-job-analysis-holdout.ts --observed-feedback-source db` を整備し、manifest preserve と切り替えて比較できる状態にする
6. 賞与 / 退職金 keyword miss のような secondary-field parser miss を observed feedback save-worthiness に含めるかを scorecard と一致させる

Success condition:
- observed feedback recall を 36% → 80%以上へ上げる

## Track 6: regression safety minimum line
Objective: sign-off の最低限の regression gate を通す。

Files:
- Add fixtures under `fixtures/jobs/`
- Modify matching parser/quality tests
- Keep summary docs updated

Steps:
1. high-signal fixture を追加し、current fixture count 19 を保ったまま新しい blocker を fixture-backed 化する
2. fixture ごとに parser test か quality test を結びつける
3. `npm test -- src/lib/analysis/quality.test.ts src/lib/analysis/parser.test.ts`
4. `npm test`
5. `npm run build`

Success condition:
- 新規 blocker 3束が fixture-backed になっている
- focused tests / full tests / build すべて green

## Re-review trigger
次の再レビューは、Track 1〜6 の success condition を満たしてから行う。再評価は同じ holdout 50件 rubric を使い、`scripts/rescore-job-analysis-holdout.ts` で scorecard / summary / notes を再生成したうえで、新しい日付 prefix を付けて保存する。

## Issue drafting note
issue 化は次の3束で扱う。
1. Re就活 `noisy_promo` critical-field hardening（`holdout-candidate-010`, `043`, `044`）
2. Green `company_careers` top-line fallback 強化（`holdout-candidate-014`, `035`）
3. Wantedly `prose_heavy` critical + benefits prose 抽出強化（`holdout-candidate-047`, `049`）
