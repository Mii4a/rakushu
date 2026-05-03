# Production Deploy Runbook

このドキュメントは `rakushu` を本番環境へ投入するための実行手順です。  
前提構成は `Cloudflare Workers + Turso + Google OAuth + Stripe` です。

注意:
- このアプリは SSR と認証を使うため、Cloudflare Pages の静的ホスティングではなく Cloudflare Workers に配備します
- Cloudflare Pages は static export 向けで、現行構成の本番配備先としては不適切です

## 1. デプロイ前提

- デプロイ対象コミットが確定していること
- 本番用 Turso データベースが作成済みであること
- Google OAuth の本番用クライアントが発行済みであること
- Stripe の本番用 Price / Webhook 設定が済んでいること
- 本番公開 URL が確定していること
- Cloudflare アカウントと Workers 配備権限があること
- `wrangler login` または CI 用 API Token が準備できていること

## 2. 本番環境変数

Cloudflare Workers の production 環境変数として以下を設定します。

ローカルで記入用ファイルを作る場合:

```bash
cp .env.production.example .env.production
```

```bash
NEXT_PUBLIC_APP_URL=https://rakushu.mii4a.workers.dev
BETTER_AUTH_URL=https://rakushu.mii4a.workers.dev
BETTER_AUTH_SECRET=replace-with-a-new-strong-random-secret

TURSO_DATABASE_URL=libsql://your-production-db.turso.io
TURSO_AUTH_TOKEN=replace-with-production-turso-token

GOOGLE_CLIENT_ID=replace-with-production-google-client-id
GOOGLE_CLIENT_SECRET=replace-with-production-google-client-secret

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PLUS=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_ALLOW_PROMOTION_CODES=true
STRIPE_CAMPAIGN_PROMOTION_CODE_ID=

OPENAI_API_KEY=sk-...
OPENAI_MAIN_MODEL=gpt-4.1-mini
OPENAI_LIGHT_MODEL=gpt-4.1-nano
```

注意:
- `BETTER_AUTH_SECRET` は 32 文字以上の強いランダム値を使う
- `TURSO_DATABASE_URL` と `TURSO_AUTH_TOKEN` は本番専用値にする
- `STRIPE_*` は live mode の値に切り替える
- `.env.production` はテンプレート用途にとどめ、秘密値は Git に載せない
- 追跡対象のテンプレートは `.env.production.example`

Cloudflare への投入例:

```bash
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put TURSO_DATABASE_URL_SECRET
npx wrangler secret put TURSO_AUTH_TOKEN
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put STRIPE_PRICE_STARTER_SECRET
npx wrangler secret put STRIPE_PRICE_PLUS_SECRET
npx wrangler secret put STRIPE_PRICE_PRO_SECRET
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put OPENAI_API_KEY
```

平文でよい値は `wrangler.jsonc` ではなく、Cloudflare Dashboard または `wrangler secret/bulk` と環境ごとの変数管理で扱うのが安全です。

このリポジトリでは `.env.production` から必要な secrets を順に登録する補助コマンドも使えます。

```bash
npm run cf:secrets:prod
```

このコマンドは以下の secret を `wrangler secret put` で登録します。

- `BETTER_AUTH_SECRET`
- `TURSO_DATABASE_URL_SECRET`
- `TURSO_AUTH_TOKEN`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `STRIPE_PRICE_STARTER_SECRET`
- `STRIPE_PRICE_PLUS_SECRET`
- `STRIPE_PRICE_PRO_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `OPENAI_API_KEY`

`STRIPE_CAMPAIGN_PROMOTION_CODE_ID_SECRET` は任意です。`.env.production` に値が入っている場合だけ secret として登録します。

## 3. 外部サービス設定

### Google OAuth

Google Cloud Console で以下を登録します。

- Authorized JavaScript origins:
  - `https://rakushu.mii4a.workers.dev`
- Authorized redirect URIs:
  - `https://rakushu.mii4a.workers.dev/api/auth/callback/google`

このアプリの Better Auth は `BETTER_AUTH_URL` を `baseURL` として使います。

### Stripe

