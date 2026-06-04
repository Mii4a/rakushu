# implementation plan

1. 現状確認
   - `/dashboard` の構造と既存 mock 実装を確認
   - モック画像を見て、視線の流れと情報の強弱を整理
   - 変更前ファイルを backup ディレクトリへ退避してロールバック可能にする

2. UX 改善
   - topbar 直下に「今日のガイド」パネルを追加し、次アクションを最上段で提示
   - plan / analysis 使用量 / ToDo 進捗を小さな要約カードで見せ、判断コストを下げる
   - ToDo をローカル state でチェック可能にして、完了率バーを連動させる

3. Animation / interaction 改善
   - セクションの段階的 reveal animation を追加
   - KPI / surface card / recommendation card / ToDo row に hover / focus の micro interaction を追加
   - progress ring / progress bar / skill bar / chart line を控えめにアニメーションさせる
   - `prefers-reduced-motion` ではアニメーションを止める

4. 検証
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
   - 可能ならローカルで `/dashboard` を開き、console error と UI 崩れを確認

5. ロールバック手順
   - backup から対象ファイルを戻す
   - 推奨: `bash /home/openclaw/rakushu/.hermes/rollback/dashboard-ux-20260604-205459/restore.sh`
   - 必要なら restore.sh の中身を見て個別コピーでも戻せる
