# Stripe有効化チェックリスト

らくしゅうで Stripe を本番有効化する前提の確認メモ。

## 1. アプリ側で必要な環境変数

最低限必要:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_PLUS`
- `STRIPE_PRICE_PRO`
- `NEXT_PUBLIC_APP_URL`

任意:
- `STRIPE_ALLOW_PROMOTION_CODES`
- `STRIPE_CAMPAIGN_PROMOTION_CODE_ID`

補足:
- Checkout はサーバー側で `POST /api/stripe/checkout` から Stripe Checkout Session を作成する。
- Billing Portal は `POST /api/stripe/portal` から作成する。
- Webhook は `POST /api/stripe/webhook` で受ける。

## 2. Stripe Dashboard 側で必要な設定

### Products / Prices
以下 3 つの recurring price を作成し、price ID を環境変数へ設定する。
- Starter
- Plus
- Pro

注意:
- 価格の課金間隔は、画面文言と合わせて `月額` に統一する。
- 本番切替時に test モードの price ID を混ぜない。

### Billing Portal
Billing Portal を有効化し、最低限これを ON にする。
- 支払い方法の更新
- サブスクリプションの解約
- 請求履歴の閲覧

### Webhook
Webhook endpoint:
- `https://<本番ドメイン>/api/stripe/webhook`

最低限購読するイベント:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

この実装では `stripe_webhook_events` テーブルで event id の冪等性を取っている。

## 3. アプリ実装の現状

実装済み:
- Checkout Session 作成
- Billing Portal Session 作成
- Webhook で subscription の upsert / cancel
- webhook event の重複防止
- pricing 画面から法務ページへの導線

今回追加・確認したい論点:
- 特定商取引法ページの情報密度
- 利用規約 / 返金ポリシーの placeholder 感の除去
- pricing 上での月額・自動更新の明示

## 4. Stripe審査や公開前に見られやすい点

### 特定商取引法表示
最低限、画面上で明確に見せる:
- 販売事業者
- 運営責任者
- 所在地
- 連絡先
- 販売価格
- 支払時期 / 支払方法
- 提供時期
- 解約方法
- 返金方針

注意:
- 現状の文言だけで最終的に法的十分性を断定はできない。
- 電話番号は `070-3966-6494` を掲載する前提で運用する。実運営と異なる場合は公開前に差し替える。

### サービス説明
Stripe 審査では「何のサービスか」「何を買うか」が分かることが重要。
- pricing ページ
- 利用規約
- 返金・キャンセルポリシー
- 特商法表記
を相互リンクしておく。

### サブスク表記
以下は明示しておく:
- 月額課金であること
- 自動更新であること
- 解約タイミング
- 解約後にいつまで使えるか
- 原則返金なしの有無

## 5. ローカル / 本番確認手順

### ローカル
1. `.env.local` に Stripe test key / price を設定
2. `npm run build`
3. `npm test`
4. ログイン後、`/pricing` から checkout ボタン押下
5. Stripe CLI などで webhook を転送して subscription 行が更新されるか確認

### 本番
1. 本番 price ID を投入
2. 本番 webhook secret を投入
3. Billing Portal 設定完了を確認
4. 特商法 / 利用規約 / 返金ポリシーを最終レビュー
5. 実カードで最小プランを購入
6. `checkout.session.completed` -> `customer.subscription.updated` まで反映確認
7. Billing Portal から解約し `customer.subscription.deleted` 反映確認

## 6. 現時点の主要リスク

1. 利用規約の文言がまだ簡素
2. 返金・キャンセルポリシーの説明が短い
3. 本番 webhook / price ID / portal 設定が未確認だと公開後に詰まる
4. 公開前に実カードで end-to-end 確認していないと subscription 同期で詰まる

## 7. 次にやること

1. 特商法ページの文言を強化
2. pricing に月額 / 自動更新 / 解約導線を補足
3. 利用規約 / 返金ポリシーを launch-ready な文言へ寄せる
4. 最後に build / test を通す
