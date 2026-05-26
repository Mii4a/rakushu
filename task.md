# Task

## Title
らくしゅう job-analysis feedback 追加の完成判定を、求人コピペ入力の実測ベースで確定する

## Goal
「feedback を追加した」だけで完成扱いにせず、実在求人のコピペ入力に対して十分な情報抽出と failure 回収ができているかを、holdout 50件の rubric で判定できる状態にする。

## Current decision track
- 次に詰める論点は fallback 追加ではなく、`low-visibility teaser / prose rows` を比較-grade sign-off の同一母集団に残すかどうか。
- 案A: `full-cohort FAIL維持案` — 低可視性 row も同一 cohort に残し、未記載項目は最低点候補として扱う。
- 案B: `cohort分離してConditional Pass線を作る案` — 比較に必要な情報が薄い row は holdout / rubric 上で別 cohort に切り出す。
- UNKNOWN の扱いは一本化しない。`本文に本当に記載がない unknown` は E 候補、`本文には見えているのに抽出失敗した unknown` は UNKNOWN 維持とする。
- この分別が技術的に不安定なら、UNKNOWN→E の全面適用は保留する。

## Deliverables
- `fixtures/jobs/phase3-rekatsu-noisy-promo-010-anon.txt`
- `fixtures/jobs/phase3-rekatsu-noisy-promo-043-anon.txt`
- `fixtures/jobs/phase3-rekatsu-noisy-promo-044-anon.txt`
- updated `src/lib/analysis/parser.ts`
- updated `src/lib/analysis/parser.test.ts`
- Hermes cron job for nightly rakushu QA
- `scripts/rescore-job-analysis-holdout.ts`
- `docs/job-analysis-completion-criteria.md`
- `docs/evaluations/job-analysis-holdout-2026-05-23-v1.6.1-rerun-signoff-scorecard.csv`
- `docs/evaluations/job-analysis-holdout-2026-05-23-v1.6.1-rerun-signoff-summary.md`
- `docs/evaluations/job-analysis-holdout-2026-05-23-v1.6.1-rerun-signoff-notes.md`
- `docs/evaluations/job-analysis-holdout-2026-05-22-rerun-signoff-scorecard.csv`
- `docs/evaluations/job-analysis-holdout-2026-05-22-rerun-signoff-summary.md`
- `docs/evaluations/job-analysis-holdout-2026-05-22-rerun-signoff-notes.md`
- `docs/evaluations/job-analysis-holdout-2026-05-22-signoff-scorecard.csv`
- `docs/evaluations/job-analysis-holdout-2026-05-22-signoff-summary.md`
- `docs/evaluations/job-analysis-holdout-2026-05-22-signoff-notes.md`
- `implementation_plan.md`
- `walkthrough.md`

## Current verdict
- Final decision: FAIL
- Reason: dataset readiness は pass だが、product / critical-field / feedback(observed) の各 gate が未達。`job_board_listcard` は改善した一方で、`noisy_promo` / `company_careers` / `prose_heavy` の recurring failure が前面に出た

## Measured blockers
- A+B: 72%
- C: 14 / 50
- critical 3/4+ usable: 72%
- critical 4/4 usable: 42%
- observed feedback recall: 30% (3/10 observed saved-job subset, DB 実測)
- simulated public feedback recall: 73% (22/30 public rerun subset)
- current simulated all-row recall: 73% (29/40)
- high-signal fixture count: 28
- recurring common failures:
  - none (`summary_line_only_extraction` は Task 14 で 1 → 0、`bonus_count_unknown_with_keyword` は Task 13 で 2 → 0、`negative_base_salary_detected` は Task 12 で 2 → 0)

## Immediate targets
1. `scripts/backfill-job-analysis-feedback.ts` の dry-run 結果（missing 19件中 7件 insert 対象 / 12件 not expected）を基準に、historical save-path drift を一括 backfill できる状態へ持っていく
2. `holdout-candidate-014` を基準に、thin-input `company_careers` を observed feedback denominator から外す条件を docs / script / checklist で揃える
3. `bonus_count_unknown_with_keyword` / `retirement_allowance_unknown_with_keyword` / `negative_base_salary_detected` の current save-worthiness を回帰テストで固定する
4. historical analysis 向け feedback backfill / repair path を最小スコープで用意する
5. `updateJobAction` 由来の future drift（rawText 更新後に latest analysis / feedback が古いまま残る経路）を止める
6. observed feedback recall を 80%以上へ上げる

