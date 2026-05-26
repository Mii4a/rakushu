# Job-analysis Feedback Completion Recovery Plan

Goal: FAIL 判定になった sign-off を、次の 1 ラウンドで Conditional Pass 以上へ持っていくための実装順を固定する。

Current focus:
- fallback を増やす前に、evaluation population definition を固定する。
- UI / helper 側では `missing in raw text` と `visible but extraction failed` を分けて出し、UNKNOWN の信用度を落とさない。
- 実装はまず missing-item helper と thin-input callout を入れ、sign-off memo では `full-cohort FAIL維持案` と `cohort分離してConditional Pass線を作る案` を横並び比較する。

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

## Track 6: observed feedback denominator + historical backfill repair
Objective: observed feedback gate を、current parser rule と historical DB state のズレ込みで false fail にしない状態へ戻す。

Files:
- Modify: `scripts/rescore-job-analysis-holdout.ts`
- Modify: `docs/job-analysis-completion-criteria.md`
- Modify: `docs/job-analysis-holdout-review-runbook.md`
- Modify: `docs/evaluations/job-analysis-feedback-signoff-checklist.md`
- Inspect/modify: historical feedback repair path around `src/actions/job-actions.ts`, analysis persistence, and feedback insert helpers
- Add tests near save-rule / evaluation logic

Steps:
1. observed subset の `feedback_expected=yes && feedback_saved=no` 行を、`historical save-path drift` / `rule mismatch` / `parser-quality issue` に分類する
2. `holdout-candidate-014` を基準に、thin-input `company_careers` で raw text に比較用 critical field が露出していない row を observed denominator に入れる条件を docs / rescore script で揃える
3. current `shouldCreateFeedback(report)` が save-worthy とみなす failure type（`negative_base_salary_detected`, `bonus_count_unknown_with_keyword`, `retirement_allowance_unknown_with_keyword` など）をテストで固定する
4. historical analysis に対して不足 feedback を backfill / repair する最小スコープを決め、duplicate suppression を壊さない導線を設計する
   - `scripts/backfill-job-analysis-feedback.ts` を追加し、`job_analysis_feedback` 欠損 analysis を列挙して current parser + `shouldCreateFeedback` で再判定する
   - `job_analysis_feedback.job_analysis_id` unique を前提に、`onConflictDoNothing` で冪等実行にする
   - first pass dry-run 実測: missing 19件中 7件が insert 対象、12件は current rule では not expected。apply は sign-off 後に限定する
5. `updateJobAction` など rawText 更新後の再解析経路で latest analysis / feedback が stale のまま残らないかを確認し、future drift 防止策を入れる
6. DB 実測で observed feedback recall を再採点し、simulated / observed を分離した summary に更新する

Success condition:
- thin-input `company_careers` の expected feedback ルールが docs / script / checklist で一致している
- current save-worthiness の回帰テストが追加されている
- historical observed miss のうち rule mismatch / save-path drift が説明なしに残らない
- DB 実測の observed feedback recall が 80%以上、または残件が明示的に historical-only と説明できる

## Track 7: regression safety minimum line
Objective: sign-off の最低限の regression gate を通す。

Files:
- Add fixtures under `fixtures/jobs/`
- Modify matching parser/quality tests
- Keep summary docs updated

Steps:
1. high-signal fixture を追加し、current fixture count 28 を保ったまま新しい blocker を fixture-backed 化する
2. fixture ごとに parser test か quality test を結びつける
3. `npm test -- src/lib/analysis/quality.test.ts src/lib/analysis/parser.test.ts`
4. `npm test`
5. `npm run build`

Success condition:
- 新規 blocker 3束が fixture-backed になっている
- focused tests / full tests / build すべて green

## Track 8: benefits-signal hardening for listcard / noisy-promo edges
Objective: visible benefits prose があるのに alias や generic hint ノイズでズレる cluster を減らす。

Files:
- Modify: `src/lib/analysis/parser.ts`
- Modify: `src/lib/analysis/parser.test.ts`
- Modify: `src/lib/analysis/quality.ts`
- Modify: `src/lib/analysis/quality.test.ts`
- Modify: `scripts/rescore-job-analysis-holdout.ts`
- Add fixture(s): `fixtures/jobs/phase4-*.txt`

Steps:
1. `holdout-candidate-016`, `022`, `042` の raw text / parser output / quality signal を比較し、actual benefit alias miss と false positive hint を分離する
2. `副業OK`, `在宅OK`, `リモート可`, `フレックスOK`, `ネイル服装自由` など listcard teaser の alias を parser fallback に追加する
3. summary-line benefits を壊さないよう、exact keyword / summary fallback / alias fallback の順序を test で固定する
4. `制度` / `手当` のような汎用語だけで benefits suspected にしない narrow hint 判定を quality と rescore script の両方へ揃える
5. focused parser / quality tests を通し、holdout rerun で cluster が縮んだか確認する
6. 残件 `020`, `037`, `048` で title/company-card/prose workstyle line 上の remote/flex signal を benefits alias として回収する

