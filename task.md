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
- 失敗 route 群の共通経路を辿ると、Cloudflare Workers 上で `db.query.*.findFirst()` を踏む read path が残っていた
- `src/lib/subscription.ts` と `src/lib/usage/counters.ts` の `db.query.*.findFirst()` を `db.select().from(...).where(...).limit(1)` へ置換し、さらに repo 内の残存 `db.query` read を全廃した
- その後 6/7 route は復旧したが、`/jobs` だけは引き続き 500 だった
- 残る `/jobs` は DB schema 問題ではなく、旧 parser 形式の `evidenceJson` を現行 `ParsedJob` 前提で読んでいたことが原因だった
- `src/lib/analysis/parse-stored-job.ts` を追加し、旧保存データに欠けている field を `unknown` / 空配列で補完する正規化レイヤーを入れた
- あわせて `/jobs` の日時処理を `Date | number | string` の shape 差に耐えるよう hardening した
- 本番 Turso には migration 0008〜0018 が未適用だったため、`npm run db:migrate:prod` を本番向けに実行して schema を追いつかせた
- 最終的に `npm test` / `npm run build` / `npm run test:prod-smoke` がすべて通過し、対象 7 ルートは 7/7 で本番 smoke pass した