## This turn
- `job_board_detail:salary_text_without_base_salary` に残っていた 5件（`004`, `026`, `030`, `032`, `034`）の raw text と parser / quality 出力を照合し、全件とも salaryText 自体は comparison-usable だが baseSalary 正規化だけが未完了な structured detail だと確認する
- `src/lib/analysis/quality.ts` の `needsBaseSalaryNormalization` を narrow に見直し、section / direct_label 由来の clean structured salary text は high-signal failure にしない
- fixture-backed tests と docs を更新し、Track 4 を締める
- Track 5 では `src/lib/analysis/feedback.ts` を新設して feedback insert payload を共通化し、`src/actions/job-actions.ts` の auto-save 条件を `evaluateParsedJobQuality` / `shouldCreateFeedback` と同一化した
- `quality.ts` / `quality.test.ts` に `bonus_count_unknown_with_keyword` と `retirement_allowance_unknown_with_keyword` を追加し、賞与・退職金の raw keyword があるのに unknown のケースを save-worthy feedback へ格上げした
- `scripts/rescore-job-analysis-holdout.ts` に `--observed-feedback-source manifest|db|simulate` を追加し、DB 実測ベースで observed feedback_saved を再採点できるようにした
- DB source で `docs/evaluations/job-analysis-holdout-2026-05-24-task5-db-check-{scorecard,summary,notes}` を再生成し、observed feedback recall が 3/10 (30%) のまま・public simulated recall が 22/30 (73%) であることを確認した
- observed subset の未保存 7行を切り出し、主因が (a) `bonus/retirement/negative_base_salary` の historical save-path drift 6行 と (b) `holdout-candidate-014` の rule mismatch 1行 だと整理した
- Task 6 の先頭では parser hardening より先に、thin-input `company_careers` の denominator 整理・current save rule の固定・historical backfill・future drift 防止を進める方針に切り替えた
- `scripts/backfill-job-analysis-feedback.ts` を追加し、missing feedback 19件の dry-run で 7件が current parser + save-rule でも insert 対象、12件は current rule では not expected と確認した
- `./node_modules/.bin/dotenv -e .env.local -- node --import tsx scripts/backfill-job-analysis-feedback.ts --apply true` を実行し、historical save-path drift 7件を実 backfill した
- その後 `docs/evaluations/job-analysis-holdout-2026-05-24-task6-after-backfill-{scorecard,summary,notes}` を DB source で再生成し、observed saved-job subset は 3/10 → 9/9、feedback gate は recall 63% → 79% / fail → pass まで改善した
- `retirementAllowance` parser を bare `退職金制度` / `退職金（勤続3年以上）` / `退職金共済の加入` 系も拾うように広げ、focused tests を green 化した
- `docs/evaluations/job-analysis-holdout-2026-05-25-task7-retirement-fix-{scorecard,summary,notes}` を再生成し、`retirement_allowance_unknown_with_keyword` は 10 → 0、`retirementAllowance present_but_missed` も 10 → 0 まで解消した。残ブロッカーは `noisy_promo:too_many_unknown_critical_fields` へ移った
- Task 8 では `phase3-rekatsu-noisy-promo-043/044` を含む teaser-heavy Re就活 fixture を再確認し、`043` は critical 原文自体が見えない thin-input、`044` は `株式会社Tech Lab（テクラボ）` と `年間休日131日` だけ見える thin-input、`042` は benefits prose miss が主因、という切り分けまで進めた
- `src/lib/analysis/parser.ts` に legal-entity を含む corporate prose fallback を追加し、`phase3-rekatsu-noisy-promo-044-anon.txt` から companyName を recover できるようにした
- `src/lib/analysis/quality.ts` は missing critical fields が raw text 上で実際に 2件以上 visible なときだけ `too_many_unknown_critical_fields` を出すように寄せ、thin-input noisy promo / prose-heavy を high-signal feedback から外した
- `src/lib/analysis/parser.test.ts` / `src/lib/analysis/quality.test.ts` に noisy promo fixture を使った回帰テストを追加し、`npm test -- src/lib/analysis/parser.test.ts src/lib/analysis/quality.test.ts` を green で確認した
- `scripts/rescore-job-analysis-holdout.ts` に high-risk (`company_careers` / `noisy_promo` / `prose_heavy`) 向け thin-input critical-row 判定を追加し、public rerun の expected-feedback denominator と next_action を current parser rule に揃えた
- `docs/evaluations/job-analysis-holdout-2026-05-26-task8-thin-input-alignment-v2-{scorecard,summary,notes}` を再生成し、`noisy_promo:too_many_unknown_critical_fields` recurring cluster は解消、feedback_expected は 28 → 21、simulated public recall は 32% → 47%、overall feedback recall は 46% → 62% まで改善した
- Task 9 では Wantedly `prose_heavy` の `046/047/049` を raw text / parser output / visible critical fields で再点検し、`046` は benefits prose miss、`047` は thin-input、`049` は annual-holiday 以外の visible critical がなく story-title 内 `インターン` ノイズで `too_many_unknown_critical_fields` が誤発火していたと切り分けた
- `parser.ts` の benefit keyword fallback に `ランチのお弁当無料支給` / `フリードリンク` / `ジム無料利用可` / `生成AIを無制限で利用可能` を追加し、Wantedly prose-heavy `046` の benefits miss を fixture-backed で回収した
- `quality.ts` では visible employment signal を line-level に絞り、`インタビュー` / `会社の注目のストーリー` など story-title ノイズを除外する guard を追加した
- `parser.test.ts` / `quality.test.ts` に `046` benefits 回収と story-title `インターン` noise guard の回帰テストを追加し、`npm test -- src/lib/analysis/parser.test.ts src/lib/analysis/quality.test.ts` を green で確認した
- `docs/evaluations/job-analysis-holdout-2026-05-26-task9-prose-heavy-benefits-v2-{scorecard,summary,notes}` を再生成し、`benefits_suspected_but_not_extracted` は 4 → 3、`too_many_unknown_critical_fields` は 1 → 0 まで改善した。一方で overall feedback recall は 62% → 55% に落ち、残主因が public holdout simulation 側の `benefits` / `bonus_count` expected rowsに寄っていることを確認した
- Task 10 では benefits miss cluster `016/022/042` を再点検し、`016` は en-japan listcard teaser に埋もれた `副業OK / ネイル服装自由 / 在宅OK / フレックスOK` の alias 未回収、`022` は事業説明中の `制度改革` が benefits hint に誤反応していた false positive、`042` は noisy promo prose の `リモート可` だけ見えている thin-input benefits line だと切り分けた
- `fixtures/jobs/phase4-en-japan-listcard-benefits-016-anon.txt` / `phase4-en-agent-listcard-benefits-noise-022-anon.txt` / `phase4-green-noisy-promo-benefits-042-anon.txt` を追加し、parser / quality の回帰テストを fixture-backed で固定した
- `parser.ts` には benefits alias fallback（`副業OK`, `在宅OK`, `リモート可`, `フレックスOK`, `ネイル服装自由` など）を追加し、summary-line benefits より先に誤発火しないよう exact keyword / summary fallback / alias fallback の順に整理した
- `quality.ts` と `scripts/rescore-job-analysis-holdout.ts` の benefits hint 判定を `制度` / `手当` 汎用語ベースから、`福利厚生`, `副業`, `在宅`, `リモート`, `フレックス`, `服装自由`, `社会保険` などの狭い可視シグナルへ寄せた
- `npm test -- src/lib/analysis/parser.test.ts src/lib/analysis/quality.test.ts` を green で確認し、rerun artifact `docs/evaluations/job-analysis-holdout-2026-05-26-task10-benefits-cluster-v2-{scorecard,summary,notes}` を再生成した
- Task 10 rerun では `holdout-candidate-016` と `042` が `benefits: present_and_correct` へ改善し、`022` は `benefits_suspected_but_not_extracted=no` / `benefits_eval=not_present` へ揃った結果、secondary `benefits present_but_missed` は 4 → 3 まで減った。ただし recurring main blocker 自体はまだ `benefits_suspected_but_not_extracted=3` で残る
- Task 11 では残りの benefits cluster `020/037/048` を再点検し、`020` は title line の `リモート中心の勤務可`、`037` は company card の `週に1回以上のリモート` と `フレックスタイム`、`048` は Wantedly prose の `リモートベース＋現場対応あり` がそれぞれ visible benefit signal だと切り分けた
- `fixtures/jobs/phase4-en-japan-listcard-benefits-020-anon.txt` / `phase4-green-company-benefits-037-anon.txt` / `phase4-wantedly-prose-benefits-048-anon.txt` を追加し、parser 回帰テストを fixture-backed で固定した
- `parser.ts` の benefits alias fallback を `リモート中心の勤務可` / `週に1回以上のリモート` / `リモートベース` / `フレックスタイム` まで拡張し、`npm test -- src/lib/analysis/parser.test.ts src/lib/analysis/quality.test.ts` を green で確認した
- rerun artifact `docs/evaluations/job-analysis-holdout-2026-05-26-task11-benefits-cluster-v3-{scorecard,summary,notes}` を再生成し、`benefits present_but_missed` は 3 → 0、`benefits_suspected_but_not_extracted` も 3 → 0 まで解消した。以後の recurring main blocker は `negative_base_salary_detected=2` と `bonus_count_unknown_with_keyword=2` に移った
- Task 12 では `holdout-candidate-003` / `011` の `negative_base_salary_detected` を raw text・parser出力・算出ロジックで再点検し、root cause が「`月給` 行にぶら下がる手当額まで monthly salary 候補として拾っていたこと」だと特定した
- `fixtures/jobs/phase4-negative-base-salary-003-anon.txt` / `phase4-negative-base-salary-011-anon.txt` を追加し、parser / quality の回帰テストで doda detail と Re就活 detail の2系統を fixture-backed に固定した
- `parser.ts` の monthly salary 抽出は `月給` ラベル直後の金額レンジだけを拾うように絞り、さらに `extractBaseSalary()` 側では salary section があればその section 内だけで monthly salary を集計するように narrow 化した
- `npm test -- src/lib/analysis/parser.test.ts src/lib/analysis/quality.test.ts` は 62/62 green を確認し、rerun artifact `docs/evaluations/job-analysis-holdout-2026-05-27-task12-negative-base-salary-v1-{scorecard,summary,notes}` を再生成した
- Task 12 rerun では `negative_base_salary_detected` が 2 → 0、`salary_text_without_base_salary` も 0 を維持した。残る recurring main blocker は `bonus_count_unknown_with_keyword=2` のみ
- Task 13 では `holdout-candidate-001` / `036` の bonus miss 2件を再点検し、`001` は standalone `賞与` heading の次行 `年2回` を parser が拾えていない miss、`036` は `賞与実績 5.2ヶ月分` しか見えていない thin card なのに quality が save-worthy bonus miss と誤判定していた、と切り分けた
- `fixtures/jobs/phase4-bonus-count-001-anon.txt` / `phase4-bonus-count-036-anon.txt` を追加し、detail page の positive extraction と thin-input card の anti-hallucination / no-feedback guard を fixture-backed で固定した
- `parser.ts` には `賞与\n年2回` のような standalone heading fallback と plain `賞与` section fallback を追加し、`quality.ts` では bonus feedback を generic `賞与` word ではなく recoverable count signal が visible なケースだけに narrow 化した
- `npm test -- src/lib/analysis/parser.test.ts src/lib/analysis/quality.test.ts` は 64/64 green を確認し、rerun artifact `docs/evaluations/job-analysis-holdout-2026-05-27-task13-bonus-count-v1-{scorecard,summary,notes}` を再生成した
- Task 13 rerun では `bonus_count_unknown_with_keyword` が 2 → 0 まで解消し、remaining recurring failure は `summary_line_only_extraction=1` の単発だけになった
- Task 14 では残り1件 `holdout-candidate-038` を精査し、Green系 company_careers search card で companyName / salaryText / benefits は visible だが annualHolidays は raw text に存在せず、quality の `summary_line_only_extraction` 判定だけが thin-input row を parser miss と誤分類していたと確認した
- `fixtures/jobs/phase4-summary-line-only-038-anon.txt` を追加し、thin company_careers card では visible missing critical field がない限り `summary_line_only_extraction` を立てない guard test を追加した
- `quality.ts` では summary-line-only failure を `criticalUnknownCount >= 1` だけでなく `visibleMissingCriticalSignals >= 1` でも gate するように絞り、既存 positive test は `年間休日125日` が raw に visible なケースへ更新した
- `npm test -- src/lib/analysis/quality.test.ts src/lib/analysis/parser.test.ts` は 65/65 green を確認し、rerun artifact `docs/evaluations/job-analysis-holdout-2026-05-27-task14-summary-line-only-v1-{scorecard,summary,notes}` を再生成した
- Task 14 rerun では `summary_line_only_extraction` が 1 → 0 になり、recurring parser-quality blocker は holdout 上でゼロになった
- Task 15 の再点検では、latest scorecard (`docs/evaluations/job-analysis-holdout-2026-05-27-task14-summary-line-only-v1-scorecard.csv`) 上の `feedback_expected=yes && feedback_saved=no` は observed subset では 0件、未解消 11件はすべて public simulated subset（listcard 10件 + prose_heavy 1件）だと確認した
- したがって current gap の主因は historical save-path drift ではなく、public holdout 側の simulated save rule / fixture expectation に残る差分であり、observed feedback loop 自体は Task 6 backfill 以降は閉じている
- future drift 防止として `src/actions/job-actions.ts` の `updateJobAction` に rawText change detection を追加し、編集時に rawText が変わった場合だけ analysis limit を再確認したうえで latest analysis / auto feedback を再生成し、analysis counter も更新するようにした
- 検証は `npm test` (91 tests green) と `npm run build` (Next build green) で通し、rawText edit 後に stale latest analysis / feedback が残る経路をコード上ふさいだ