Success condition:
- `holdout-candidate-016` と `042` が `benefits: present_and_correct` へ上がる
- `holdout-candidate-022` が `benefits_eval=not_present` かつ `benefits_suspected_but_not_extracted=no` になる
- secondary `benefits present_but_missed` を 4 → 0 まで減らす
- `benefits_suspected_but_not_extracted` recurring cluster を 0 にする

## Track 9: negative-base-salary cleanup for polluted monthly lines
Objective: `negative_base_salary_detected` の残り2件を、月給レンジ行と手当サブ行の混線を解いて 0 にする。

Files:
- Modify: `src/lib/analysis/parser.ts`
- Modify: `src/lib/analysis/parser.test.ts`
- Modify: `src/lib/analysis/quality.test.ts`
- Add fixture(s): `fixtures/jobs/phase4-negative-base-salary-*.txt`
- Rerun: `docs/evaluations/job-analysis-holdout-2026-05-27-task12-negative-base-salary-v1-*`

Steps:
1. `holdout-candidate-003` と `011` の raw text / parser output / quality failure を比較し、negative 値の発生が parser miss か evaluator miss かを切り分ける
2. `月給` 行に含まれる本体レンジと、`外勤手当 10,000円/月` のような補助額を fixture-backed で分離する failing tests を先に書く
3. monthly salary 抽出を `月給` ラベル直後の金額だけに限定し、salary section があれば section 内だけで集計する
4. focused parser / quality tests を通し、holdout rerun で `negative_base_salary_detected=0` を確認する

Success condition:
- `negative_base_salary_detected` が 2 → 0
- `salary_text_without_base_salary` を再発させない
- 既存 listcard / shortline の base salary tests を壊さない

## Track 10: bonus-count signal alignment for detail pages vs thin cards
Objective: `bonus_count_unknown_with_keyword` の残り2件を、recoverable detail miss と thin-card false positive に分けて 0 にする。

Files:
- Modify: `src/lib/analysis/parser.ts`
- Modify: `src/lib/analysis/quality.ts`
- Modify: `src/lib/analysis/parser.test.ts`
- Modify: `src/lib/analysis/quality.test.ts`
- Add fixture(s): `fixtures/jobs/phase4-bonus-count-*.txt`
- Rerun: `docs/evaluations/job-analysis-holdout-2026-05-27-task13-bonus-count-v1-*`

Steps:
1. `holdout-candidate-001` と `036` の raw text / parser output / quality failure を比較し、parser miss と quality false positive を切り分ける
2. standalone `賞与` heading + 次行 `年2回` の positive extraction test を追加する
3. `賞与実績 5.2ヶ月分` のように回数へ正規化できない title-only signal は feedback 対象にしない guard を quality test で固定する
4. focused parser / quality tests を通し、holdout rerun で `bonus_count_unknown_with_keyword=0` を確認する

Success condition:
- `bonus_count_unknown_with_keyword` が 2 → 0
- detail page の `賞与\n年2回` は抽出できる
- thin-input card の `賞与実績 5.2ヶ月分` では false-positive feedback を出さない

## Track 11: thin-input summary-line-only gating for Green-style company cards
Objective: summary-line-only save-worthy feedback を、visible missing critical field がある parser miss に限定し、thin-input company_careers card を除外する。

Files:
- Modify: `src/lib/analysis/quality.ts`
- Modify: `src/lib/analysis/quality.test.ts`
- Add fixture(s): `fixtures/jobs/phase4-summary-line-only-038-anon.txt`
- Rerun: `docs/evaluations/job-analysis-holdout-2026-05-27-task14-summary-line-only-v1-*`

Steps:
1. `holdout-candidate-038` の raw text / parser output / quality failure を確認し、missing annual holidays が raw text に visible でない thin-input row だと確定する
2. summary-line-only quality rule を `visibleMissingCriticalSignals >= 1` でも gate し、visible miss がない row は save-worthy parser miss にしない
3. positive test は visible annual-holiday signal を持つ summary-line case に寄せ、thin card fixture では no-feedback guard を追加する
4. focused tests と holdout rerun で `summary_line_only_extraction=0` を確認する

Success condition:
- `summary_line_only_extraction` が 1 → 0
- thin company_careers card は parser miss 扱いにしない
- visible annual-holiday signal がある summary-line miss は引き続き feedback 対象に残る

