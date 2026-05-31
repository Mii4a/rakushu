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

GOOGLE_MAPS_SERVER_API_KEY=replace-with-production-server-maps-key
NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY=replace-with-production-browser-maps-key

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

INTERNAL_TOOL_EMAILS=owner@example.com,reviewer@example.com
INTERNAL_ADMIN_EMAILS=owner@example.com
GOOGLE_SEARCH_CONSOLE_SITE_VERIFICATION=
GOOGLE_SITE_VERIFICATION=
```

注意:
- `BETTER_AUTH_SECRET` は 32 文字以上の強いランダム値を使う
- `TURSO_DATABASE_URL` と `TURSO_AUTH_TOKEN` は本番専用値にする
- `GOOGLE_MAPS_SERVER_API_KEY` は Routes API / Geocoding API など server-side 専用キーにする
- `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY` は Maps JavaScript API 用の browser 専用キーにする
- `STRIPE_*` は live mode の値に切り替える
- `INTERNAL_TOOL_EMAILS` は internal parser feedback を見てよいメールだけをカンマ区切りで入れる
- `INTERNAL_ADMIN_EMAILS` はその中でも全件閲覧できる admin メールだけを入れる
- `.env.production` はテンプレート用途にとどめ、秘密値は Git に載せない
- 追跡対象のテンプレートは `.env.production.example`
- `GOOGLE_SEARCH_CONSOLE_SITE_VERIFICATION` は Search Console の HTML tag 方式を使うときだけ設定する
- `GOOGLE_SITE_VERIFICATION` は旧名の互換 alias として残してある

Cloudflare への投入例:

```bash
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put TURSO_DATABASE_URL_SECRET
npx wrangler secret put TURSO_AUTH_TOKEN
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_MAPS_SERVER_API_KEY
npx wrangler secret put STRIPE_PRICE_STARTER_SECRET
npx wrangler secret put STRIPE_PRICE_PLUS_SECRET
npx wrangler secret put STRIPE_PRICE_PRO_SECRET
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put INTERNAL_TOOL_EMAILS
npx wrangler secret put INTERNAL_ADMIN_EMAILS
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
- `GOOGLE_MAPS_SERVER_API_KEY`
- `STRIPE_PRICE_STARTER_SECRET`
- `STRIPE_PRICE_PLUS_SECRET`
- `STRIPE_PRICE_PRO_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `OPENAI_API_KEY`
- `INTERNAL_TOOL_EMAILS`
- `INTERNAL_ADMIN_EMAILS`

`STRIPE_CAMPAIGN_PROMOTION_CODE_ID_SECRET` は任意です。`.env.production` に値が入っている場合だけ secret として登録します。

`NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY` は browser で読む公開値なので、secret ではなく環境変数として管理します。

## 3. 外部サービス設定

### Google OAuth

Google Cloud Console で以下を登録します。

- Authorized JavaScript origins:
  - `https://rakushu.mii4a.workers.dev`
- Authorized redirect URIs:
  - `https://rakushu.mii4a.workers.dev/api/auth/callback/google`

このアプリの Better Auth は `BETTER_AUTH_URL` を `baseURL` として使います。

### Google Maps Platform

キーは `server` と `browser` で分けます。

- `GOOGLE_MAPS_SERVER_API_KEY`
  - 用途: `Routes API`、将来の `Geocoding API`
  - API restrictions: `Routes API`、必要になったら `Geocoding API`
- `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY`
  - 用途: 将来の地図表示、属性別の地点強調
  - API restrictions: `Maps JavaScript API`

制限の考え方:

- browser key: `Websites`
- server key:
  - 固定 egress を持てるなら `IP addresses`
  - 固定 egress を持てないなら `API restrictions` を必要最小限に絞る

### Google Search Console

詳細な手順は `docs/google-search-console-checklist.md` を参照。

最短では次の順です。
1. Search Console で `https://rakushu.mii4a.workers.dev` の URL prefix property を追加
2. HTML tag 方式で verification code を取得
3. その値を `GOOGLE_SEARCH_CONSOLE_SITE_VERIFICATION` に入れて再デプロイ
4. `https://rakushu.mii4a.workers.dev/sitemap.xml` を sitemap として送信
5. 独自ドメインへ移るときは、そのドメインでも property を追加し直す

### Stripe

Stripe 側で以下を設定します。

- Product / Price:
  - `Starter`
  - `Plus`
  - `Pro`
- Webhook endpoint:
  - `https://rakushu.mii4a.workers.dev/api/stripe/webhook`
