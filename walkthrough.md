# Walkthrough

- 既存 auth 実装を確認し、Google OAuth しかログイン導線がないことを把握する。
- 手動ログイン情報（パスワード）なしで本番 smoke を回すため、Better Auth の session table と cookie 署名方式に合わせて一時セッションを作る。
- Playwright global setup で storageState を作成し、global teardown で session row を削除する。
- 各 protected route について、本番 URL で 200 系応答・ログイン画面非表示・application error 非表示を確認する。
- 実行してみると、認証そのものは `/api/auth/get-session` で確認できた一方、対象 7 ルートはすべて `Application error` になった。
- Playwright の error context から digest を確認すると `/jobs` は 3785927959、`/pricing` は 2575455932、`/settings/account` は 3128225324 だった。digest 自体は違っても、落ちた route はどれも `getUserPlan` または `getAnalysisCount` を通る。
- その共通経路に残っていた `db.query.*.findFirst()` が Cloudflare Workers / edge 実行時の SSR 例外原因と判断し、`src/lib/subscription.ts` と `src/lib/usage/counters.ts` を明示的な `select().from().where().limit(1)` へ置換した。
- 修正後、ローカルでは `npm test` と `npm run build` が通ったので、本番 deploy 後に同じ Playwright smoke を再実行して確認する。
