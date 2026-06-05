# らくしゅう

就活中の求人本文を貼り付けて解析し、条件の見落としを減らしながら比較・整理しやすくする Web アプリです。

現行実装は、単なる求人メモではなく、
- 求人本文のルールベース解析
- ランク付け結果の保存
- 自分/みんなの判断基準の管理
- 選考進捗と次アクション管理
- 通勤時間の保存・参考計算
- Stripe 課金とプラン制御
- 履歴書ワークスペース
まで一通り入っています。

## 現在実装されている主な機能

### 1. 公開ページ / 導線
- ランディングページ（`/`）
- ログインページ（`/login`）
- β参加ページ（`/beta`）
- 料金ページ（`/pricing`）
- 特商法 / 利用規約 / プライバシー / 返金ポリシーの法務ページ
- `robots.txt` / `sitemap.xml` / Google Search Console 用 meta の配信

### 2. 認証 / アカウント
- Better Auth + Google OAuth ログイン
- セッション管理
- アカウント設定ページ（`/settings/account`）
- 表示名の更新
- 連携済みアカウント一覧の表示

### 3. 求人の登録・保存・再解析
- 求人登録ページ（`/jobs/new`）
- 求人本文の貼り付け入力
- 補足情報の入力
  - 会社名
  - 職種名
  - 求人媒体名
  - URL
  - 勤務地
  - 最寄り駅
  - 手入力の通勤時間
- 求人一覧ページ（`/jobs`）
- 求人編集ページ（`/jobs/[id]/edit`）
- 求人削除
- 保存済み求人の再解析（本文は必要時に貼り直し）
- 最新解析結果を求人単位で保持

### 4. ルールベース解析・ランク付け
求人解析は LLM ではなく、`src/lib/analysis` のルールベース実装です。

抽出・判定している主な項目:
- 会社名
- 職種名
- 雇用形態
- 給与帯
- 固定残業時間 / 固定残業代
- 年間休日
- 休日制度
- 賞与回数
- 業績連動賞与
- 住宅手当
- 社宅
- 退職金
- 福利厚生
- 注意 warning

あわせて、以下を実装済みです。
- 抽出根拠 `evidence` は runtime 判定に使う
- 永続保存する parsed snapshot からは evidence 文字列を除去する
- 求人本文の永続保存は最小化し、既存 `jobs.raw_text` も third-party コンテンツ複製リスクを避けるため backfill で削除する
- missing 判定は派生 summary を保存して再利用する
- 「なし」と「不明」の区別
- 総合ランク / 個別ランクの保存
- 旧 parser 保存形式を読む正規化レイヤー
- 薄い求人本文に対する missing-item 判定
- 自動 quality feedback レコード生成

### 5. 求人整理・選考管理
- ダッシュボード（`/dashboard`）
  - 直近の保存求人
  - 解析使用数
  - 次に見るべきアクションの提案
  - 1週間以内の次アクション表示
- 求人一覧での検索 / 絞り込み / 並び替え
  - キーワード検索
  - 総合ランク絞り込み
  - 年間休日の下限絞り込み
  - 作成日 / 会社名 / ランク / 休日数で並び替え
- 選考ステータス管理
  - 保存中
  - 応募済み
  - 選考中
  - 面接予定
  - 内定
  - 見送り
- 次アクション日とメモの保存
- ステータス変更履歴の保存
- 求人詳細パネルでの解析サマリー表示

### 6. みんなの基準 / 自分用基準
- 基準一覧ページ（`/criteria`）
- 公開基準の初期投入
- 公開基準の閲覧
- 人気順 / 新着順 / 保存数順 / 利用数順での並び替え
- カテゴリ / タグ / キーワードでの絞り込み
- 公開基準の保存
- 公開基準の複製
- 公開基準の利用記録
- 自分用基準の作成（Plus 以上）
- 自分用基準の編集（Plus 以上）
  - 固定残業の閾値
  - 年間休日の閾値
  - 賞与回数の閾値
  - 退職金あり/なし時のランク
- 公開基準の view/save/clone/use 指標の蓄積

### 7. 通勤プロフィール・通勤時間
- 通勤設定ページ（`/settings/commute`）
- 自宅住所 / 最寄り駅 / 希望最大通勤時間の保存
- 求人ごとの通勤時間保存
  - 手入力値
  - GTFS ベースの参考レンジ
- 通勤情報の一覧・詳細表示
- 通勤データ種別の表示（手入力 / GTFS レンジ）
- GTFS static feed の取込スクリプト
- `provider + region` 単位の feed 再取込
- `直通 + 1回乗換` の参考通勤時間レンジ計算
- `特急 / 新幹線` 除外
- `calendar.txt` / `calendar_dates.txt` を使った運行日判定
- 既存求人の通勤データ backfill スクリプト
- `/api/commute/estimate` API

### 8. 比較ページ
- 比較ページ（`/compare`）
- 保存済み求人の横並び比較 UI
- 比較項目
  - 総合ランク
  - 通勤時間
  - 年間休日
  - 固定残業
  - 賞与
- 最短通勤 / 休日多め / 長め通勤候補のサマリー表示
- Pro プランでの利用制御

