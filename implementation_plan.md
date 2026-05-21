# らくしゅう 安定化・広報・Stripe 実行計画

## Goal
らくしゅうを「試す価値はあるが不安定な状態」から、「初回体験が壊れにくく、流入が測れて、課金導線まで通る状態」へ進める。

## 現状の事実
- `npm test` は現状すべて通過（35 tests passed）
- `docs/job-analysis-stability-plan.md` に parser 強化方針がある
- `docs/lp-beta-cta-copy.md` と `docs/beta-intake-and-traction-spec.md` に広報 / β導線のたたき台がある
- Stripe は `checkout` / `webhook` / `portal` の実装と runbook が既にある
- したがって今必要なのは新規大機能より、既存資産をつないで運用可能な状態に持っていくこと

## 実行優先順位
1. 求人解析の安定化
2. 計測付き SNS 広報導線
3. Stripe 本番有効化
4. 補助タスクとして β 導線・本番観測・スモークテスト

---

## Track 1: 求人解析の安定化

### 目的
初回利用者が貼った求人本文に対して、媒体差分で大きく崩れない体験を作る。

### 直近タスク
1. parser test を fixture 読み込み型へ寄せる
2. 保存済み求人から匿名 fixture を追加する
3. `section map` ヘルパーを切り出す
4. `summary line fallback` を `salaryText` / `benefits` まで強化する
5. evidence と source の持ち方を統一する
6. `unknown` と `none` の判定境界を明文化する
7. 高シグナルな解析失敗だけを集める lean feedback loop を追加する

### 現在の着手内容: lean feedback loop
1. `src/lib/analysis/quality.test.ts` を先に追加して RED を確認する
2. `src/lib/analysis/quality.ts` で deterministic evaluator を実装する
3. `job_analysis_feedback` を 1 analysis = 1 row の lean schema で追加する
4. `createJobAction` / `rerunAnalysisAction` で high-signal case のみ auto-save する
5. `src/app/internal/parser-feedback/page.tsx` で internal review 一覧を追加する
6. `docs/job-analysis-stability-plan.md` に retention と fixture 化フローを追記する

### 完了条件
- 実失敗パターンが fixture として追加されている
- 失敗ケースごとに再現テストがある
- parser 変更時に何が壊れたか特定しやすい
- 主要項目で「誤抽出」と「取りこぼし」の両方が減る

### 成功指標
- fixture ベースの parser test が増える
- 既知失敗ケースの再発がテストで防げる
- `unknown` が減っても誤抽出が増えていない

---

## Track 2: SNS 広報

### 目的
広報を「投稿すること」ではなく、「誰に刺さるかを測ること」に変える。

### 前提メッセージ
最初の訴求は広げすぎず、以下に寄せる。

- ターゲット: 求人票の見極めに不安がある就活初期〜若手求職者
- ベネフィット: ブラック求人の危険信号を短時間で整理しやすくする

### 直近タスク
1. SNS 用の主訴求を 1 本に固定する
2. LP の CTA を `β参加` ベースで置く
3. 投稿ごとに UTM を付与する
4. `cta_beta_click` と `beta_form_submit` を取る
5. 投稿テンプレを 3 系統だけ用意する
   - 危険求人あるある
   - 見極めチェック観点
   - 実際に比較すると差が見える例
6. 週次で「表示・クリック・登録」を見て訴求を更新する

### 成功指標
- 投稿から LP への流入が取れる
- CTA クリック率が観測できる
- β 登録またはヒアリング応募が発生する
- どの訴求軸が効いたかを比較できる

### 注意点
- 解析品質が未整備の段階で大量流入を作らない
- フォロワー数より、登録 / 相談 / ヒアリング化を優先して見る
- 投稿は毎回プロダクト説明だけにせず、ユーザーの不安文脈から入る

---

## Track 3: Stripe 有効化設定

### 目的
課金を「コードはある」状態から「本番で安全に通せる」状態にする。

### 直近タスク
1. 本番用 Stripe Product / Price を確定する
2. `.env.production` 相当の必要値を棚卸しする
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRICE_STARTER`
   - `STRIPE_PRICE_PLUS`
   - `STRIPE_PRICE_PRO`
   - 必要なら `STRIPE_CAMPAIGN_PROMOTION_CODE_ID`
3. Cloudflare Workers secrets へ登録する
4. Stripe webhook endpoint を本番 URL に設定する
5. `checkout.session.completed`
   `customer.subscription.updated`
   `customer.subscription.deleted`
   を受ける
6. Checkout → Webhook → `subscriptions` 同期 → Portal を本番またはテストで通す
7. デプロイ後の `/pricing` 動作を確認する

### 完了条件
- `/pricing` から Checkout を開始できる
- Webhook 受信で `subscriptions` が更新される
- Portal が開ける
- 運用 runbook どおりに再現確認できる

### 注意点
- migration → deploy の順序を崩さない
- webhook secret の取り違えを避ける
- Price ID の環境切替を曖昧にしない

---

## Track 4: 追加でやるべきこと

### 4-1. β 導線
- LP 上に β CTA を設置
- 最小フォームで連絡先 / 状況 / 困りごとを回収
- 可能ならヒアリング協力可否も回収

### 4-2. 計測基盤
最低限これだけは取る。
- `lp_view`
- `cta_beta_click`
- `beta_form_view`
- `beta_form_submit`
- `demo_interaction_started`
- `job_text_pasted`
- `analysis_completed`
- `signup_started`
- `signup_completed`

### 4-3. 本番観測
- auth failure
- stripe webhook failure
- parser 周りの server error
- pricing ページの導線切れ

### 4-4. リリース前スモークテスト
- `/login`
- `/dashboard`
- `/jobs`
- `/pricing`
- 購読同期

---

## まず 7 日でやる順番

### Day 1-2
- parser の既知失敗ケースを fixture 化
- LP / β導線 / 計測イベントの最小仕様を確定

### Day 3-4
- β CTA とフォームを実装
- LP / CTA / フォーム送信の計測を入れる
- SNS 投稿テンプレを 3 本作る

### Day 5
- Stripe 本番設定値を棚卸し
- webhook / price / secrets の設定手順を dry-run で確認

### Day 6
- SNS で小さく告知開始
- β 登録とヒアリング募集を回収開始

### Day 7
- Stripe テスト購入と購読同期を通す
- 流入 / CTA / 登録 / 解析完了の数字を見て次週の優先順位を更新

---

## 今この瞬間の最重要順
1. 求人解析の fixture 強化
2. β CTA + 計測
3. SNS 告知の最小運用
4. Stripe secrets / webhook / price の本番設定

## 判断基準
- 「動くか」より「壊れにくいか」を先に見る
- 「広く届けるか」より「誰に刺さるか分かるか」を先に見る
- 「課金を置いたか」より「課金前価値が伝わるか」を先に見る
