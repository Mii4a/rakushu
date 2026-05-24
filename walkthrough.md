# Walkthrough: job-analysis feedback completion sign-off

## 1. Source documents
- `docs/job-analysis-completion-criteria.md`
- `docs/evaluations/job-analysis-feedback-signoff-checklist.md`
- `docs/evaluations/job-analysis-holdout-2026-05-22-signoff-scorecard.csv`
- `docs/evaluations/job-analysis-holdout-2026-05-22-signoff-summary.md`
- `docs/evaluations/job-analysis-holdout-2026-05-22-signoff-notes.md`
- `docs/evaluations/job-analysis-holdout-2026-05-22-rerun-signoff-scorecard.csv`
- `docs/evaluations/job-analysis-holdout-2026-05-22-rerun-signoff-summary.md`
- `docs/evaluations/job-analysis-holdout-2026-05-22-rerun-signoff-notes.md`
- `docs/evaluations/job-analysis-holdout-2026-05-23-v1.6.1-rerun-signoff-scorecard.csv`
- `docs/evaluations/job-analysis-holdout-2026-05-23-v1.6.1-rerun-signoff-summary.md`
- `docs/evaluations/job-analysis-holdout-2026-05-23-v1.6.1-rerun-signoff-notes.md`

## 2. What was decided
- 判定対象は「feedback 実装の有無」ではなく「求人コピペ入力で比較判断に使えるか」
- 完成判定は 4 層で行う
  1. dataset readiness
  2. product-level usability
  3. extraction quality
  4. feedback-loop / regression safety
- 2026-05-22 sign-off は FAIL
- 2026-05-23 の v1.6.1 rerun でも FAIL だが、`job_board_listcard` は改善し、次の主戦場が `noisy_promo` / `company_careers` / `prose_heavy` に移った

## 3. Why it still failed
- dataset は足りた
- listcard recurring failure はかなり縮んだ
- でも `too_many_unknown_critical_fields` が `noisy_promo` / `company_careers` / `prose_heavy` でまだ common のまま残っていた
- observed feedback recall も低かった
- parser quality の改善と feedback-loop の observed evidence は分けて読む必要がある

Measured values (latest rerun):
- A+B: 66%
- C: 17/50
- critical 3/4+ usable: 66%
- critical 4/4 usable: 38%
- critical wrong present: 0%
- observed feedback recall: 36% (4/11)
- simulated public recall: 64% (21/33)
- fixture count: 19

## 4. What improved in v1.6.1
- `job_board_listcard:salary_text_without_base_salary` が 13 → 5 ではなく、v1.6.0 rerun 比で 7件ぶん解消
- `job_board_listcard:too_many_unknown_critical_fields` も 8件ぶん解消
- `holdout-candidate-015` は `C → B` に改善
- grade 悪化は 0件

## 5. Where to look first now
1. `holdout-candidate-035` - Green `company_careers` の薄い search card で、C 判定が parser 責任か入力不足かを先に切る
2. `holdout-candidate-014` - Green `company_careers` でも同じく input-insufficiency 寄りか、まだ recoverable 余地があるかを確認する
3. `holdout-candidate-047`, `049` - Wantedly `prose_heavy` で critical + benefits prose が落ちる cluster
4. `holdout-candidate-010`, `043`, `044` - Re就活 `noisy_promo` で `employmentType` / `annualHolidays` / `salaryText` が落ちる cluster
5. `job_board_detail:salary_text_without_base_salary` が残る 5件
6. observed feedback recall の未保存 7件

## 6. How to rerun verification
Rescore artifacts:
- `./node_modules/.bin/tsx scripts/rescore-job-analysis-holdout.ts --seed docs/evaluations/job-analysis-holdout-2026-05-22-rerun-signoff-scorecard.csv --output-prefix docs/evaluations/job-analysis-holdout-2026-05-23-v1.6.1-rerun-signoff --review-date 2026-05-23 --reviewer taro-bot`
- `./node_modules/.bin/dotenv -e .env.local -- ./node_modules/.bin/tsx scripts/rescore-job-analysis-holdout.ts --seed docs/evaluations/job-analysis-holdout-2026-05-23-v1.6.1-rerun-signoff-scorecard.csv --output-prefix docs/evaluations/job-analysis-holdout-2026-05-24-task5-db-check --review-date 2026-05-24 --reviewer taro-bot --observed-feedback-source db`