## Task 16
- public simulated subset の残件 11件（`holdout-candidate-015`〜`024`, `049`）を、Task 14 scorecard と current `shouldCreateFeedback()` の差分として再点検した。
- 2026-05-29 recheck (`docs/evaluations/job-analysis-holdout-2026-05-29-task16-recheck-{scorecard,summary,notes}`) でも、`--observed-feedback-source simulate` の public `feedback_expected` は引き続き **11件** のままだと確認した。
- ただし row-level で切ると、`015` / `016` は raw text に `年休124日` / `年休125日` が visible な **parser-miss-worthy** 行、`017`〜`024` と `049` は generic holiday signal しか見えない **likely no-feedback** 行に分かれた。
- したがって Task 16 は「listcard 10件を一括除外して達成」ではなく、**2件は parser fix 候補、9件は rubric / denominator 見直し候補**として再定義するのが妥当。
- 追補: `parser.ts` に listcard / teaser line の `年休NN日` shorthand fallback を追加し、`fixtures/jobs/phase5-en-japan-listcard-annual-holidays-015-anon.txt` と既存 `phase4-en-japan-listcard-benefits-016-anon.txt` を使う focused parser test 2本で `015` / `016` の `annualHolidays` 回収を固定した。
- さらに `scripts/rescore-job-analysis-holdout.ts` で generic holiday signal のみを `feedback_expected=yes` 根拠にしない narrow rule と、story-title `インターン` を employment visible signal に数えない noise guard を入れ、`docs/evaluations/job-analysis-holdout-2026-05-29-task16-postfix-{scorecard,summary,notes}` を再生成した。
- postfix rerun では public simulated subset が **`feedback_expected=0 / feedback_saved=0`** まで揃い、Task 16 起点の残件は解消した。残る `feedback_expected=yes` は observed subset の `holdout-bootstrap-001` と `holdout-candidate-012` の 2件だけ。 
## Task 17
- `--observed-feedback-source db` で実 DB ベースの observed feedback 確認を再実行した。
- 2026-05-29 recheck (`docs/evaluations/job-analysis-holdout-2026-05-29-task17-recheck-{scorecard,summary,notes}`) でも、observed subset（15件）は `feedback_expected=3 / feedback_saved=3` → **recall 100%** を維持している。
- observed feedback loop は Task 6 backfill 以降、完全に閉じている状態だと再確認した。

