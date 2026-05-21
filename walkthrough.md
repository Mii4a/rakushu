# walkthrough.md

## 今回の主題
次に進めるべきなのは、この 3 つ。

1. 求人解析の安定化
2. SNS 広報
3. Stripe 有効化設定

ただし順番が大事。

## 結論
優先順はこう。

1. 求人解析の安定化
2. β CTA と計測を入れたうえで SNS 広報
3. Stripe 本番有効化

## その理由
- 解析が弱いまま人を連れてくると初回体験で落ちる
- 広報しても計測がないと何が効いたか残らない
- Stripe は重要だが、価値体験と需要観測が先に固まっていた方が強い

## まずやること
### 1. 求人解析
- 実失敗ケースを匿名 fixture にする
- parser test を fixture ベースで増やす
- summary line fallback を強化する
- 高シグナルな失敗だけを 1 analysis = 1 feedback row で自動収集する
- internal review 一覧で fixture 化候補を見返せるようにする

### 2. SNS 広報
- 訴求を 1 本に絞る
- LP に β CTA を置く
- 投稿リンクに UTM を付ける
- `cta_beta_click` と `beta_form_submit` を取る

### 3. Stripe
- 本番 Product / Price / Webhook / secrets を揃える
- Checkout → Webhook → subscription 同期 → Portal を通す

## 他にもやるべきこと
- β フォーム整備
- 最低限のイベント計測
- `/pricing` 含む本番スモークテスト
- auth / stripe / parser エラーの観測

## 最初の 1 アクション
今の実装着手は、まず `quality.test.ts` を RED で追加し、lean feedback loop の evaluator と schema を先に固めるのがいちばん堅い。