Focused tests:
- `npm test -- src/lib/analysis/quality.test.ts src/lib/analysis/parser.test.ts`

Full suite:
- `npm test`

Build:
- `npm run build`

## 7. How to judge done next time
最低でも次を満たすまで completed にしない。
- A+B 90%以上
- C 10%以下
- critical 3/4+ usable 90%以上
- critical 4/4 usable 75%以上
- critical wrong present 3%以下
- observed feedback recall 80%以上
- high-signal fixture 10件以上
- recurrence blocker なし

## 8. Important caveat
今回の 50件のうち 35件は public holdout raw text を parser rerun している。だから parser quality の fail 判定には強いが、feedback-loop については observed evidence と simulated evidence を混同しないこと。

## 9. Immediate execution order
1. `holdout-candidate-035` を raw text / parser output で再確認し、「取れないのが parser の責任か、入力の情報不足か」を先に切る
2. quality / signoff docs と `quality.ts` を読み、thin `company_careers` に generic critical-field gate を当てる妥当性を整理する
3. `014` も含めて input-insufficiency 寄りなら、company_careers は parser fix ではなく quality / signoff alignment を先に進める
4. `prose_heavy` cluster (`047`, `049`) の critical + benefits prose 抽出を強化する
5. `noisy_promo` cluster (`010`, `043`, `044`) の parser fallback を直す
6. `job_board_detail` に残る salary normalization の narrow fix を入れる
7. observed feedback recall の保存漏れ経路を潰す

## 10. Current execution note
- `holdout-candidate-035` は raw text 上で `companyName` / `salaryText` は見えるが、`employmentType` / `annualHolidays` は見えない thin card だった
- したがって `035` は parser の取りこぼし候補というより、quality / signoff が generic critical-field gate をどう適用するかの論点として扱う
- `014` も companyName / employmentType の raw text 露出が弱く、Green company_careers は parser hardening より quality / signoff alignment が先という仮説が強まった
- Wantedly prose-heavy は benefits prose fallback に加えて、本文後段の募集注記に出る `正社員募集` を拾う late-note fallback を追加した
- ただし `047` / `049` のように raw text 自体へ salary / annualHolidays / explicit employment が出ていないケースは、引き続き parser ではなく input thinness として扱う
- `job_board_detail:salary_text_without_base_salary` で残っていた `004` / `026` / `030` / `032` / `034` は、raw text と parser 出力を照合すると salaryText 自体は比較利用可能な structured detail だった
- そのため Track 4 では parser で無理に base salary を埋めるより、`quality.ts` 側で clean structured salary text を high-signal feedback から外す narrow fix を採用した
- fixture は `phase4-job-board-detail-annual-salary-usable-anon.txt` と `phase4-job-board-detail-monthly-salary-usable-anon.txt` を追加し、structured annual/monthly detail の両方で regression を固定した
- 夜間 QA は Hermes cron で repo 直下から focused analysis tests + build を回し、rakushu-dev に結果を返す想定
- Track 5 では `src/actions/job-actions.ts` の auto feedback insert を `src/lib/analysis/feedback.ts` に共通化し、current parser rerun と本番保存条件の drift を減らした
- `scripts/rescore-job-analysis-holdout.ts` は manifest preserve だけでなく DB 実測 (`--observed-feedback-source db`) でも observed subset を再採点できるようになった
- 2026-05-24 の DB rerun artifact では observed feedback recall は 3/10 (30%) のままで、parser rule 側の改善だけでは historical save 漏れはまだ埋まっていないことが確認できた
- 一方で public simulated subset は 22/30 (73%) まで上がっており、feedback gate の主因は historical observed save path 側に残っている

## 11. Subagent operating rule for this repo
- 親 agent に残す
  - 設計判断
  - 実装方針の採択
  - root cause analysis
  - 複数案比較
  - 大きめのリファクタ方針決め
  - docs / issue / plan の作成
- subagent に投げる
  - 関連箇所の洗い出し
  - ログ要約
  - 差分読み
  - 小さめの実装
  - テスト追加の叩き台
- subagent の出力はそのまま採用せず、親 agent が再編集して task / plan / docs に反映する