## Task 18
- Task 16 postfix 後に残っていた `holdout-bootstrap-001` / `holdout-candidate-012` を再点検し、これは **別の未解消2件ではなく、同一 `job_id` / 同一 `analysis_id` / 実質同一 raw text** を二重観測した 1ユニークケースだと確認した。
- 真の残課題は annualHolidays ではなく、prose-heavy title line `北斗株式会社 ITエンジニア／未経験歓迎／年休125日／残業10H` から `companyName` を拾えていない parser miss だった。
- `fixtures/jobs/phase5-prose-heavy-company-name-012-anon.txt` を追加し、`parser.test.ts` に fixture-backed 回帰テストを追加した。
- `parser.ts` には headline line 向け companyName fallback を最小差分で追加し、`other jobs` 行より後段・corporate prose より前段で評価するように並べた。
- focused tests (`npm test -- src/lib/analysis/parser.test.ts src/lib/analysis/quality.test.ts`)・full tests (`npm test`)・build (`npm run build`) はすべて green。
- rerun artifact `docs/evaluations/job-analysis-holdout-2026-05-29-task18-company-name-fix-{scorecard,summary,notes}` では、`holdout-bootstrap-001` / `holdout-candidate-012` がともに **A / critical usable 4/4 / feedback_expected=no** へ改善した。
- その結果、current simulated rerun 上の `feedback_expected=yes` は **0件** になった。なお sign-off 全体は product / critical usable gate が未達のため引き続き FAIL だが、Task 16 由来の residual と observed duplicate-case は閉じた。

