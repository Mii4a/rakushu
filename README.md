# らくしゅう (MVP)

就活の求人情報を保存・構造化して比較するWebアプリです。  
現在は **Phase 3**（比較・料金・課金導線・利用制限）まで実装済みです。

## 技術スタック
- Next.js (App Router) / TypeScript
- Turso (libSQL)
- Drizzle ORM
- Better Auth (Google OAuth)
- Tailwind CSS
- Stripe

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
4. マイグレーション生成/適用
   ```bash
   npm run db:generate
   npm run db:migrate
   ```
5. 開発サーバー起動
   ```bash
   npm run dev
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
  - ルールベース解析（`src/lib/analysis/parser.ts`）
  - スコアリング（`src/lib/analysis/scoring.ts`）
  - 解析結果保存（`job_analyses`）
- Phase 3
  - 比較画面（`/compare`）
  - 料金ページ（`/pricing`）
  - Stripe Checkout（`/api/stripe/checkout`）
  - Stripe Webhook（`/api/stripe/webhook`）
  - 利用制限（求人保存・解析・比較）

## 未実装
- テストコード
