# らくしゅう (MVP)

就活の求人情報を保存・構造化して管理するWebアプリです。  
現在は **Phase 5**（求人進捗管理・編集・次アクション管理）まで実装済みです。

## 技術スタック
- Next.js (App Router) / TypeScript
- Turso (libSQL)
- Drizzle ORM
- Better Auth (Google OAuth)
- Tailwind CSS
- Stripe
- OpenAI API（設定基盤）

## セットアップ
1. 依存関係をインストール
   ```bash
   npm install
   ```
2. 環境変数を作成
   ```bash
   cp .env.example .env.local
   ```
3. `.env.local` に値を設定
   Stripe をローカルで確認する場合は、少なくとも以下を設定してください。
   ```bash
   GOOGLE_MAPS_SERVER_API_KEY=AIza...
   NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY=AIza...
   STRIPE_SECRET_KEY=sk_test_...
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
   Maps のキーは `開発/本番` と `server/browser` で分けます。
   - server key: `GOOGLE_MAPS_SERVER_API_KEY`
   - browser key: `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY`
   - 本番では同じ変数名に本番値を入れます
4. マイグレーション生成/適用
   ```bash
   npm run db:generate
   npm run db:migrate
   ```
5. 開発サーバー起動
   ```bash
   npm run dev
   ```

## 本番デプロイ

本番投入の実行手順は [docs/production-deploy.md](/home/openclaw/rakushu/docs/production-deploy.md) を参照してください。  
重要なのは、アプリ公開前に本番 DB へ migration を先に適用することです。

このアプリは App Router / 認証 / SSR を使っているため、Cloudflare Pages の静的配信ではなく Cloudflare Workers 上で動かします。  
Cloudflare Pages は静的 export 向けで、この構成の本番配備先としては使いません。

本番 env テンプレート:
```bash
cp .env.production.example .env.production
```

本番 DB への migration 実行:
```bash
npm run db:migrate:prod
```

本番 DB migration 状態の確認:
```bash
npm run db:migrate:prod:status
```

期待結果は `pending migrations: none` です。deploy 前後の両方で確認します。

Cloudflare Workers ランタイムでの事前確認:
```bash
npm run preview
```

Cloudflare Workers への secret 登録:
```bash
npm run cf:secrets:prod
```

Cloudflare Workers へのデプロイ:
```bash
npm run deploy
```

推奨順序:
```bash
npm run db:migrate:prod
npm run db:migrate:prod:status
npm run deploy
npm run db:migrate:prod:status
npm run test:prod-smoke
```

現在の本番公開 URL は `https://rakushu.mii4a.workers.dev` です。

Google Search Console 対応のため、以下も用意しています。
- `src/app/robots.ts` → `/robots.txt`
- `src/app/sitemap.ts` → `/sitemap.xml`
- `GOOGLE_SEARCH_CONSOLE_SITE_VERIFICATION` → `<meta name="google-site-verification">`
- 登録手順: `docs/google-search-console-checklist.md`

## Stripe ローカル検証
1. `.env.local` に Stripe のテスト用値を設定
2. 開発サーバーを起動
   ```bash
   npm run dev
   ```
3. 別ターミナルで Stripe CLI を起動して Webhook を転送
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   表示された signing secret を `STRIPE_WEBHOOK_SECRET` に設定します。
4. Google ログイン後に `http://localhost:3000/pricing` を開き、Starter / Plus / Pro を選択
5. Checkout 完了後、`subscriptions` テーブルに `stripeCustomerId` `stripeSubscriptionId` `plan` `status` が同期されることを確認

Webhook だけを個別に試す場合:
```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

## 実装済み範囲
- Phase 1
  - ディレクトリ責務分離
  - Turso接続基盤
  - Drizzleスキーマ
  - Better Auth + Google認証
  - 最低限ページ（`/`, `/login`, `/dashboard`）
- Phase 2
  - 求人登録（`/jobs/new`）
  - 求人一覧（`/jobs`）
  - 求人詳細（`/jobs/[id]`）
  - 求人編集（`/jobs/[id]/edit`）
  - ルールベース解析（`src/lib/analysis/parser.ts`）
  - スコアリング（`src/lib/analysis/scoring.ts`）
  - 解析結果保存（`job_analyses`）
- Phase 3
  - 料金ページ（`/pricing`）
  - Stripe Checkout（`/api/stripe/checkout`）
  - Stripe Webhook（`/api/stripe/webhook`）
  - 利用制限（求人保存・解析）
- Phase 4
  - Starter / Plus / Pro の3段階プラン
  - 月間AIクレジット定義（Starter 30 / Plus 120 / Pro 400）
  - キャンペーン半額表示と Stripe promotion code 許可
  - OpenAI Responses API 互換を見据えたモデル設定（`gpt-4.1-mini` / `gpt-4.1-nano`）
  - みんなの基準（公開基準の閲覧・保存・複製・利用統計の土台）
  - 公開基準の人気指標（view/save/clone/use と popularity score）
- Phase 5
  - 選考ステータス管理（応募済み / 書類選考中 / 面接中 / 内定 / 見送り）
  - 次アクション日とメモの管理
  - ステータス変更履歴保存（`job_status_events`）
  - ダッシュボードの直近アクション表示
- 通勤時間 GTFS MVP（最小完了）
  - `GTFS/GTFS-JP` feed の取込（ディレクトリ / zip / manifest）
  - `provider + region` 単位の feed 再取込
  - `直通 + 1回乗換` の参考通勤時間レンジ計算
  - `特急 / 新幹線` 除外
  - `calendar.txt` と `calendar_dates.txt` の保持
  - `jobs` への通勤レンジ保存と一覧 / 詳細 / 比較表示
  - 詳細は `docs/commute-gtfs-status.md`

## 未実装
- AI比較や推薦の高度化
- 通知機能
- 全国 GTFS feed の本投入と地域拡大
- GTFS/GTFS-JP ベースの通勤時間設計は `docs/commute-gtfs-mvp-plan.md` に整理
- GTFS 通勤機能の現在地と再開メモは `docs/commute-gtfs-status.md`
- 実 feed 候補は `docs/commute-gtfs-feed-candidates.md`
- ODPT token 取得待ちで止めた場合も、再開手順は `docs/commute-gtfs-status.md` に記録
- 既存求人の通勤レンジ backfill は `npm run db:backfill:commute` で実行可能
- GTFS feed の再取込は `node scripts/import-gtfs-static.mjs ...` が既定で `provider + region` 単位の置換、積み増したいときだけ `--append`
- GTFS importer は展開済みディレクトリだけでなく `.zip` も直接読める
- 複数 feed の一括取込は `npm run db:import:gtfs -- --manifest ./config/gtfs-feeds.example.json`
- 首都圏向けの実 feed 雛形は `config/gtfs-feeds.kanto.example.json`
- ODPT token を使った download + import 一括同期は `npm run db:sync:gtfs -- --manifest ./config/gtfs-feeds.kanto.example.json`