## Task 16 re-verify after Grok switch
- focused regression を `npm test -- src/lib/analysis/parser.test.ts src/lib/analysis/quality.test.ts` で再確認し、69 tests green を確認した。
- `./node_modules/.bin/tsx scripts/rescore-job-analysis-holdout.ts --seed docs/evaluations/job-analysis-holdout-2026-05-27-task14-summary-line-only-v1-scorecard.csv --output-prefix docs/evaluations/job-analysis-holdout-2026-05-25-task16-grok-reverify --review-date 2026-05-25 --reviewer taro-bot --observed-feedback-source simulate` を current parser v1.6.2 で再実行した。
- rerun artifact `docs/evaluations/job-analysis-holdout-2026-05-25-task16-grok-reverify-{scorecard,summary,notes}` では、Task 16 の対象だった `holdout-candidate-015`〜`024`, `049` が **全件 `feedback_expected=no`** へ揃っていることを再確認した。
- 内訳として `015` / `016` は `annualHolidays=usable` / `grade=A` を維持し、`017`〜`024` と `049` は依然 `annualHolidays=miss` だが current rubric 上は **likely no-feedback** として `feedback_expected=no` のまま整合している。
- current simulated all-row でも `feedback_expected=0 / feedback_saved=0 / save_miss=0` になっており、Task 16 は「public simulated residual を消す」という目的に対して、Grok 切替後の現行コードでも再現的に達成していると判断できる。

