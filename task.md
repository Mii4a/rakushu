# task

`/about` の導線仕上げとして、正式な `/contact` ページ追加と `/#how-to` 導線を整える。

## Goal
- `/about` の「お問い合わせ」CTA を暫定 `/beta` から正式 `/contact` に切り替える
- `UI-mock/about` と `UI-mock/beta` の既存 icon / character asset を使って `/contact` を成立させる
- 「使い方を見る」がトップの `#how-to` に着地するよう導線を通す
- marketing shell 間の nav / anchor の挙動を揃える

## Non-goals
- 新しい問い合わせ backend を追加すること
- `/beta` フォームの送信仕様自体を変更すること
- 未提供アセットを捏造すること

## Required outputs
- `src/app/contact/page.tsx`
- `src/components/about-faq-page.tsx`
- `src/components/home-demo.tsx`
