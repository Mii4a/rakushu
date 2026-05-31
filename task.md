# Task

本番 URL `https://rakushu.mii4a.workers.dev` に対して、Google ログイン済み状態を Playwright で再現し、以下ルートの最小スモークテストを追加・実行する。

対象ルート:
- /jobs
- /criteria
- /compare
- /resume
- /pricing
- /settings/account
- /settings/commute

要件:
- Playwright で実行可能であること
- 本番の認証済み状態で各ページへ到達できること
- server-side application error / application error / login へのリダイレクト再発を検知できること
- テスト実行で作った一時セッションは可能なら cleanup すること

結果メモ:
- Playwright で本番認証状態を再現して smoke 実行できた
- `/api/auth/get-session` は 200 で、認証 cookie 注入は成立
- 初回実行では対象 7 ルートがすべて 500 `Application error` で失敗
- failure digest は route ごとに異なったが、失敗した route 群が共通して `getUserPlan` / `getAnalysisCount` を通っており、Cloudflare Workers 上で `db.query.*.findFirst()` を踏むコード経路が残っていた
- `src/lib/subscription.ts` と `src/lib/usage/counters.ts` の `db.query.*.findFirst()` を `db.select().from(...).where(...).limit(1)` へ置き換えて edge 互換化した
- ローカルでは `npm test` と `npm run build` が通過したので、このあと main へ反映して本番 smoke を再実行する