## Task 19
- current rerun (`docs/evaluations/job-analysis-holdout-2026-05-25-task16-grok-reverify-scorecard.csv`) を棚卸しすると、sign-off 未達の主因は依然 `thin-input company_careers / noisy_promo / prose_heavy` と `annualHolidays miss の B 行` で、parser-quality recurring blocker ではないと確認した。
- その確認中、`holdout-candidate-036` が `賞与実績 5.2ヶ月分` しか visible でない thin card なのに、`scripts/rescore-job-analysis-holdout.ts` が generic `賞与` ヒントだけで `bonusCount_eval=present_but_missed` を付けている drift を見つけた。
- `scripts/rescore-job-analysis-holdout.ts` の `bonusCount` secondary 判定を、generic `BONUS_HINT_PATTERN` ではなく quality.ts と同じ **回数 recoverable signal** (`BONUS_COUNT_SIGNAL_PATTERN`) ベースへ揃えた。
- focused regression (`npm test -- src/lib/analysis/parser.test.ts src/lib/analysis/quality.test.ts`) は 69 tests green を維持したうえで、rerun artifact `docs/evaluations/job-analysis-holdout-2026-05-25-task19-bonus-secondary-alignment-{scorecard,summary,notes}` を再生成した。
- rerun 後は `holdout-candidate-036` が `bonusCount_eval=not_present` へ修正され、summary 上の `bonusCount present_but_missed` は **1 → 0** になった。
- ただし product gate (`A+B 72%`) と critical-field gate (`4/4 usable 50%`) は不変で、sign-off 全体のボトルネックは引き続き **recover 不能寄りの thin-input rows** 側にある。

