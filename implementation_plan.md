# Implementation Plan

1. 認証実装と本番接続方法を確認する。
2. `.env.production` の Turso / Better Auth 設定を使い、指定メールアドレス用の一時 session cookie を発行する helper を作る。
3. Playwright の global setup / teardown を追加し、storageState を生成・後始末する。
4. 対象 7 ルートに対する最小スモークテストを追加する。
5. Chromium を導入して Playwright を本番 URL に対して実行する。
6. 結果を整理し、必要なら再実行手順を README/ドキュメントへ残す。

実行結果:
- setup helper で本番 user session を作成・cookie 注入できた
- `npm run test:prod-smoke` 実行で 7/7 routes が 500 になった
- digest を確認すると `/jobs`=3785927959, `/pricing`=2575455932, `/settings/account`=3128225324 など route ごとに違ったが、共通依存は `getUserPlan` / `getAnalysisCount` だった
- `src/lib/subscription.ts` と `src/lib/usage/counters.ts` に残っていた `db.query.*.findFirst()` を、Cloudflare Workers でも安定する単純な `select().from().where().limit(1)` に置換した
- 関連ユニットテスト mock も `db.select()` チェーンに合わせて更新した
- `npm test` と `npm run build` は修正後に通過
- その後、`src` 配下で残っていた `db.query` 利用を再探索し、actions / API routes / `jobs/[id]/edit` / Stripe webhook helper まで明示 `select` へ寄せた
- 追加 hardening 後も `npm test` と `npm run build` は通過し、`src` 配下の `db.query` 残存は 0 件になった
- teardown により一時 session / storageState は cleanup する構成にした