### 9. 料金・課金・プラン制御
- Free / Starter / Plus / Pro の 4 プラン定義
- 解析回数上限 / 保存件数上限 / 機能開放範囲のプラン制御
- Stripe Checkout（`/api/stripe/checkout`）
- Stripe Customer Portal（`/api/stripe/portal`）
- Stripe Webhook（`/api/stripe/webhook`）
- サブスクリプション同期
  - `stripeCustomerId`
  - `stripeSubscriptionId`
  - `plan`
  - `status`
  - `currentPeriodEnd`
- キャンペーン用 promotion code 対応
- 料金ページ上での現在プラン表示
- Plus / Pro 向けランク設定編集 UI

### 10. 履歴書ワークスペース
- 履歴書ページ（`/resume`）
- Pro プラン限定の下書き保存
- 履歴書プロフィール保存
  - 氏名 / ふりがな / 性別 / 生年月日
  - 住所 / 連絡先 / 電話 / メール
  - 学歴 / 職歴 / 資格
  - 自己PR / 志望動機 / 希望条件
- 面接で口頭補足するポイント付きの下書き生成
- Excel 形式出力 API（`/api/resume/xlsx`）

### 11. β運用・計測・内部向け機能
- β参加フォーム送信
- β応募内容の DB 保存
- UTM / referrer / CTA variant つきのマーケイベント保存
- LP / CTA / 解析完了などのイベント記録 API（`/api/marketing-events`）
- 内部 parser feedback 一覧ページ（`/internal/parser-feedback`）
  - `INTERNAL_TOOL_EMAILS` に入っているユーザーだけアクセス可能
  - `INTERNAL_ADMIN_EMAILS` は全件閲覧可能
  - それ以外の internal user は自分の求人に紐づく feedback のみ閲覧可能
  - severity / status 絞り込み
  - raw excerpt は新規保存せず、画面にも出さない
  - parsed snapshot は JSON dump を出さず quick checks だけ表示
  - parser 改修候補の洗い出し
  - 運用手順: `docs/internal-parser-feedback-ops.md`
- 本番用 Playwright smoke test

## 未実装・今後の余地
- LLM を使った高度な比較・推薦
- 通知機能
- 全国 GTFS feed の本格投入と地域拡大
- parser feedback から fixture 追加までの運用自動化
- 比較機能のさらなる深掘り（現状でも基本比較 UI はあり）

## 技術スタック
- Next.js (App Router) / TypeScript
- Turso (libSQL)
- Drizzle ORM
- Better Auth (Google OAuth)
- Tailwind CSS
- Stripe
- OpenNext / Cloudflare Workers
- Vitest
- Playwright

## テスト
- unit / integration: `npm test`
- typecheck: `npm run typecheck`
- local jobs smoke: `npm run test:local-jobs-smoke`
- production smoke: `npm run test:prod-smoke`

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
5. 既存 `jobs.raw_text` を削除
   ```bash
   npm run db:backfill:raw-text-null
   ```
6. 開発サーバー起動
   ```bash
   npm run dev
   ```

## CI / CD

この repo の自動化の役割分担は次のとおりです。

### CI
GitHub Actions で以下を自動実行します。
- `npm run lint`
- `npm test`
- `npm run typecheck`
- `npm run build`

### Playwright smoke tests
- 本番 smoke: `npm run test:prod-smoke`
- ローカル jobs 回帰 smoke: `npm run test:local-jobs-smoke`

ローカル jobs 回帰 smoke の役割:
- Better Auth セッションを local DB に一時作成して、Google OAuth を踏まずに認証済み route を確認する
- `/jobs`
- `/jobs/new`
- `/jobs/[id]`
  が 4xx/5xx にならず、console error / uncaught page error / login redirect を起こさないことを確認する

前提:
- `.env.local` に `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `BETTER_AUTH_SECRET` が入っていること
- local DB に少なくとも 1 件の saved job を持つ user がいること

この smoke は Playwright の `webServer` で local Next dev server を自動起動します。すでに同じ base URL で server が起動済みなら、それを再利用します。

必要なら特定ユーザーを指定できます。
```bash
PLAYWRIGHT_LOCAL_EMAIL=you@example.com npm run test:local-jobs-smoke
```

必要なら別の base URL を指定できます。
```bash
PLAYWRIGHT_LOCAL_BASE_URL=http://127.0.0.1:3001 npm run test:local-jobs-smoke
```

trigger:
- pull request
- `main` への push

目的は、Cloudflare 側の自動 deploy に入る前に、最低限の破綻を repo 側で止めることです。

lint は ESLint flat config (`eslint.config.mjs`) に移行し、`eslint src tests scripts next.config.ts tailwind.config.ts vitest.config.ts playwright.prod-smoke.config.ts open-next.config.ts eslint.config.mjs` を実行する形にしています。

### CD
本番投入の実行手順は `docs/production-deploy.md` を参照してください。  
重要なのは、アプリ公開前に本番 DB へ migration を先に適用することです。

このリポジトリの通常の本番反映は、GitHub の `main` 更新から Cloudflare Workers への自動デプロイで行います。

このアプリは App Router / 認証 / SSR を使っているため、Cloudflare Pages の静的配信ではなく Cloudflare Workers 上で動かします。  
Pages 向けの `next export` は使いません。

### 手動で残している運用
- Cloudflare secret 登録
- 本番 DB migration
- `jobs.raw_text` backfill
- production smoke test

つまり今の運用は、
- CI: lint / test / typecheck / build を自動化
- CD: main 更新で Cloudflare 自動 deploy
- release 前後の本番操作: 手動チェックポイントあり
という整理です。

## 本番デプロイ

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
