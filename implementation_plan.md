# implementation_plan

1. 履歴書入力フォームの「現住所」input を特定する。
2. placeholder 属性だけを `東京都〇〇区1-1-1 △△ビル101` に置換する。
3. `npm run typecheck` を実行して、変更が型チェックを壊していないことを確認する。
4. `walkthrough.md` に変更内容と検証結果を記録する。

## 参照プラン

- `/home/openclaw/rakushu/.hermes/plans/2026-08-16_090708-standard-ai-model-routing.md`

## フェーズ

1. Foundation: model policy, pricing, ai_usage_events, recorder, Responses client
2. AI interview routing and local fallback
3. Grounded company research, Terra fallback, chat cap, post-success credit settlement
4. Resume AI server flow and review-before-apply UI
5. Internal cost dashboard and offline evaluation
6. Staging verification, full quality gates, controlled rollout/rollback

- 21 の詳細タスクと acceptance conditions は、リンク先の計画を正本として扱う。

## 2026-08-21 再開手順

1. 前回の停止点、branch、dirty worktree、Task 14の未commit差分を照合する。
2. Task 13 generator testへ、保存済みsource URLがprovider promptへ入らないことを示す回帰テストを追加する。
3. focused testを実行し、現行実装でREDになることを確認する。
4. `buildReportContext`からURLのprovider向けserializationだけを削除する。保存reportのURL検証とcitation/source ID検証は維持する。
5. Task 13 focused test、Task 14 focused test、typecheck、targeted ESLint、full test、production buildを通す。
6. Task 13互換修正を新規2ファイルだけでcommitする。
7. Task 14を再度、仕様適合レビュー→品質／セキュリティレビューへ通す。
8. Task 14の4ファイルだけをcommitする。
9. Task 15の差分確認UIへ進み、既存の `resume-generator-form.tsx` 差分をtask-start baselineと比較しながら保護する。

## 2026-08-21 Task 16以降

1. Task 16でAI usage eventsを`[from,to)`検索し、原価・成功単価・fallback/error率・unpriced calls・各軸breakdownを集計する。
2. JST暦日の7d/30d境界をUTC `Date`へ変換するpure helperをTDDで固定する。
3. prompt・本文・source・metadataを取得しない最小DB projectionをレビューする。
4. Task 16を仕様レビュー→品質／セキュリティレビュー→限定commitする。
5. Task 17の管理画面は`INTERNAL_ADMIN_EMAILS`だけを許可し、Task 16の型と集計定義をそのまま表示する。
6. Task 18〜21は正本プラン順で、各taskをRED→GREEN→レビュー→限定commitする。

## 2026-08-22 Task 20継続条件

1. 110件full paid eval、人手annotation、targeted citation再検証の証跡は`walkthrough.md`へ記録する。
2. standard local browser smokeの3route PASSを記録するが、production generatorの実動確認とは区別する。
3. corrected product smokeは用途別varを明示し、架空inputとlocal DBだけで実施済み。4 workflowの最終実動成功とusage cleanup 0件を確認した。
4. 企業研究の履歴保存・4回目上限、レジュメ3mode差分適用、面接途中/最後/fallbackはfocused unit/integrationとlocal browser UIで確認済み。管理ledgerは合成eventの実browser表示とcleanup 0件を確認済み。
5. Task 20はPASS。Task 21 migration 31/31、legacy再deploy7/7、standard切替7/7まで確認した。
6. production canaryで企業研究primary／Terraがともにschema validation失敗し、Web Search 18回を含む5 events合計79.557円となったため、healthy legacyへrollbackして7/7 recoveryを確認した。standard monitor cronは削除済み。
7. 再rollout前に、`max_output_tokens`／`max_tool_calls`、transient error限定fallback、safe validation reason、企業研究9-section compact schemaをTDDで追加する。
8. full test、typecheck、lint、build、独立review、限定commitを通過するまでstandardへ再deployしない。再canaryはcall数と新しい概算上限を提示し、追加の有料実行承認を取ってから行う。
9. hardening commit `f116b01`はlegacy routingのままproduction deployし、version `b69aa43f-ac0e-487f-ad78-b0cb877a2a24`とauthenticated 7-route smoke 7/7 PASSを確認した。次はstandard切替前の新しいcost ceiling承認。
