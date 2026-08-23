# walkthrough

## レジュメAI: 現住所 placeholder

### 実装

- 履歴書項目入力フォームの「現住所」欄の placeholder を、`東京都〇〇区1-1-1 △△ビル101` に変更した。
- 入力値、プレビュー、保存処理には変更を加えていない。

## 検証ログ

- 最終確認で `npm run typecheck` を実行する。

## 標準AIモデル構成の開始時ベースライン

- `npm run typecheck` は pass 済み。
- `npm test` は pass 済み。結果は `33 files, 175 tests`。
- ブランチは `chore/public-security-docs-cleanup`。
- dirty worktree は保全済みで、既存の 6 つの modified files を維持している。
- 既存の modified files:
  - `implementation_plan.md`
  - `scripts/criteria-playwright-check.mjs`
  - `src/components/criteria/criteria-threshold-editor.tsx`
  - `src/components/resume-generator-form.tsx`
  - `task.md`
  - `walkthrough.md`
- model availability evidence:
  - gpt-5.6-luna: Responses API HTTP 200
  - gpt-5.4-mini: Responses API HTTP 200
  - gpt-5.6-terra: Responses API HTTP 200
  - gpt-5.4-mini: Web Search + strict JSON schema HTTP 200

## 2026-08-21 usage limit後の再開記録

- 前回の停止点はTask 14最終品質／セキュリティレビューの`REQUEST_CHANGES`受領直後。
- 指摘内容は、保存済み企業研究の`report.sources[].url`がレジュメcompany modeのAI promptへ含まれていたこと。
- `src/actions/resume-actions.test.ts`は`sourceUrl`という別名だけを検査しており、実フィールド`url`の漏えいを検出できていなかった。
- 再開時branch: `chore/public-security-docs-cleanup`
- 再開時のTask 14対象差分:
  - `src/actions/resume-actions.ts`
  - `src/actions/resume-actions.test.ts`
  - `src/lib/plans.ts`
  - `src/lib/plans.test.ts`
- 既存のcriteria、resume form、task docs差分は保護し、広いstage操作を行わない。
- Codex CLI: `codex-cli 0.147.0`を確認。

### URL漏えいRevisionの実測

- RED: `npm test -- src/lib/resume/ai-generator.test.ts`
  - 34件中1件失敗。
  - 固有URL `https://resume-source-url.invalid/private-path` がprovider向け`userPrompt`へ含まれることを再現。
- GREEN focused: Task 13 generator、Task 14 action、plan testsの合計56件成功。
- `npm run typecheck`: pass。
- 対象6ファイルのESLint: clean。
- full `npm test`: 45 files／436 tests成功。
- `npm run build`: pass。表示warningは既存の未使用変数／`img` warningのみ。
- `npm run lint`: exit 0、0 errors／11 warnings。今回対象外の既存warningのみ。
- 修正はprovider向けsource再構築から`url`だけを除外。保存reportのURL形式検証とsource/citation integrity検証は維持。
- Task 15開始前の`resume-generator-form.tsx` baselineを`/tmp/rakushu-task15-resume-generator-form.baseline.tsx`へ保存し、両方のSHA-256が`12b5ad660d79561bdd5d90aed7acf7627c2f8a61741968e6ec1bb14ef68a3a4b`で一致することを確認。
- Task 13 URL除外Revisionは仕様PASS・品質／セキュリティAPPROVED後、`137b48a fix: exclude research source URLs from resume AI`として2ファイルだけcommitした。
- Task 14再レビュー前のfocused gate: 2 files／22 tests成功、typecheck成功、対象ESLint clean、whitespace errorなし。
- Task 13 commit後・Task 14未commit状態のfull test: 45 files／436 tests成功。
- Task 14最終品質レビュー中のproduction build: pass。既存warningのみ。
- Task 14は仕様再レビューPASS・品質／セキュリティAPPROVED後、`1bb9782 feat: expose metered resume AI proposal action`として予定4ファイルだけcommitした。

## Task 15 親受入条件

- AI提案の受信だけではフォーム値が変わらない。
- `motivation`と`selfPr`を個別反映でき、片方の反映で他方を壊さない。
- 「すべて反映」は2項目だけを更新し、住所・氏名等へ触れない。
- 「反映せず閉じる」は現在値を保持する。
- 固定提案文を削除し、`generateResumeAiProposalAction`の実結果だけを表示する。
- `jobId`と対象企業表示を維持する。
- PlaywrightはAIボタンを実行せず、課金・クレジット消費なしでaction wiringと初期非変更を検証する。
- protected placeholder `東京都〇〇区1-1-1 △△ビル101`を維持する。

