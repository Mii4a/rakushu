# task

- GA4 の Google tag（測定 ID: `G-DN7RE22E6S`）が未設置なので、らくしゅうの全ページで読み込まれるように入れる
- 既存の Search Console verification や metadata を壊さず、重複タグを増やさない最小変更にする
- App Router の root layout で一元管理し、今後タグ差し替えしやすい形にする
- build と本番 HTML 実測で `gtag.js` と `G-DN7RE22E6S` の反映を確認する