## Task 20
- Task 19 rerun の B/C 25行を row-level で再棚卸しし、`company_careers` / `job_board_listcard` / `noisy_promo` / `prose_heavy` の raw text を再読して、parser miss と input-insufficiency を切り分け直した。
- `holdout-candidate-006` は detail page で `休日・休暇` section 自体は visible だが、`年間休日NN日` の total は raw text に無く、current rubric が要求する `annualHolidays` numeric miss を parser bug と呼べる形ではないと確認した。
- `holdout-candidate-014` と `035`〜`039` は company_careers でも full parser miss ではなく、少なくとも current raw text 上では `employmentType` / `annualHolidays` のどちらかが見えていない thin-input 寄りだと再確認した。特に `014` は一見リッチだが、raw を通読すると `annualHolidays` は visible でも `employmentType` の明示シグナルは無かった。
- `holdout-candidate-017`〜`024` の en-japan listcard 8件は、salary / company / title は比較に足る一方で `annualHolidays` は raw text に出ておらず、Task 16 で消した public residual の再発候補ではなく **B評価のまま残る input-thin annualHolidays rows** だと整理した。
- `holdout-candidate-040`〜`044` と `045`〜`049` は、raw text の critical visible field 自体が薄く、`companyName` だけ recover できても `employmentType` / `salaryText` / `annualHolidays` を 4/4 usable に押し上げる余地がほぼ無い cluster だと確認した。
- 途中で `014` 向けの `employmentType` fallback 仮説を一度試したが、approved raw text を absolute path で再確認すると根拠行は存在せず、誤った仮説だったため code / fixture / rerun artifact はすべて撤回した。最終状態は **変更なし・focused tests 69 green** に戻してある。
- 結論として、current fail 主因は parser-quality recurring bug ではなく、`annualHolidays` total を持たない比較用 snippet / teaser / prose page を product / critical gate でどう扱うかの sign-off 論点だと確定した。

## Task 21
- sign-off docs の drift を確認すると、`docs/evaluations/job-analysis-feedback-signoff-checklist.md` が古い fail 数値のまま残っており、Task 19/20 後の「parser recurring blocker は消えたが product / critical gate は thin-input で落ちる」という現状を反映していなかった。
- `docs/job-analysis-completion-criteria.md` に zero-denominator rule を追加し、current rerun が `feedback_expected=0 / feedback_saved=0` のときに機械的に recall 0% fail と読まない方針を明文化した。
- `docs/evaluations/job-analysis-feedback-signoff-checklist.md` を current state に更新し、A/B/C=25/11/14、4/4 usable=50%、secondary recurring blocker=0、feedback は current rerun 0/0 + latest observed DB-backed 3/3 と分けて記録した。
- `docs/job-analysis-holdout-review-runbook.md` には zero-denominator rule と residual B/C row の `parser-miss-worthy / thin-input / mixed-signal` 分離手順を追記し、「failure type は 0 なのに sign-off fail」の読み違いを防ぐようにした。
- これで current sign-off fail の理由は、feedback loop 不備や recurring parser bug ではなく、thin-input rows を product / critical gate でどう扱うかの整理不足だと docs 上でも揃った。

