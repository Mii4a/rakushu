# walkthrough

- 現状の本番 `https://rakushu.mii4a.workers.dev/` には `gtag.js`, `dataLayer`, `GTM-*`, `G-*` が見当たらず、通常の GA4 Google tag は未設置だった
- `src/app/layout.tsx` は全ページ共通の root layout なので、ここへ入れればページごとの貼り漏れを防げる
- 実装は `next/script` で 2 本入れる想定
  - `https://www.googletagmanager.com/gtag/js?id=G-DN7RE22E6S`
  - `window.dataLayer` と `gtag('config', 'G-DN7RE22E6S')` の初期化
- Search Console verification meta は同じ layout の metadata 経由で入っているため、そこを壊さないよう head への追加だけに留める
- 測定 ID は `NEXT_PUBLIC_GA_MEASUREMENT_ID` があればそれを優先し、未設定時は今回の ID を fallback にする
- 最後に `npm run build` と本番 HTML 実測で、タグ文字列が返るところまで確認する
