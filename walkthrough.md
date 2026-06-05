# walkthrough

## Manual review target
- `/contact`
- `/about`
- `/#how-to`

## What to change
- `/contact` を marketing surface 上で成立させる
- `BetaIntakeForm` をそのまま使い、周辺の hero / cards で問い合わせページ化する
- `/about` の support CTA は `/contact` に向ける
- 「使い方を見る」はトップの `#how-to` へ着地させる
- home nav の hash link も絶対パス化して他ページからの往復でブレないようにする

## Visual checkpoints
- `/contact` は hero 左説明 + 右キャラクター + 右フォームの3要素が破綻していない
- headset icon と thumbs-up character が不自然なく収まっている
- `/about` の CTA が視覚的にそのままでリンク先だけ正しく切り替わっている
- `/#how-to` に飛んだとき、保存した求人セクションが viewport 内に見える

## Validation commands
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- visual pass on `/contact`, `/about`, `/#how-to`
