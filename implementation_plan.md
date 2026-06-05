# implementation plan

1. 再利用できる mock / assets / 既存 route を確認する
   - `UI-mock/about/icons/headphone.png`
   - `UI-mock/beta/character/rakumo-thumbs-up.png`
   - `/about`, `/beta`, `/`, `mock-site-chrome.tsx`, `beta-intake-form.tsx` を参照する

2. 導線差分を分解する
   - `/about` support CTA のリンク先
   - `/about` secondary CTA の anchor 着地点
   - home nav の hash link 表現の揃え方

3. docs を同期する
   - `task.md`, `implementation_plan.md`, `walkthrough.md` を contact/anchor 仕上げ内容へ更新

4. 実装する
   - `src/app/contact/page.tsx` を追加
   - `BetaIntakeForm` を再利用しつつ、contact 用 hero / 理由 cards / reassurance cards を足す
   - `/about` の CTA を `/contact` に切り替える
   - `/about` と home nav の `使い方` 導線を `/#how-to` に揃える

5. 検証する
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
   - browser で `/contact`, `/about`, `/#how-to` を確認
   - link miswire や console error がないことを確認する