- Billing Portal:
  - 支払い方法更新
  - サブスクリプション解約
  - 請求履歴の閲覧

受信イベント例:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

本番有効化前の release gate:
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_*` が live mode で揃っている
- `/pricing` に「月額」「自動更新」「解約導線」が見えている
- 実カードで 1 回購入し、Webhook 反映と Billing Portal 解約まで通している
- 詳細チェックは `docs/stripe-activation-checklist.md`

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

このリポジトリの通常の本番反映は、GitHub の `main` 更新をトリガーにした Cloudflare Workers 自動デプロイです。  
そのため、日常運用では `wrangler deploy` を直接叩くより、以下の順で整えてから `main` へ反映します。

1. Workers 側へ本番 env / secret を登録
   ```bash
   npm run cf:secrets:prod
   ```
2. 本番 DB に migration を適用
   ```bash
   npm run db:migrate:prod
   ```
3. migration 状態が pending 0 件か確認
   ```bash
   npm run db:migrate:prod:status
   ```
   - `pending migrations: none` になること
   - 1件でも pending が出たら `main` 更新に進まない
4. Workers ランタイムで事前確認したい場合だけローカル preview を使う
   ```bash
   npm run preview
   ```
5. GitHub の `main` へ反映して Cloudflare の自動デプロイを待つ
6. deploy 後に migration 状態を再確認
   ```bash
   npm run db:migrate:prod:status
   ```
7. `workers.dev` URL で疎通確認する

手動 deploy を使うのは、CI/CD 経路を使えない一時対応や切り分け時だけです。  
通常運用の実行順は `cf:secrets:prod -> db:migrate:prod -> db:migrate:prod:status -> main 更新 -> db:migrate:prod:status` に固定します。

## 7. デプロイ直後の確認

優先順で確認します。

1. `/login`
   - Google ログイン画面へ遷移する
   - 備考: Google OAuth 開始は `authClient.signIn.social(...)` を使う。`/api/auth/sign-in/social?...` へ直接 `window.location.assign` すると、本番環境で 404 になる場合がある
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
- [ ] `npm run db:migrate:prod:status` が `pending migrations: none` を返した
- [ ] `npm run preview` で Workers ランタイム確認済み
- [ ] `npm run deploy` を実行済み
- [ ] deploy 後にも `npm run db:migrate:prod:status` を再実行して pending 0 件を確認済み
- [ ] `/dashboard` `/jobs` `/pricing` を目視確認済み
- [ ] Stripe の購読同期を確認済み


## 10. Stripe ローカル検証（Checkout / Webhook / Portal）

Stripe 課金周りの変更時は、次の順で再現検証します。

1. 開発サーバー起動
   ```bash
   npm run dev
   ```
2. Stripe CLI で webhook 転送
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
3. 表示された `whsec_...` を `.env.local` の `STRIPE_WEBHOOK_SECRET` に設定
4. ログイン後 `/pricing` で Checkout 実行
5. Stripe checkout 完了後、`subscriptions` テーブルの `stripe_customer_id` / `stripe_subscription_id` / `plan` / `status` を確認
6. `/pricing` の「請求情報を管理する（解約・支払い方法）」から Customer Portal を開けることを確認
7. Portal 上で解約予約 or 支払い方法更新を行い、`customer.subscription.updated` が到達することを確認

### よくあるエラー対応（再現手順 / 原因 / 対策）

#### A. `Webhook処理に失敗しました`（400）
- 再現手順: `stripe listen` を起動せずに Checkout を実行、または古い `STRIPE_WEBHOOK_SECRET` のまま実行
- 原因: `stripe-signature` の検証に失敗（署名シークレット不一致）
- 対策: `stripe listen` を再起動し、新しく表示された `whsec_...` を設定して再実行

#### B. `Stripe顧客情報が見つかりません`（portal API 400）
- 再現手順: 一度も有料購読していないユーザーで Portal ボタンを押す
- 原因: `subscriptions.stripe_customer_id` が未保存
- 対策: 先に Checkout を完了し、webhook で subscription が upsert されることを確認

#### C. `customer.subscription.updated` でプランが同期されない
- 再現手順: metadata が無い更新イベントを受信する
- 原因: `metadata.userId` だけに依存した実装だと対象ユーザーを特定できない
- 対策: 現行実装は `stripeCustomerId` からユーザー逆引きフォールバックあり。`subscriptions.stripe_customer_id` が保存済みか確認する
