# Walkthrough: server-side application error fix

## 1. What this work is for
- 主要ナビゲーション配下の複数ページで起きている server-side application error を止める

## 2. What is being changed
1. エラーの再現とログ確認
2. 共通失敗点の切り分け
3. 原因コードの最小修正
4. 本番相当での再検証

## 3. Debugging policy
- 先に再現と原因特定を行い、当てずっぽう修正はしない
- 複数ページで同時発生なら shared layout / auth / common data load を先に疑う

## 4. Verification
- `npm run build`
- 本番相当起動後に対象ルートへアクセス
- エラー消失と正常レスポンスを確認

## 5. Done judgment
- root cause を説明できる
- 修正後に対象ルートが正常表示される
- build と確認コマンドが通る
