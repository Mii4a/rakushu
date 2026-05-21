# task.md

## 目的
らくしゅうの次の実行優先を、以下の 3 本柱で安定化する。

1. 求人解析の安定化
2. SNS 広報の開始
3. Stripe 有効化と課金導線の本番化

加えて、この 3 本が空回りしないための最低限の計測・検証タスクも明示する。

## 背景
- プロダクトの主価値は「求人本文を保存し、ルールベース解析で比較しやすくする」こと
- `src/lib/analysis/parser.ts` には既に parser test があり、現状 `npm test` は 35 tests passed
- Stripe Checkout / Webhook / Portal の API と runbook は既に repo に存在する
- LP / β CTA / 初期トラクション計測の草案ドキュメントも存在する
- つまり今はゼロから作る段階ではなく、「壊れにくくする」「人に届くようにする」「お金が流れるようにする」を順に詰める段階

## 今回の判断
優先順位は次の順にする。

1. 求人解析の安定化
2. 計測付きの SNS 広報導線
3. Stripe 本番有効化

理由:
- 解析が不安定なまま広報すると、初回体験で信用を落としやすい
- 広報だけ先にやっても、流入計測がないと何が効いたか分からない
- Stripe は重要だが、課金前に「使う価値がある」と感じてもらう導線の整備が先

## 各テーマのゴール

### 1. 求人解析の安定化
- 媒体差分や表記ゆれで壊れにくい parser にする
- 実データ由来の匿名 fixture を増やす
- `unknown` と誤抽出の両方を減らす
- evidence を揃えて失敗分析しやすくする
- 解析失敗の高シグナルケースだけを軽量 feedback として自動収集し、長期運用コストを増やさず改善ループへ回す

#### 現在の実装フォーカス
- `quality.ts` で rule-based の failure detection を追加する
- 1 analysis = 1 feedback row の lean schema を追加する
- canonical snapshot は `job_analyses.evidenceJson` を参照し、feedback 側で重複保存しない
- internal review 一覧を追加し、user 向け報告 UI は Phase 2 へ後回しにする

### 2. SNS 広報
- 誰に何を訴求するかを 1 本に絞る
- LP / β CTA / demo までの導線をつなぐ
- 投稿ごとの流入元と反応を追えるようにする
- まずは登録やヒアリング獲得につながる広報を回す

### 3. Stripe 有効化設定
- 本番用 Price / Webhook / secrets を正しく揃える
- Checkout → Webhook → subscription 同期 → Portal の動線を通す
- デプロイ後の確認項目を固定し、再現可能にする

## 他にも今やるべきこと

### A. 最低限の計測導入
- `lp_view`
- `cta_beta_click`
- `beta_form_view`
- `beta_form_submit`
- `demo_interaction_started`
- `job_text_pasted`
- `analysis_completed`
- `signup_started`
- `signup_completed`

### B. β 導線の整備
- LP に β CTA を置く
- 最小フォームで連絡先 / 状況 / 困りごとを回収する
- 定性の悩み文面を残す

### C. 本番スモークテスト
- `/login`
- `/dashboard`
- `/jobs`
- `/pricing`
- Stripe webhook 同期

### D. 障害観測の基礎
- parser failure の手元再現手順を固定する
- 本番ログで auth / stripe / server error を追えるようにする

## 非ゴール
- GTFS の地域拡大
- 新しい大型 AI 機能追加
- UI の細かな polish のみを先に進めること
- 課題仮説のないまま広報チャネルだけ増やすこと

## 成果物
- 優先順位を更新した `task.md`
- 実行順を具体化した `implementation_plan.md`
- すぐ着手する順番だけを短く確認できる `walkthrough.md`
