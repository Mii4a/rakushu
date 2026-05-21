# らくしゅう β導線・初期トラクション計測仕様

## 目的
LP 訪問から β 参加登録までの初期反応を計測し、需要の兆しを見えるようにする。

## 最初に置く CTA
- 文言案 A: 無料でβ参加して、求人票の見極めを先に試す
- 文言案 B: ブラック求人を避けたい人向けβ版に参加する
- 文言案 C: 求人票の不安を減らす新機能を先に試す

## βフォームの最小入力項目
必須:
- 連絡先（メール or Discord）
- 現在の状況（新卒就活 / 転職活動 / 情報収集中）
- いま一番困っていること

任意:
- 志望職種
- 1 週間で見る求人本数
- ヒアリング協力可否

## 取得したいイベント
1. `lp_view`
   - page
   - referrer
   - utm_source
   - utm_campaign
2. `cta_beta_click`
   - page
   - cta_variant
3. `beta_form_view`
   - page
   - cta_variant
4. `beta_form_submit`
   - current_status
   - top_problem_category
   - interview_opt_in
5. `demo_interaction_started`
   - page
6. `job_text_pasted`
   - text_length_bucket
7. `analysis_completed`
   - total_rank
8. `signup_started`
9. `signup_completed`

## 最初のKPI
- LP訪問数
- CTAクリック率
- βフォーム到達率
- βフォーム送信率
- ヒアリング協力率
- デモ開始率
- 解析完了率

## 最初の判断基準
- LP訪問はあるのに CTA が押されない
  - 訴求が弱い or ターゲットがずれている
- CTA は押されるのに送信されない
  - フォーム負荷が高い or 不安が勝っている
- 送信はあるがデモ利用につながらない
  - ソリューションのつながりが弱い
- ヒアリング協力率が高い
  - 課題の強さが高い可能性

## まず実装しなくてよいもの
- 複雑なスコアリングダッシュボード
- 高度なセグメント分析
- 大量のフォーム項目
- 自動メール育成

## 実装メモ
- はじめは 1 本の β 導線でよい
- CTA 文言は 2〜3 種まで
- まずは「連絡先を残すかどうか」を最重要シグナルにする
- 定量だけでなく、自由記述の悩み文面を必ず残す