### Task 15 実装・検証ログ

- pure helper RED: `resume-ai-proposal-state.ts`未作成により期待どおり失敗。
- pure helper GREEN: 5 tests成功。
- Task 14 actionと合わせたfocused unit: 22 tests成功。
- subagent回収時のPlaywright初回失敗は、保存済みプロフィールでtextareaが空ではないのに空欄を期待したテスト前提誤り。
- 親修正後のPlaywright初回失敗は、React 19 function form actionのDOM属性を通常URLと誤認したテスト前提誤り。
- 最終Playwright `/resume`: 1件成功。AIボタンはクリックせず、API課金・クレジット消費なし。
- full unit: 46 files／441 tests成功。
- typecheck: pass。
- full lint: 0 errors／既存warning 11件。
- production build: pass。
- 固定AI提案文は削除済み。
- protected currentAddress placeholderは正確に1件維持。
- AI提案の受信だけではフォーム値を変更せず、個別／一括反映はpure helper経由にした。
- 「反映せず閉じる」はproposal表示だけを閉じ、フォーム値を変更しない。

### Task 15 privacy Revision

- 初回品質レビューはAPPROVEDだったが、親受入でAIボタンが履歴書保存フォーム全体のFormDataを送る境界を再検出した。
- server actionが無視する項目でも、氏名・住所・電話・メールをAI action transportへ含めない方針を採用。
- Playwright REDで`resume-ai-form`不在を確認後、AI専用のsibling formへ分離した。
- AI専用フォームのapp-owned fieldsは `education`, `experience`, `jobId`, `licenses`, `motivation`, `selfPr` の6件だけ。
- modeはクリックしたsubmit buttonの`name=mode`／`value`から送る。
- PII fields `fullName`, `currentAddress`, `phone`, `email` はAI form内0件。
- React自動注入の`$ACTION_*` hidden fieldsはframework metadataとして検査対象から分離した。
- privacy Revision後のPlaywright `/resume`: 1件成功、AIクリック／credit消費なし。
- privacy Revision後のfull unit: 46 files／441 tests成功。
- typecheck、full lint（0 errors）、build、diff check成功。

### Task 15 commit

- 現住所placeholderはTask 15から分離し、`8d6494a fix: update resume address placeholder`として1行だけcommitした。
- Task 15は最終full gate（46 files／441 tests、lint 0 errors、build、Playwright `/resume`）通過後、`4064780 feat: add review-before-apply resume AI UI`として予定5ファイルだけcommitした。

## Task 16 開始

- 正本プランの内部AI原価集計queryへ移行した。
- 集計期間はDB上で`[from,to)`、7d/30dはJST暦日境界をUTC instantへ変換する。
- unknown pricingは0円へ混ぜず、既知原価と`unpricedCalls`を分離する。
- query projectionはuserId、model、feature、action、status、costだけに限定し、本文・prompt・source・metadataを取得しない。

### Task 16 TDD・親Revision

- 初回RED: `ai-cost.ts`未作成でmodule解決失敗。
- subagent GREEN後、親レビューで30d境界テスト欠落、複数success分母未検証、null userの文字列sentinel衝突を検出した。
- 親RED: breakdownを配列として扱う強化テストが2件失敗し、`Record<string,...>`では`null`と`"null"`を区別できないことを再現。
- breakdownを`AiCostBreakdown<Key>[]`へ変更し、user keyを`string | null`のまま保持した。
- group集計はrows配列の再走査から、`Map`による単一pass集計へ変更した。
- 7d／30d JST境界と巨大day countのoverflow rejectionを追加した。
- focused: 7 tests成功。
- full: 47 files／448 tests成功。
- typecheck: pass。
- full lint: 0 errors／既存warning 11件。
- production build、diff check: pass。
- Task 16は仕様再レビューPASS・品質／セキュリティAPPROVED後、`f358185 feat: aggregate AI cost and failure metrics`として2ファイルだけcommitした。

## Task 17 管理者AI原価dashboard

