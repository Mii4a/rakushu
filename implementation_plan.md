# Server-side Application Error Investigation Plan

Goal: 主要ナビゲーション配下の複数ページで発生する server-side application error の根本原因を特定し、最小修正で復旧する。

## Track 1: 再現と証拠収集
- `npm run build` / 本番相当起動で症状を再現
- 対象ルートごとの HTTP 応答とログを確認
- 共通して落ちる境界（layout / auth / shared query / shared component）を特定

Success condition:
- どのルートでどう落ちるかをログ付きで説明できる

## Track 2: 原因切り分け
- エラースタックの該当ファイルを読む
- 最近の変更と関連コードを確認
- 必要なら一時的に境界ごとに stub / early return で絞る

Success condition:
- root cause hypothesis を 1 つに絞れる

## Track 3: 修正実装
- 根本原因だけを直す最小変更を入れる
- 可能なら既存パターンに寄せる

Success condition:
- 対象ルートのサーバーエラーが消える

## Track 4: 検証
- `npm run build`
- 本番相当サーバー起動
- 対象ルートを順に確認

Success condition:
- 各対象ページが正常表示される
