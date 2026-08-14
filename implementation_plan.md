# implementation_plan

1. 現在のトップデモ、Googleログインボタン、求人作成フォーム、企業研究入力フォームのデータ流れを確認する。
2. ログイン前デモ入力の一時保存仕様を定義する。
   - 保存先は `sessionStorage`
   - URLには `restoreDemo=1` と遷移先だけを載せる
   - payload は feature ごとに分ける
   - 復元後は削除する
3. RED: Playwright に、求人チェッカー入力→CTA→Googleログイン開始callbackURL、企業研究入力→CTA→Googleログイン開始callbackURL、一時保存値の復元/削除を検証するテストを追加する。
4. トップページの求人票 textarea / 企業URL input を controlled state にし、CTA押下時に該当 feature の payload を `sessionStorage` へ保存してからログインモーダルを開く。
5. `GoogleLoginButton` に `callbackPath` を渡せるようにし、top modal から `/jobs/new?restoreDemo=1` または `/company-research?restoreDemo=1` を指定する。
6. 求人作成フォームで `restoreDemo=1` のときだけ `sessionStorage` の求人チェッカーpayloadを読み、`rawText` へ復元して保存値を削除する。
7. 企業研究ページで `restoreDemo=1` のときだけ `sessionStorage` の企業研究payloadを読み、新規入力モードと企業URL入力へ復元して保存値を削除する。
8. 復元成功時の補助テキスト/トースト相当を最小限追加し、ユーザーに引き継ぎが分かるようにする。
9. focused Playwright → typecheck → lint の順で検証する。
10. `walkthrough.md` に実装内容・検証ログ・残した判断を記録する。