## Re-review trigger
次の再レビューは、Track 1〜11 の success condition を満たしてから行う。再評価は同じ holdout 50件 rubric を使い、`scripts/rescore-job-analysis-holdout.ts` で scorecard / summary / notes を再生成したうえで、新しい日付 prefix を付けて保存する。

## Track 24: nightly page-transition QA
Objective: 実在導線 A → B の全 edge を nightly browser QA で検証できるよう、manifest・auth helper・cron prompt・実 cron を repo / Hermes の両方で整える。

Files:
- Add: `docs/qa/nightly-page-transition-qa.md`
- Add: `docs/qa/nightly-page-transition-edges.json`
- Add: `docs/agent/rakushu-nightly-page-transition-qa-prompt.md`
- Add: `scripts/prepare-nightly-qa-auth.mjs`
- Modify: `task.md`
- Modify: `implementation_plan.md`
- Modify: `walkthrough.md`

Steps:
1. `src/app/**/page.tsx` と主要 navigation component (`app-nav-links.tsx`, `dashboard-sidebar.tsx`, `account-menu.tsx`) から route inventory を起こす
2. public / authenticated / redirect-check の3バケットに分ける
3. 「ページ単位」ではなく「遷移元ページ + 操作要素 + 遷移先」を edge として定義する
4. dynamic route (`/jobs/[id]`, `/criteria/[id]`) は fixture data requirement を別フィールドで明記する
5. destructive action / checkout / logout を nightly 対象外として明示する
6. browser QA が読む self-contained cron prompt を `docs/agent/` に置く
7. `scripts/prepare-nightly-qa-auth.mjs` で QA user 選定・fixture count 確認・signed session cookie 生成を self-contained に行う
8. Hermes cron `rakushu-nightly-page-transition-qa` を作成し、browser が helper の injectScript で authenticated edge を叩けるようにする

Success condition:
- edge manifest が repo に存在する
- public / authenticated / redirect-check edge が最低1本ずつ入っている
- dynamic edge の blocked 条件が明記されている
- cron prompt が manifest 前提で自己完結している
- auth helper が base URL / QA user / fixture count / injectScript を返せる
- Hermes cron `rakushu-nightly-page-transition-qa` が作成されている

Note (2026-05-26 nightly QA design): 初手では repo 内の source of truth 整備を優先し、その後 `scripts/prepare-nightly-qa-auth.mjs` と Hermes cron `rakushu-nightly-page-transition-qa` を追加した。Google OAuth を nightly browser で都度通す設計は不安定なので、authenticated edge は helper が生成する signed session cookie 前提で回す。

Note (2026-05-29 recheck/postfix): Task 16 で想定していた「listcard 10件を thin-input として一括除外」は raw text evidence と一致しなかったため、いったん `015` / `016` を parser-miss-worthy、`017`〜`024` と `049` を likely no-feedback として行単位で再定義した。その後、`年休NN日` shorthand parser fix と generic holiday-only row を `feedback_expected=yes` から外す rescore narrow rule を入れて `docs/evaluations/job-analysis-holdout-2026-05-29-task16-postfix-*` を再生成し、public simulated subset は `feedback_expected=0 / feedback_saved=0` まで整合した。

Note (2026-05-29 task18): Task 16 postfix 後に残っていた observed 2行は、実際には `holdout-bootstrap-001` と `holdout-candidate-012` の duplicate-case だった。root cause は prose-heavy title line `北斗株式会社 ITエンジニア／未経験歓迎／年休125日／残業10H` から `companyName` を拾えていないことだったため、`fixtures/jobs/phase5-prose-heavy-company-name-012-anon.txt` を fixture 化し、headline line 向け companyName fallback を `parser.ts` に追加した。rerun artifact `docs/evaluations/job-analysis-holdout-2026-05-29-task18-company-name-fix-*` では duplicate 2行とも `A / 4/4 usable / feedback_expected=no` に改善し、current simulated rerun の `feedback_expected=yes` は 0件になった。

Note (post-Grok reverify): current parser v1.6.2 でも Task 16 の達成状態が崩れていないかを `docs/evaluations/job-analysis-holdout-2026-05-25-task16-grok-reverify-*` で再確認した。focused analysis tests は 69/69 green、Task 16 対象の `holdout-candidate-015`〜`024`, `049` は全件 `feedback_expected=no` のまま、かつ `015` / `016` は `annualHolidays=usable` を維持していた。したがって Task 16 はモデル切替後も「public simulated residual を 0 にする」という success condition を満たし続けている。