## Task 22
- `annualHolidays` total を持たない thin row の扱いをさらに明文化し、`docs/job-analysis-completion-criteria.md` の B判定と critical usable 定義に「thin annual-holidays row」ルールを追加した。
- このルールでは、`annualHolidays` は strict に numeric usable / miss を採点し続ける一方、raw text に `年間休日NN日` / `年休NN日` の count/value 自体が無い row は parser-miss-worthy とは別バケットで扱う。
- `docs/job-analysis-holdout-review-runbook.md` には critical 集計時の `thin annual-holidays rows` 件数と summary format 上の `Thin-row interpretation` セクションを追加した。
- current task19 scorecard を新基準で再読し、`docs/evaluations/job-analysis-holdout-2026-05-29-task21-thin-row-signoff-alignment-{summary,notes}.md` を新規作成した。ここでは residual row を `thin annual-holidays rows` / `mixed-signal low-visibility rows` / `unresolved parser-miss-worthy rows` に分け直した。
- 再読結果、narrow parser fix に戻すべき未解決 row は現時点では **なし**。holiday shorthand の parser-miss-worthy 行 `015` / `016` はすでに Task 16 で解消済みで、残件は sign-off rubric 側の扱い整理が本丸だと確認した。

## Task 23
- thin-row 解釈を入れたあとに、current scorecard が本当に `CONDITIONAL PASS` まで上がる余地があるかを境界計算で再確認した。
- `docs/evaluations/job-analysis-holdout-2026-05-29-task23-conditional-pass-boundary-{summary,notes}.md` を追加し、full cohort / thin annual-holidays rows / mixed-signal low-visibility rows / parser-accountability subset の4視点で読み分けた。
- 結果として、thin annual-holidays rows は 10件すべて B / 3-of-4 usable / comparison usable だが、`035`〜`037`, `039`〜`049` の **low-visibility C rows 14件** が残るため、thin-row 解釈だけで full-cohort verdict を `FAIL → CONDITIONAL PASS` へ上げるのは不正確だと確認した。
- 一方で parser-accountability read としては、thin/mixed を除いた 25件は A=25 / C=0 で、recurring parser blocker 自体はかなり閉じていると読める。
- したがって、今後は `full-cohort verdict` と `parser-accountability read` を分けて書くべきであり、conditional pass を主張するなら low-visibility row を rubric 上どう扱うかを先に明示決定する必要がある。

## Next task: nightly page-transition QA
- Goal: `docs/qa/nightly-page-transition-edges.json` に定義した実在導線 A → B を nightly browser QA で総当たり検証できる状態にする
- Scope: 数学的な全ページ組み合わせではなく、UI 上に存在する導線だけを対象にする
- Deliverables:
  - `docs/qa/nightly-page-transition-qa.md`
  - `docs/qa/nightly-page-transition-edges.json`
  - `docs/agent/rakushu-nightly-page-transition-qa-prompt.md`
  - `scripts/prepare-nightly-qa-auth.mjs`
  - actual cron job `rakushu-nightly-page-transition-qa` (`0 3 * * *` JST)
  - updated `task.md`
  - updated `implementation_plan.md`
  - updated `walkthrough.md`
- Edge policy:
  - 同じ遷移先でも入口UIが違うなら別 edge として持つ
  - dynamic route (`/jobs/[id]`, `/criteria/[id]`) は fixture data requirement を明記する
  - destructive action / checkout / logout は nightly 対象外
- Initial route buckets:
  - public: `/`, `/beta`, `/login`, `/legal/*`
  - authenticated: `/dashboard`, `/pricing`, `/criteria`, `/jobs`, `/jobs/new`, `/compare`, `/resume`, `/settings/*`, `/internal/parser-feedback`, dynamic detail routes
  - redirect checks: unauth `/dashboard` → `/login`, auth `/` → `/dashboard`, auth `/login` → `/dashboard`, auth `/settings` → `/settings/account`