- access helperの初回REDはmodule未作成で期待どおり失敗。
- `INTERNAL_ADMIN_EMAILS`のみ許可し、tool-only／一般／null emailは`/jobs`へredirectする。
- 7d／30dを同一`now`から取得し、両期間の既知原価を同時表示する。
- selected periodで原価、成功単価、成功／fallback／error、completed／total、unpriced、各breakdownを表示する。
- user breakdownは原価順上位20件。null userは`未紐付け`表示し、React keyは実IDと衝突しないprefixを使う。
- milli-yenとrateはraw値を変更せず、render時だけ表示丸めする。
- 期間表示は`Asia/Tokyo`を明示し、終了境界を`未満`として表示する。
- focused: access＋aggregate 11 tests成功。
- full: 48 files／452 tests成功。
- typecheck、targeted lint、build、diff check: pass。
- Task 17は仕様再レビューPASS・品質／セキュリティAPPROVED後、`5cbd055 feat: add internal AI cost dashboard`として3ファイルだけcommitした。

## Task 18 routing env・legacy rollback

- `parseServerEnv`未実装とlegacy routing未実装を、それぞれ初回REDで確認した。
- 初期modeは`legacy`。面接と企業研究は旧MAIN、レジュメは旧LIGHTへ戻り、新用途別envとTerra fallbackを無視する。
- `standard`だけ用途別モデルと企業研究Terra fallback（2 attempts）を有効にする。
- modeのraw不正値はlegacyへfail-safeし、schema上は`legacy | standard`以外を拒否する。
- FXは正のsafe integer decimal stringとして検証し、既定値`150000`とする。
- 7個の非秘密設定をenv templatesと`wrangler.jsonc`通常`vars`へ追加し、secret upload scriptには追加しない。
- parent cleanupでlegacy routingの重複switchをfeature単位のresolverへ縮約した。
- focused: env＋model policy 30 tests成功。
- full: 49 files／470 tests成功。
- typecheck、targeted lint、build、diff check、wrangler JSON parse: pass。
- `push-cloudflare-secrets.mjs`差分なし。

## Task 19 匿名AI routing評価harness

- 企業研究30件、面接追加質問30件、面接総評20件、レジュメ30件、合計110件の架空・匿名fixtureを追加した。
- `RUN_PAID_AI_EVAL=1`がない通常実行では外部APIを呼ばないfail-closed evaluatorにした。
- artifactはrepo内`.tmp`に限定し、mode `0600`、prompt・input・API key・raw envelopeを保存しない。
- focused 27 tests、full 497 tests、typecheck、targeted ESLint、buildを通過した。
- `3184fee [verified] feat: add AI routing evaluation harness`としてcommitした。

## Task 20 staging/shadow-free検証（進行中）

### migration・paid evaluation

- `npm run db:migrate:status`: pending 0、`0030_ai_usage_cached_input_price.sql`まで適用済み。
- paid smokeは各suite 1件、candidate/Terra各4callで成功。実原価は合計2.222円。
- full paid evalは110 fixtures × 2モデル、220call。API failure 0、timeout 0、fallback 0、schema 220/220、架空URL0。
- full初回実支出はcandidate 16.979円、Terra 53.704円、合計70.683円。
- evaluator false-negative修正と`company-025` targeted 2callまでの累計実支出は約73.196円。misconfigured product smokeの既知原価31.067円とcorrected product smokeの既知原価13.091円を加え、Task 20の台帳上の既知原価累計は約117.354円。旧4.1系HTTP 400の3callはunpricedとして含めない。
- paid outputで見つけたverified defectは、`。`終端の自然な質問、過去形`〜しましたか。`、禁止事項を守る否定文の誤検知、情報ゼロ時sentinel source IDを防ぐ指示不足。
- defectはREDテストから修正し、`c97a1ba`と`d403646`の2つのverified commitへ分離した。

### 人手annotationと最終eval gate

