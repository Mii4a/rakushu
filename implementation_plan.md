# Implementation Plan

1. 認証実装と本番接続方法を確認する。
2. `.env.production` の Turso / Better Auth 設定を使い、指定メールアドレス用の一時 session cookie を発行する helper を作る。
3. Playwright の global setup / teardown を追加し、storageState を生成・後始末する。
4. 対象 7 ルートに対する最小スモークテストを追加する。
5. Chromium を導入して Playwright を本番 URL に対して実行する。
6. failure digest と route 共通依存から 500 原因を絞り、Edge 互換性のない DB read path を除去する。
7. 本番 DB migration 状態も確認し、schema 未追従なら production DB に適用する。
8. 再デプロイ後に authenticated smoke を再実行し、全 route の復旧を確認する。

実行結果:
- setup helper で本番 user session を作成・cookie 注入できた
- 初回 `npm run test:prod-smoke` では 7/7 routes が 500 になった
- digest は route ごとに異なったが、共通依存は `getUserPlan` / `getAnalysisCount` 系だった
- `src/lib/subscription.ts` と `src/lib/usage/counters.ts` に残っていた `db.query.*.findFirst()` を `select().from().where().limit(1)` に置換した
- 関連ユニットテスト mock も `db.select()` チェーンに合わせて更新した
- その後、`src` 配下で残っていた `db.query` 利用を再探索し、actions / API routes / edit page / webhook helper まで明示 `select` へ寄せた
- 追加 hardening 後、`npm test` と `npm run build` は継続して通過した
- 本番 Turso には migration 0008〜0018 が未適用で、`resume_profiles` / `user_commute_profiles` / `jobs` 通勤系カラム / `rank_settings` の追加カラム不足が 500 の主因だったため、`npm run db:migrate:prod` を実行して解消した
- その結果 `/criteria` `/compare` `/resume` `/pricing` `/settings/account` `/settings/commute` は本番で復旧した
- 最後に残った `/jobs` は、旧 parser 形式の `evidenceJson` と現行 `ParsedJob` の shape 差、および timestamp shape 差を吸収する normalizer / hardening を追加して解消した
- 再 push 後の `npm run test:prod-smoke` は 7/7 pass した
- teardown により一時 session / storageState は cleanup する構成にした