Note (task19 secondary alignment): current rerun を再棚卸しした結果、`A+B 72%` / `critical 4/4 usable 50%` を落としている主因は thin-input shape 側の比較利用性不足であり、parser-quality recurring blocker ではないと確認した。一方で `holdout-candidate-036` の `賞与実績 5.2ヶ月分` は current quality rule では no-feedback なのに、`scripts/rescore-job-analysis-holdout.ts` だけが generic `賞与` ヒントで `bonusCount_eval=present_but_missed` を付けていたため、secondary 判定の drift として修正した。`BONUS_COUNT_SIGNAL_PATTERN` を quality.ts と揃えて rerun artifact `docs/evaluations/job-analysis-holdout-2026-05-25-task19-bonus-secondary-alignment-*` を再生成し、`bonusCount present_but_missed` は 1 → 0 になった。

Note (task20 residual-row re-audit): Task 19 rerun の B/C 25行を raw text ベースで再棚卸ししたところ、`holdout-candidate-006` は holiday section は visible でも `年間休日NN日` total が raw に無く、`014` / `035`〜`039` も current raw 上は `employmentType` / `annualHolidays` のどちらかが欠ける thin-input 寄りだった。`017`〜`024` は listcard 特有の annual-holidays 非掲載、`040`〜`044` と `045`〜`049` は critical field 自体が薄い teaser / prose cluster で、いずれも 4/4 usable を parser hardening だけで押し上げる余地が乏しい。途中で `014` の employmentType fallback 仮説を一度試したが、approved raw text の絶対パス再確認で根拠行が無いと判明したため撤回した。したがって次の論点は parser bug 追加修正ではなく、`annualHolidays` total を持たない thin rows を product / critical gate でどう扱うかの sign-off 整理になる。

Note (task21 sign-off docs alignment): Task 19/20 後の current state では recurring parser-quality blocker も secondary miss も実質解消していたのに、`docs/evaluations/job-analysis-feedback-signoff-checklist.md` は古い fail snapshot のままで drift していた。そこで `docs/job-analysis-completion-criteria.md` に zero-denominator rule を追加し、`feedback_expected=0 / feedback_saved=0` を機械的な 0% fail ではなく `no-open-feedback-row` として読む方針を明文化した。あわせて checklist は最新 rerun の A/B/C=25/11/14、4/4 usable=50%、secondary recurring blocker=0、feedback は `current rerun 0/0` と `latest observed DB-backed 3/3` を分けて読む形へ更新し、runbook には residual B/C rows を `parser-miss-worthy / thin-input / mixed-signal` に分ける手順を追記した。次の実質論点は parser hardening ではなく、thin-input rows を sign-off rubric でどう扱うかの整理になる。

Note (task22 thin annual-holidays rule): その次の整理では、`annualHolidays` total を raw text が持たない row を product / critical gate 上でどう読むかをさらに明文化した。`docs/job-analysis-completion-criteria.md` では B判定と usable definition に `thin annual-holidays row` ルールを追加し、numeric total が無い row は `annualHolidays=miss` のまま数えるが parser-miss-worthy evidence とは分けることを明記した。`docs/job-analysis-holdout-review-runbook.md` には critical 集計時の thin annual-holidays row 件数と summary format 上の `Thin-row interpretation` セクションを追加し、current task19 scorecard の再読結果を `docs/evaluations/job-analysis-holdout-2026-05-29-task21-thin-row-signoff-alignment-{summary,notes}.md` に残した。結論として、未解決の narrow parser fix 候補は現時点で増えておらず、残件は rubric 側の扱い整理が中心である。

Note (task23 conditional-pass boundary): thin-row ルールを足したあと、current scorecard がそのまま conditional pass へ上がるのかを境界計算で再確認した。`docs/evaluations/job-analysis-holdout-2026-05-29-task23-conditional-pass-boundary-{summary,notes}.md` を追加し、full cohort / thin annual-holidays rows / mixed-signal low-visibility rows / parser-accountability subset に分けて読んだところ、thin annual-holidays rows 10件はすべて B だが、`035`〜`037`, `039`〜`049` の low-visibility C rows 14件が残るため、thin-row 解釈だけで `FAIL → CONDITIONAL PASS` は正当化できないと確認した。以後は `full-cohort verdict` と `parser-accountability read` を分けて書き、parser blocker closure を示す補助 read があっても最終 verdict とは混同しない方針にする。

## Issue drafting note
issue 化は次の3束で扱う。
1. Re就活 `noisy_promo` critical-field hardening（`holdout-candidate-010`, `043`, `044`）
2. Green `company_careers` top-line fallback 強化（`holdout-candidate-014`, `035`）
3. Wantedly `prose_heavy` critical + benefits prose 抽出強化（`holdout-candidate-047`, `049`）
