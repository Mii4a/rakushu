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
4. マイグレーション生成/適用
   ```bash
   npm run db:generate
   npm run db:migrate
   ```
5. 開発サーバー起動
   ```bash
   npm run dev
   ```

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

## 未実装
- AI比較や推薦の高度化
- 通知機能