- 110件のcandidate/Terra両方、合計220出力を3分割レビューし、packet/resultのID完全一致、score範囲、boolean、unique件数、mode `0600`を親検証した。
- unsupported claimはcandidate/Terraとも0件。annotation coverageは100%。
- `company-025`は修正promptでcandidate/Terraを各1回targeted再実行し、両方ともschema・instruction・citation PASS、架空URL0。
- 最終candidate gate: PASS、blocker 0、accepted success 108/110。
- schema success 100%、instruction adherence 98.18%、company citation validity 100%、unsupported claim 0%、API failure+timeout 0%、fallback 0%。
- candidate P95: 企業研究5.661秒、追加質問5.768秒、面接総評3.333秒、レジュメ2.531秒。全閾値内。
- candidate cost/successは0.1541円、Terraは0.4905円。candidateはTerra比31.41%、成功単価68.59%減。
- candidate人手平均: 日本語自然さ4.473、具体性4.364、圧迫感のなさ4.873。
- Terra人手平均: 日本語自然さ4.636、具体性4.364、圧迫感のなさ4.873。
- 公式`npm run eval:ai-routing -- --report .tmp/ai-routing-task20-full.json`で無課金再計算し、exit 0を確認した。
- 最終artifact `/home/openclaw/rakushu/.tmp/ai-routing-task20-full.json`とpre-annotation backupはmode `0600`。privacy禁止key、Bearer文字列、`sk-` prefixは0。

### standard local browser smoke

- `.env.local`と`.env.production`のDB URL fingerprintは不一致で、local smokeが本番DBへ接続しないことを確認した。
- `OPENAI_MODEL_ROUTING_MODE=standard npm run test:local-jobs-smoke -- --grep '/company-research|/ai-interview|/resume'`を実行した。
- `/company-research`、`/ai-interview`、`/resume`は3/3 PASS。main response 200、pageerror・console error・5xxなし。
- AI生成buttonは押さず、追加課金・クレジット消費・本番データ変更なし。Cloudflare deployや本番shadow送信も行っていない。
### Task 20 sign-offと証跡境界

- repoにCloudflare staging専用envはなく、browser evidenceはlocal Next standard modeであり、remote staging deployではない。
- 企業研究: 実APIで公開URL・sources・citations・Web Searchを確認。local browser route smokeで履歴UIを確認し、保存・所有権・追加質問3回上限／4回目拒否はfocused persistence/action/chat-policy testsで確認。
- レジュメ: draft production generatorを実API確認。3mode request分離、review-before-apply、個別／全適用、閉じるまで非永続はfocused generator/action/state testsとlocal browser UIで確認。
- AI面接: follow-upとcategory feedbackのproduction generatorを実API確認。カテゴリ途中の追加質問、カテゴリ最後だけfeedback表示、生成失敗時fallbackはfocused session testsとlocal browser UIで確認。
- usage ledger: production generatorのmodel/status/token/cost/Web Search/allowlisted metadataをDB read-backし、cleanup後0件を確認。さらに合成usage eventを管理者sessionで`/internal/ai-cost?period=7`へ表示し、model/action/1.234円/success 1・fallback 0・error 0を実ブラウザ確認した。
- admin browser smokeはHTTP 200、page/console/server error 0。artifactとscreenshotはmode `0600`、event/session cleanup後0件。
- production DB、Cloudflare deploy、shadow traffic、real-user inputは使っていない。
- Task 20判定はPASS。Task 21 rolloutへ進めるが、本番migration／deploy／standard切替はTask 21の段階的gateと明示承認に従う。

## Task 21 rollout gate（production side effect前）

