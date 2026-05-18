# rakushu_dev_credentials_checklist.md

`rakushu-dev` profile に credential を入れるときの判断メモ。
値そのものではなく、何をどちら側へ置くか、そしてどう投入するかを整理する。

## 基本ルール

`rakushu-dev` には、Hermes が terminal や CLI から直接使う credential だけを入れる。
逆に、Next.js アプリや server runtime が起動時に読む設定は、引き続き project 側の `.env.local` / `.env.production` に残す。

判断に迷ったときは、「その値を読む主体が Hermes か、Web アプリか」で切る。

## `rakushu-dev` に入れてよいもの

Hermes が開発支援や運用コマンドを実行するためのもの。

- GitHub 認証
  - 第一候補は `gh auth login`
  - 必要なら `GITHUB_TOKEN`
- Turso / libSQL 操作用
  - `TURSO_DATABASE_URL`
  - `TURSO_AUTH_TOKEN`
- Stripe 操作用
  - `STRIPE_SECRET_KEY`
  - 必要に応じて `STRIPE_WEBHOOK_SECRET`
- Cloudflare Workers 操作用
  - ブラウザログインで済ませるなら `wrangler login`
  - 非対話運用なら `CLOUDFLARE_API_TOKEN`
  - 必要に応じて `CLOUDFLARE_ACCOUNT_ID`
- Hermes の model/provider 用
  - OpenAI Codex OAuth 以外を使うときの `OPENAI_API_KEY` など
- 開発中に Hermes が直接叩く custom endpoint 用 key

## project 側 `.env.local` / `.env.production` に残すもの

Next.js アプリや server runtime が読むもの。

- `NEXT_PUBLIC_APP_URL`
- `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_PLUS`
- `STRIPE_PRICE_PRO`
- `STRIPE_ALLOW_PROMOTION_CODES`
- `STRIPE_CAMPAIGN_PROMOTION_CODE_ID`
- `OPENAI_MAIN_MODEL`
- `OPENAI_LIGHT_MODEL`

補足すると、`OPENAI_API_KEY` は少し特殊で、Web アプリ自身が OpenAI を呼ぶなら project 側にも必要になる。一方で Hermes 自身が OpenAI provider として使うなら profile 側にも必要になりうる。つまりこれは「どちらが使うか」で重なることがある。

## 今回のプロジェクト事情に照らした優先度

らくしゅうの README / deploy runbook を見る限り、Hermes から実際に触る可能性が高いのは次の4系統。

1. GitHub
   - コードレビュー、PR、push、issue 操作
2. Turso
   - `npm run db:migrate`
   - `npm run db:studio`
3. Stripe
   - ローカル webhook 検証
   - API / CLI を使う調査
4. Cloudflare
   - `npm run preview`
   - `npm run deploy`
   - `npm run cf:secrets:prod`

なので、`rakushu-dev` に最初に足す候補もこの順でよい。

## 安全な投入手順

まずテンプレートとして以下を作成済み。

`/home/openclaw/.hermes/profiles/rakushu-dev/.env.rakushu-dev.example`

このファイルは見本なので、そのまま常用せず、必要な行だけ `~/.hermes/profiles/rakushu-dev/.env` に移す。

投入するときの流れ:

1. 既存の `~/.hermes/profiles/rakushu-dev/.env` をバックアップする
2. `.env.rakushu-dev.example` を見ながら必要な行だけ追記する
3. 追加後、新しい Hermes session を開くか `/reset` する
4. 実際に使うコマンドで疎通確認する

## 具体的な確認コマンド

GitHub を使うなら:
- `gh auth status`
- もしくは `git ls-remote` が通るか確認

Turso を使うなら:
- `npm run db:migrate`
- `npm run db:studio`

Cloudflare を使うなら:
- `npm run preview`
- `npm run deploy`
- `npm run cf:secrets:prod`

Stripe を使うなら:
- `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- `stripe trigger checkout.session.completed`

## 今回確認したこと

- `/home/openclaw/rakushu/.env.local` は存在する
- `/home/openclaw/rakushu/.env.production` は存在する
- どちらも権限は `600`
- どちらも Git tracked ではない
- `rakushu-dev` は sticky default profile になっている
