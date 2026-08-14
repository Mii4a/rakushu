# walkthrough

## トップページデモ入力のログイン後引き継ぎ

- Target route: `/`
- Job checker destination: `/jobs/new?restoreDemo=1`
- Company research destination: `/company-research?restoreDemo=1`

## 実装方針

- ログイン前デモ入力は `sessionStorage` に一時保存する。
- URLには入力本文を載せず、`restoreDemo=1` のみを復元トリガーにする。
- 求人チェッカーと企業研究で payload を分け、ページ側で feature が一致したときだけ復元する。
- 復元後は同じ一時保存値を削除し、再訪問で勝手に再入力されないようにする。
- ログイン完了後は即実行せず、フォームに値を移してユーザー確認後に実行できる状態にする。

## 検証ログ

- `npm run typecheck`: pass
- `npm run test`: pass（33 files / 175 tests）
- `npm run lint`: pass（0 errors / 16 warnings。既存の未使用変数・`img` 警告のみ）