- focused gate: 27 files、308 tests PASS。
- full static/unit gate: typecheck PASS、lint exit 0（error 0、既存warning 11）、full 50 files／497 tests PASS、production build PASS。
- browser regression: dashboard、onboarding、criteria、company research、AI interview、jobs、新規求人、resume、job detailの9/9 PASS。追加AI API call 0。
- security/privacy focused gate: 4 files／74 tests PASS。admin allowlist、他ユーザーjob拒否、secret metadata拒否、safe error、fallback最大1回を確認。
- local `ai_usage_events`は0件。malformed metadata、non-allowlisted key、secret-like metadataは0。
- admin ledger browser smokeはHTTP 200、model/action/1.234円、success/fallback/error表示を確認。page/console/server error 0、event/session cleanup 0。artifact/screenshotはmode `0600`。
- production env必須項目はpresent、local/prod DB fingerprintはdistinct、`wrangler.jsonc` routingは`legacy`。
- current branchはmainより42 commits先、70 committed paths差分、dirty 5、staged 0。dirty worktreeから直接deployしない。
- migration SQLの削除系（`DROP / DELETE / UPDATE / TRUNCATE / REPLACE`）は0。ただし0024/25/27/28/30にadditiveな`ALTER TABLE ... ADD`がある。初期grepでALTER 0とした記録は誤りとして訂正。
- `db:migrate:prod:status`を承認後に実行し、expected 31、applied 21、pending 10（0021〜0030）を確認。正本想定の「0029のみpending」と異なるため自動適用を停止した。
- production schemaのread-only照合ではpending対象table/columnはすべて未作成で、migration ledger driftではない。
- local file DBで0000〜0020適用後、合成user/job各1件を入れて0021〜0030をdry-run。10 filesすべて成功、required tables/columns作成、user/job row保持、既存jobの`is_favorite` default 0を確認。
- Turso公式PITRはCOMMITごとに自動backupし、free planでも過去24時間へ復元可能。ただし復元は新DB作成後に接続先を切り替える方式。
- repositoryのmigratorはstatement単位実行でfile transactionではないため、production適用時は各fileの全statement＋ledger insertをatomic batchにする方が安全。
- production migrationは承認後、各fileの全statement＋ledger insertをatomic transactionで0021〜0030へ適用。initial 21/31、final 31/31、pending 0、preexisting table row counts保持PASS。
- canonical `db:migrate:prod:status`も31/31・pending none。対象table/columnのread-backも全PASS。self-test／production artifactはmode `0600`。
- Cloudflare CLIはplain環境ではlogin requiredだが、`.env.production`のtoken/account IDを読み込んだ`wrangler whoami`は認証PASS。
- current branchはmainより42 commits先・70 paths差分のため、legacy deployはclean detached worktreeのcommit `46d649e`から行い、dirty 5 filesを除外する必要がある。
- legacy deployをclean detached worktree `46d649e`から実施し、Cloudflare version `ed213b44-6bfb-45ad-b1ed-70034538cbd1`を作成したが、production専用authenticated 7 routesが7/7 HTTP 500となった。
- `test:prod-smoke`がlocal/top specまで拾って20 testsを実行したのはharness defectだが、production専用7 routesの500は実障害として扱った。
- 承認後、直前version `4e0aacac-4131-48bb-938c-b7cfd1581bc8`へ100% rollback。rollback後のproduction専用7-route smokeは7/7 PASSし、可用性を回復した。
- rollback後もproduction DBは31/31 migrationのまま正常動作したため、migrationは障害原因ではなくbackward compatibleと確認。
- failed deployはclean worktreeの`node_modules`を元repoへsymlinkしてbuildした。再現previewではNext内部moduleが元repo pathへ解決され`Module not found`となり、deploy artifact作成方法が500原因と整合した。
- symlinkを削除しclean worktreeで独立`npm ci`後、同commitのOpenNext local previewはbuild/Ready成功。`/` 200、`/pricing` 307、`/jobs` 307、runtime error 0。
- `npm ci` auditは21 vulnerabilities（low 1 / moderate 6 / high 13 / critical 1）を報告。自動fixは未実行。
- `npm ci` auditでdirect `better-auth 1.6.5`のcritical advisoryを検出。`1.7.1`へ更新し、Node engineを`>=22.0.0`へ明示した。auditはcritical 1→0、auth 40/40、full 497/497、typecheck、lint error 0、build、local browser 9/9、独立review PASS。commit `417fa8d`。
- production smoke configがlocal/top specまで収集するharness defectを`testMatch: "prod-smoke.spec.ts"`で修正。RED 20 tests、GREEN 1 file/7 tests、独立review PASS。commit `ec5a198`。
- latest clean worktree `ec5a198`で独立`npm ci`、node_modules symlinkなし、Node 24.14.0、Better Auth 1.7.1、routing legacyを確認。OpenNext previewはReady、`/` 200、`/pricing` 307、`/jobs` 307。
- legacy再deployの承認後、`ec5a198`を独立node_modulesからproductionへdeploy。version `7fc3ba6a-cd5f-4664-aec4-51205c5e6821`、routing legacy。
- production standard切替を承認後、同じ`ec5a198`のruntime configだけを一時的にstandardへ変えてdeploy。version `8c755187-50fb-4b61-8076-fd10912217c9`、routing standard。local worktreeはlegacyへ復元済み。
- standard deploy後のproduction専用7-route smokeは7/7 PASS。AI生成callなし、追加OpenAI料金0円。初回usage baselineはevents 0、cost 0円で品質判定はtraffic不足。
- 24h read-only monitorをcron `a76ac05b3b2e`（every 60m × 24、local-only、no-agent）で開始。windowは`2026-08-22T21:07:31.129268Z`〜`2026-08-23T21:07:31.129268Z`。error >1%は`ROLLBACK_REQUIRED`表示だが、自動rollbackは行わない。
- 実障害時のrollbackは初回incidentで実行・7/7 recoveryを実証済み。git pushは未実行。Task 21の最終sign-offは24h monitor完了待ち。

