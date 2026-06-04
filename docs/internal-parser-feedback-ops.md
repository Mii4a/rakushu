# Internal Parser Feedback 運用メモ

このドキュメントは `/internal/parser-feedback` の閲覧ポリシーと運用手順を固定するためのメモです。

対象コード:
- `src/app/internal/parser-feedback/page.tsx`
- `src/lib/auth/internal-access.ts`
- `src/lib/jobs/parser-feedback-page-access.ts`
- `src/lib/jobs/feedback-access.ts`
- `src/lib/jobs/latest-analysis-feedback.ts`
- `src/lib/analysis/feedback.ts`
- `src/lib/db/schema.ts`
- `drizzle/0019_job_analysis_feedback_raw_excerpt_nullable.sql`

## 1. 目的
- parser 改修候補を internal だけで見返せるようにする
- 求人本文の原文断片をこの画面で再露出しない
- 閲覧権限を allowlist + admin scope で最小化する

## 2. 現行ポリシー

### アクセス入口
- 未ログイン: `requireUser()` でログイン必須
- allowlist 外: `/jobs` へリダイレクト
- allowlist 内かつ admin: 全件閲覧可能
- allowlist 内だが non-admin: 自分の求人に紐づく feedback のみ閲覧可能

### 使用する環境変数
- `INTERNAL_TOOL_EMAILS`
  - internal parser feedback 画面へ入ってよいメール一覧
  - カンマ区切り
- `INTERNAL_ADMIN_EMAILS`
  - 全件閲覧できる admin メール一覧
  - `INTERNAL_TOOL_EMAILS` にも含める

### 画面に出すもの
- severity / status
- source
- failureTypes
- summaryText
- 会社名 / source 名 / parser version
- quick checks
  - 会社名 status
  - 雇用形態 status
  - 給与 status
  - 休日 status
  - 福利厚生件数
  - warning 件数
- 元の求人へのリンク

### 画面に出さないもの
- `rawExcerpt`
- parsed snapshot の JSON dump
- 求人本文の生テキスト

## 3. 保存ポリシー
- 新規 feedback row は `buildJobAnalysisFeedbackInsert()` で `rawExcerpt: null` を保存する
- DB schema でも `job_analysis_feedback.raw_excerpt` は nullable
- 既存 row に `raw_excerpt` が残っていても、現行画面では表示しない
- `jobs.raw_text` は third-party 求人本文の複製保持を避けるため、新規保存しないだけでなく既存 row も backfill で削除する

## 4. allowlist 更新手順
1. `.env.production` の以下を更新する
   ```bash
   INTERNAL_TOOL_EMAILS=owner@example.com,reviewer@example.com
   INTERNAL_ADMIN_EMAILS=owner@example.com
   ```
2. Cloudflare Workers の secrets を更新する
   ```bash
   npm run cf:secrets:prod
   ```
3. 本番反映後に対象ユーザーで挙動確認する
   - allowlist 外 → `/jobs` へ戻される
   - allowlist 内 non-admin → 自分の row だけ見える
   - admin → 全件見える

実測メモ:
- `INTERNAL_TOOL_EMAILS` と `INTERNAL_ADMIN_EMAILS` が同一集合だと、prod 上で non-admin internal を実測できない
- その場合、full proof を取りに行くなら
  - 一時的に tool-only ユーザーを allowlist へ追加して deploy する
  - もしくは次回 allowlist 変更タイミングで同時に確認する
- 前者は本番 secret / deploy を伴うため、実行前に明示許可を取る

注意:
- admin を追加するときは、まず `INTERNAL_TOOL_EMAILS` にも入っているか確認する
- 実運用では個人 Gmail 直書きを増やしすぎず、必要最小限に保つ

## 5. リリース前の確認
- `npm test -- src/lib/jobs/parser-feedback-page-access.test.ts src/lib/jobs/feedback-access.test.ts src/lib/auth/internal-access.test.ts src/lib/analysis/feedback.test.ts`
- `npm test`
- `npm run build`

## 6. fixture 化フロー

### どの feedback を fixture 化対象にするか
- `status=open` かつ `severity=high` を最優先に見る
- `medium` でも、同じ `failureType` が同じ source shape で 3 回以上出たら対象候補に上げる
- thin-input で raw text 自体に critical field がない row は、原則 `parser_fix` ではなく `watch` または sign-off notes 側へ回す

### owner / admin の triage ルール
- admin
  - 全件を横断して recurring shape を見る
  - fixture 化対象か、quality gate / sign-off 解釈の問題かを切り分ける
- non-admin internal
  - 自分の job 由来 row だけを見て `watch` / `fixture` / `parser_fix` の下書きを付ける
  - 他ユーザー row の横断判断はしない

### sign-off artifact への反映
- scorecard には `next_action` を必ず残す
  - `ignore` / `watch` / `fixture` / `parser_fix` / `feedback_rule_fix`
- summary では recurring shape を source shape × failure type で集計して書く
- `fixture` にした row は、次回 sign-off notes で
  - fixture 名
  - 由来 source shape
  - 何を固定したテストか
  を対応づける

## 7. 将来の拡張で守ること
- 原文を見せる必要が出ても、まず権限・監査・保存方針を分けて設計する
- quick checks の追加は、原文再露出にならない集約情報を優先する
- feedback triage UI を広げる場合も、admin 全件 / non-admin 自分の row 限定の原則は維持する
