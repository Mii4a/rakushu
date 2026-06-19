# implementation plan

1. 既存の head / analytics 状態を確認する
   - `src/app/layout.tsx` を見て、全ページ共通で差し込める場所を使う
   - 既存の `gtag`, `googletagmanager`, `GTM-`, `G-` を検索し、重複実装がないことを確認する

2. Google tag を root layout に集約して追加する
   - `next/script` を使って `gtag.js?id=G-DN7RE22E6S` を全ページで読み込む
   - 初期化スクリプトで `window.dataLayer`, `gtag('js', new Date())`, `gtag('config', 'G-DN7RE22E6S')` を設定する
   - 既存 metadata / Search Console verification には触らない

3. 運用しやすい形にする
   - 測定 ID は `NEXT_PUBLIC_GA_MEASUREMENT_ID` を優先し、未設定時は今回の `G-DN7RE22E6S` を使う
   - これで次回差し替え時にコード変更を最小化する

4. 実装後に検証する
   - `npm run build` を通す
   - build 後または本番 HTML で `googletagmanager.com/gtag/js` と `G-DN7RE22E6S` が出ることを確認する
