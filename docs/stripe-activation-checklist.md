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

## 7. Launch gate

公開前に、以下が全部 yes になってから本番有効化する。

- [ ] `STRIPE_SECRET_KEY` が live mode
- [ ] `STRIPE_WEBHOOK_SECRET` が本番 endpoint の値
- [ ] `STRIPE_PRICE_STARTER` / `PLUS` / `PRO` が全部 live mode
- [ ] Billing Portal で「支払い方法更新 / 解約 / 請求履歴」が有効
- [ ] pricing / 特商法 / 利用規約 / 返金ポリシーの相互リンクを最終確認
- [ ] pricing に「月額」「自動更新」「解約は portal から可能」が見えている
- [ ] `npm run build`
- [ ] `npm test`
- [ ] 実カードで Starter 以上の最小課金を 1 回通した
- [ ] Billing Portal から解約まで 1 回通した

## 8. 本番有効化の実行順

1. Stripe Dashboard で live mode の Price / Webhook / Billing Portal を確定
2. `.env.production` に live mode 値を入れる
3. `npm run cf:secrets:prod`
4. `npm run db:migrate:prod`
5. `npm run deploy`
6. 本番で `/pricing` → Checkout → webhook 反映 → Portal 解約まで確認

## 9. E2E smoke test 記録項目

最低限、以下をメモとして残す。

- 実施日時
- 使ったプラン（Starter / Plus / Pro）
- Checkout Session 作成成功可否
- `checkout.session.completed` 受信可否
- `customer.subscription.updated` 受信可否
- `customer.subscription.deleted` 受信可否
- `subscriptions` テーブルの `plan` / `status` / `stripeSubscriptionId`
- 解約後にいつまで利用可能として表示されたか

## 10. つまずいた時の切り分け

- Checkout で失敗
  - Price ID が test/live 混在していないか
  - `NEXT_PUBLIC_APP_URL` と `BETTER_AUTH_URL` が本番 URL か
- 購入成功したのに反映されない
  - webhook endpoint URL と `STRIPE_WEBHOOK_SECRET` の組み合わせが一致しているか
  - `stripe_webhook_events` に event id が保存されているか
- Billing Portal で解約できない
  - Portal 設定で解約が有効か
- 反映が途中で止まる
  - `subscriptions` の unique 制約に既存ゴミデータがないか
