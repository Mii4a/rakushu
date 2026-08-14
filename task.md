# task

トップページ `/` のデモ入力からログインCTAモーダルを経由し、ログイン完了後の本機能ページへ入力値を引き継げるようにする。

対象:
- `src/components/top-landing-page.tsx`
- `src/components/google-login-button.tsx`
- `src/components/job-create-form.tsx`
- `src/components/company-research/company-research-mock-experience.tsx`
- `tests/playwright/top-login-modal.spec.ts`
- 必要に応じて `src/lib/...` に一時保存ヘルパーを追加

完了条件:
- トップページの求人チェッカーデモで入力した求人票テキストを保持したまま、ログイン開始時の callbackURL が `/jobs/new?restoreDemo=1` を指す。
- ログイン後に `/jobs/new?restoreDemo=1` を開くと、求人本文入力欄にデモ入力値が復元される。
- トップページの企業研究デモで入力した企業URLを保持したまま、ログイン開始時の callbackURL が `/company-research?restoreDemo=1` を指す。
- ログイン後に `/company-research?restoreDemo=1` を開くと、企業研究ページが新規入力モードになり、企業URL入力欄にデモ入力値が復元される。
- 復元後は一時保存値を削除し、再訪問時に勝手に再復元されない。
- URLに求人本文・企業URL本体を載せない。
- 既存の通常ログイン導線、ログインモーダルの表示/閉じる挙動、ログイン済みユーザーの redirect を壊さない。
- `npm run typecheck` / `npm run lint` / focused Playwright を通す。
