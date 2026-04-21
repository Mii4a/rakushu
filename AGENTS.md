# AGENTS.md - rakushu

このファイルは、Codex がこのリポジトリで作業する際の共通ルールです。

## プロダクト
- アプリ名: らくしゅう
- 目的: 就活求人本文を保存し、ルールベース解析で比較しやすくする。
- 現在フェーズ: Phase 3（比較・料金・課金導線・利用制限まで）。

## 優先順位
1. 実装可能性（ローカルで動くこと）
2. 保守性（責務分離）
3. MVPの成立（過剰実装しない）

## 技術スタック
- Next.js App Router / TypeScript
- Turso(libSQL) + Drizzle ORM
- Better Auth (Google OAuth)
- Stripe
- Tailwind CSS

## 重要制約
- 求人解析は `src/lib/analysis` で実装。
- LLMを使わず、正規表現・辞書・ルールベースで抽出する。
- `rawText` を必ず保存する。
- 「なし」と「不明」を区別する。
- 解析結果には evidence（根拠文字列）を残す。

## よく使うコマンド
- `npm install`
- `npm run db:generate`
- `npm run db:migrate`
- `npm run dev`
- `npm test`

## DBマイグレーション
- `db:migrate` は `scripts/migrate-turso.mjs` を実行し、`drizzle/*.sql` を Turso に順次適用する。
- Better Auth で `verification` テーブルエラーが出る場合、まず `npm run db:migrate` を再実行して確認する。

## 作業方針
- 変更は小さく分ける。
- 追加した仕様は README または docs に反映する。
- エラー対応時は「再現手順」「原因」「対策」をセットで残す。

## セキュリティ
- シークレット値は絶対にコミットしない。
- ユーザーが誤って共有した秘密情報はローテーションを促す。
