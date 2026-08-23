# task

レジュメAIの履歴書入力フォームにある「現住所」入力欄の placeholder を、指定の住所例へ変更する。

対象:
- `src/components/resume-generator-form.tsx`

完了条件:
- 「現住所」の placeholder が `東京都〇〇区1-1-1 △△ビル101` と正確に表示される。
- 入力値・保存・プレビューの既存挙動は変更しない。
- `npm run typecheck` が通る。

## 標準モデル表

| action key | function | primary | fallback | tools |
| --- | --- | --- | --- | --- |
| interview_follow_up_generate | AI面接追加質問 | gpt-5.6-luna | 既存の決定論的質問 | なし |
| interview_category_feedback_generate | カテゴリ総評 | gpt-5.4-mini | 既存のローカル評価 | なし |
| resume_draft_generate | レジュメ下書き | gpt-5.4-mini | なし | なし |
| resume_review_generate | レジュメ添削 | gpt-5.4-mini | なし | なし |
| resume_company_adjust_generate | 企業向け調整 | gpt-5.4-mini | なし | なし |
| company_research_report_generate | 企業研究レポート | gpt-5.4-mini | gpt-5.6-terra 最大1回 | Web Search |
| company_research_chat_generate | 保存済み研究への質問 | gpt-5.4-mini | なし | なし |

## 非目標

- 既存の求人分析・スコアリングの決定論的処理を LLM に置き換えない
- gpt-5.6-sol を使用しない
- Realtime API へ移行しない
- prompt / user answer の全文を cost ledger に保存しない
- Stripe やフルな credit wallet の再設計を行わない

## 完了条件

- 7 つの action 全体に対する中央ポリシーが整備されていること
- 企業研究で grounded web search が使われていること
- 企業研究レポート失敗時のみ Terra を最大 1 回使う設計であること
- レジュメは review-before-apply の UI になっていること
- usage / cost telemetry が記録されること
- admin dashboard が用意されていること
- 企業研究失敗時は credit を消費しないこと
- legacy rollback 経路が残されていること
- quality gates を満たしていること

## 2026-08-21 再開タスク

前回の usage limit 中断地点から、承認済み標準AIモデル構成プランを再開する。

現在位置:
- Task 1〜13: 完了・commit済み
- Task 14: 実装済み、仕様レビューPASS、最終品質／セキュリティレビューでRevision要求
- Revision理由: レジュメcompany modeのAI promptへ保存済み企業研究の `sources[].url` が含まれる

直近の完了条件:
- URL漏えいを再現するREDテストを追加し、期待どおり失敗することを確認する。
- AI promptから `sources[].url` を除外し、source ID・title・excerpt・citation整合性は維持する。
- Task 13/14 focused tests、typecheck、targeted lint、full tests、production buildを再実行する。
- 仕様レビューと品質／セキュリティレビューを再通過する。
- 既存のdirty filesを混入させず、Task 13互換修正とTask 14を明示パスだけでcommitする。
- その後、正本プランのTask 15へ進む。

## 2026-08-21 Task 16開始時点

- Task 13 privacy Revision: commit済み。
- Task 14 server action: commit済み。
- Task 15 review-before-apply UI: privacy Revisionを含め、仕様／品質レビュー通過・commit済み。
- 現住所placeholderはTask 15へ混ぜず、1行だけ独立commit済み。
- 現在はTask 16「内部AI原価集計query」をTDDで実装中。
- 残作業は正本プランのTask 16〜21。

## 2026-08-22 Task 20検証時点

- Task 16〜19: 完了・commit済み。
- Task 20 paid evaluation: 110 fixtures × candidate/Terraの220出力を取得し、人手annotationを含む全評価gateがPASS。
- `OPENAI_MODEL_ROUTING_MODE=standard`のlocal browser smokeはAI関連3routeでPASS。本番DB・Cloudflare deploy・shadow送信は行っていない。
- Task 20は完了。評価gate、production generator standard routing、focused browser／DB read-back、cleanupをすべてPASS。
- Task 21 production migrationは31/31。`ec5a198`のlegacy再deployとstandard切替はいずれも7/7 smoke PASS。
- production canaryでは面接追加質問・面接feedback・resumeは成功したが、企業研究primary／Terraがともに`schema_validation_failed`。5 usage events合計79.557円となり、承認上限10円を超過した。
- rollout gateに従ってhealthy legacy version `7fc3ba6a-cd5f-4664-aec4-51205c5e6821`へrollbackし、production専用7-route smoke 7/7 PASS。24h standard monitor cronは削除済み。
- 再rollout前のhardeningとして、action別output/tool cap、transient error限定fallback、privacy-safe validation reason、企業研究9-section compact schemaをTDD実装。full 505/505、typecheck、lint error 0、build PASS。独立reviewと限定commit後に、追加料金を再承認してcanaryをやり直す。
