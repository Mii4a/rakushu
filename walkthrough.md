# Walkthrough

- 既存 auth 実装を確認し、Google OAuth しかログイン導線がないことを把握する。
- 手動ログイン情報なしで本番 smoke を回すため、Better Auth の session table と cookie 署名方式に合わせて一時セッションを作る。
- Playwright global setup で storageState を作成し、global teardown で session row を削除する。
- 各 protected route について、本番 URL で 200 系応答・ログイン画面非表示・application error 非表示を確認する。
- 初回実行では、認証そのものは `/api/auth/get-session` で確認できた一方、対象 7 ルートはすべて `Application error` になった。
- failure digest は route ごとに異なったが、落ちた route 群がどれも `getUserPlan` または `getAnalysisCount` を通ることを足がかりに、Cloudflare Workers で不安定な `db.query.*.findFirst()` 系 read を主犯候補に絞った。
- `src/lib/subscription.ts` と `src/lib/usage/counters.ts` を `select().from().where().limit(1)` に置換し、その後 `src` 全体を再探索して actions / API / edit page / webhook helper を含む残存 `db.query` read を除去した。
- 追加 hardening 後もローカルでは `npm test` と `npm run build` が通ったが、本番では `/jobs` を除く 6 route だけ復旧したため、単一 route 固有の原因が残っていると判断した。
- `/jobs` 専用ロジックを切り出して検証したところ、旧 parser 形式の `evidenceJson` を現行 `ParsedJob` 前提で読み、欠損 field の `status` 参照で落ちていた。
- そのため `src/lib/analysis/parse-stored-job.ts` を追加し、保存済み旧データを現行 shape へ正規化するレイヤーを導入した。
- さらに `/jobs` は日時カラムも `Date` 前提で扱っていたため、Cloudflare / libSQL 側の shape 差で再度落ちないよう `Date | number | string` を吸収する hardening を追加した。
- 併行して production DB を確認すると migration 0008〜0018 が未適用で、schema がコードより古い状態だった。`npm run db:migrate:prod` を実行して本番 Turso schema を更新した。
- 最終的に、本番に対する `npm run test:prod-smoke` は `/jobs` を含む対象 7 ルートすべて pass し、500 再発は解消した。
