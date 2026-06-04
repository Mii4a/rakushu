# walkthrough

## Manual review target
- URL: `/dashboard`
- Reference: `/home/openclaw/rakushu/UI-mock/dashboard/dashboard-pc.png`

## What changed
- topbar 下に「今日のガイド」パネルを追加
- KPI / chart / cards に段階的 reveal animation を追加
- hover / focus の micro interaction を追加
- ToDo にローカル完了状態と進行バーを追加
- `prefers-reduced-motion` に対応

## UX checkpoints
- 最初に見るべき行動が最上段で分かる
- summary 情報が右往左往せず読める
- hover が派手すぎず「触れる要素」を伝えるだけに留まっている
- ToDo をチェックしたとき、進捗変化が即分かる
- chart / progress / skill bar の animation が読み取りを妨げない

## Frontend notes
- UX は「機能を増やすこと」より「次に何をすればいいかを迷わせないこと」が効く
- animation は主役ではなく、状態変化を伝える補助。0.5〜0.8 秒くらいの短い micro animation が扱いやすい
- hover / focus はマウスだけでなくキーボード操作でも分かるよう、focus-visible を入れると安全
- `prefers-reduced-motion` を入れると、動きに弱い人にも優しい UI になる

## Validation commands
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Rollback
- backup directory: `/home/openclaw/rakushu/.hermes/rollback/dashboard-ux-20260604-205459`
- restore command: `bash /home/openclaw/rakushu/.hermes/rollback/dashboard-ux-20260604-205459/restore.sh`