## Task 21 production AI canary incident／hardening

- 最大5 attempts・概算承認上限10円でproduction canaryを1回だけ実行。追加retryは行っていない。
- 面接追加質問、面接category feedback、resume draftは成功。企業研究reportはprimary `gpt-5.4-mini`とfallback `gpt-5.6-terra`がともに`schema_validation_failed`。
- usage eventsは5件。成功3件、error 2件。企業研究primaryはinput 36,540／output 12,600／reasoning 6,685／Web Search 8回／24.616円。Terraはinput 70,638／output 10,166／reasoning 699／Web Search 10回／54.490円。
- canary総額は79.557円で承認上限10円を超過。既存clientにoutput/tool capがなく、deterministic schema failureでも高価なTerraへfallbackする設計欠陥を確認した。
- standard rollout gateに従い、healthy legacy version `7fc3ba6a-cd5f-4664-aec4-51205c5e6821`へrollback。rollback後production専用7-route smokeは7/7 PASS。cron `a76ac05b3b2e`は削除した。
- canaryは既存production smoke userとsynthetic source IDsを使い、domain fixtureは作成していない。原因証跡のusage ledger 5件は保持中で、prompt・回答・raw output・source URL・API keyは保存していない。
- root cause調査では、OpenAI strict JSON schema通過後にZodとevidence validatorが追加制約を適用し、従来telemetryは具体的reasonを失っていたことを確認した。
- `AiModelPolicy`へaction別`maxOutputTokens`／`maxToolCalls`／`fallbackErrorCodes`を追加。企業研究reportは6,000 output tokens、built-in tool 1回へ制限した。
- Terra fallbackは`http_429`／`http_5xx`／`timeout`／`network_error`だけに限定。invalid JSON、schema validation、empty/incomplete output、400/401/403ではfallbackせず終了する。
- allowlist済み`validationFailureReason`だけをusage metadataへ保存し、raw error／payloadを持たない`StructuredAiValidationError`を追加した。
- 企業研究JSON schemaとpromptを、必須9タイトル各1回、9 sections固定、各section 1〜3 subsections、各content 1〜3件、compact outputへ整合した。
- focused AI hardening 87/87、validation boundary 5/5、full 51 files／505 tests、typecheck PASS、lint 0 errors／既存warning 11、production build PASS、diff check PASS。追加のOpenAI call、production deploy、git pushは行っていない。
- 独立pre-commit reviewはsecurity concern 0、logic error 0、suggestion 0でPASS。hardening 14 filesを`f116b01 [verified] fix: bound production AI report costs`として限定commitした。criteriaの既存dirty 2 filesは除外した。
- clean detached worktree `f116b01`、独立node_modules、routing legacyでtypecheck、full 505/505、production buildを再確認後にdeploy。Cloudflare versionは`b69aa43f-ac0e-487f-ad78-b0cb877a2a24`。
- deploy後のproduction専用authenticated smokeは7/7 PASS。AI生成call 0、temporary `.env.production`削除、deploy worktree tracked cleanを確認した。standard再切替／有料canary／git pushは未実行。
- 最大2 attempts・承認上限50円の明示承認後、同commitをstandard version `4eb783c9-f4f1-449c-bba0-9524a8fe4baf`としてdeploy。standard bindingをdeploy outputで確認し、production smoke 7/7 PASS後にcompany-only canaryを1回実行した。
- canaryはprimary `gpt-5.4-mini` 1 attemptで成功。provider 9 sections＋derived citation sectionの合計10 sections、sources 13、citations 66、HTTP URL／citation参照整合ともPASS。fallbackと追加retryは0。
- usageはinput 10,491／output 4,822／reasoning 130／7.435円。6,000 output cap、50円上限、metadata allowlistはPASSした。
- request policyとdeployed app chunkには`max_tool_calls=1`が含まれることを確認したが、responseから集計したledgerはWeb Search 2回を記録した。provider capとapp usage countの意味が一致せず、canary helperはfail-closedで失敗扱いにした。
- 追加有料callは行わず、legacy version `b69aa43f-ac0e-487f-ad78-b0cb877a2a24`へrollback。rollback後production smoke 7/7 PASS、local config legacy復元、temporary envなしを確認した。