Stripe 側で以下を設定します。

- Product / Price:
  - `Starter`
  - `Plus`
  - `Pro`
- Webhook endpoint:
  - `https://rakushu.mii4a.workers.dev/api/stripe/webhook`

受信イベント例:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## 4. データベース反映

重要: アプリ本体を本番反映する前に、先に DB migration を適用します。

`package.json` の `db:migrate` は `.env.local` を読むため、本番ではそのまま使わず、明示的に `.env.production` を指定します。

```bash
npm run db:migrate:prod
```

内部的には `dotenv -e .env.production -- node scripts/migrate-turso.mjs` を実行します。

期待結果:

- 既存 migration は `skip`
- 未適用 migration のみ `apply`
- 最後に `migration complete`

今回のように DB 側が古いと、`selection_status` のような新規カラム参照で本番が 500 になります。  
このため、リリース順は必ず `migration -> deploy` に固定します。

## 5. Cloudflare 設定

このリポジトリでは Next.js を Cloudflare Workers に載せるために OpenNext adapter を使います。

追加済みファイル:

- `open-next.config.ts`
- `wrangler.jsonc`

主要設定:

- `main`: `.open-next/worker.js`
- `assets.directory`: `.open-next/assets`
- `compatibility_flags`: `nodejs_compat`

必要なら Worker 名 `rakushu` は `wrangler.jsonc` で変更してください。

## 6. Cloudflare デプロイ

1. Cloudflare へログイン
   ```bash
   npx wrangler login
   ```
2. Workers 側へ本番 env / secret を登録
   ```bash
   npm run cf:secrets:prod
   ```
3. 本番 DB に migration を適用
   ```bash
   npm run db:migrate:prod
   ```
4. Workers ランタイムで事前確認
   ```bash
   npm run preview
   ```
5. 本番デプロイ
   ```bash
   npm run deploy
   ```
6. `workers.dev` URL で疎通確認する

CI/CD を使う場合も、実行順は `db:migrate:prod -> npm run deploy` に固定します。

## 7. デプロイ直後の確認

優先順で確認します。

1. `/login`
   - Google ログイン画面へ遷移する
2. `/dashboard`
   - 500 にならない
3. `/jobs`
   - 一覧が表示される
4. `/pricing`
   - Checkout ボタンが表示される
5. Stripe webhook
   - 購読完了後に `subscriptions` が更新される

DB 側でも最低限以下を確認します。

- `jobs.selection_status`
- `jobs.next_action_at`
- `jobs.selection_memo`
- `job_status_events`
- `usage_counters.compare_count`

Cloudflare 側でも確認します。

- Worker の本番デプロイが成功している
- `rakushu.mii4a.workers.dev` でアクセスできる
- 必要な secret が揃っている
- ログ上で auth / stripe webhook の失敗が出ていない

## 8. ロールバック方針

アプリのロールバックだけでは、先に進んだ schema は戻りません。  
そのためロールバック時は以下の切り分けで対応します。

- アプリ不具合のみ:
  - Cloudflare Workers の直前安定版へ戻す
- migration 起因:
  - その migration が後方互換かを確認する
  - 非互換変更なら手動 SQL で補正方針を決める

このリポジトリの migration は現状 `ALTER TABLE ADD COLUMN` 中心なので、後方互換性は比較的高いです。

## 9. リリースチェックリスト

- [ ] デプロイ対象コミットが確定している
- [ ] `npm test` が通っている
- [ ] `npx tsc --noEmit` が通っている
- [ ] Cloudflare Workers に本番 env / secret を登録済み
- [ ] `npm run cf:secrets:prod` または同等の手順で secret を投入済み
- [ ] Google OAuth の redirect URI が本番 URL になっている
- [ ] Stripe の webhook endpoint が本番 URL になっている
- [ ] 本番 DB に migration を適用済み
- [ ] `npm run preview` で Workers ランタイム確認済み
- [ ] `npm run deploy` を実行済み
- [ ] `/dashboard` `/jobs` `/pricing` を目視確認済み
- [ ] Stripe の購読同期を確認済み
