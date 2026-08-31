# Walkthrough

## 実施内容

- `/dashboard` の画面実装を外し、`/jobs/new`（求人チェッカー）へ 307 リダイレクトするようにした。
- 共通サイドバーの通常版・モック版から「ダッシュボード」リンクを削除した。
- 旧ヘッダーナビゲーションの「ホーム」リンクも削除した。
- ログインモーダルと Google ログインボタンの既定 callback URL を `/jobs/new` に変更した。
- ログイン済みで `/` または `/login` を開いた場合の遷移先を `/jobs/new` に変更した。
- オンボーディング完了済みユーザー、およびオンボーディング終了・スキップ時の遷移先を `/jobs/new` に変更した。
- ログイン済みユーザーがヘッダーロゴを押した場合も `/jobs/new` へ移動するようにした。

## TDD

変更前に Playwright テストを追加・更新し、次の失敗を確認した。

- 通常ログインの callback URL
  - 期待: `http://localhost:3100/jobs/new`
  - 実際: `http://localhost:3100/onboarding`
- `/dashboard` の遷移先
  - 期待: `/jobs/new`
  - 実際: `/dashboard`

実装後、同じテストが通ることを確認した。

## 検証結果

- `npm run typecheck`
  - 成功
- `npm test`
  - 52 test files / 507 tests passed
- `npm run lint`
  - 成功（0 errors）
  - 既存の未使用変数・`<img>` に関する warning が 11 件残存
- `npm run build`
  - 成功
  - `/dashboard` は 179 B のリダイレクト専用ルートとして生成
- `npx playwright test -c playwright.top-local.config.ts`
  - 5 tests passed
  - 通常ログインの callback URL が `/jobs/new` であることを確認
  - 求人チェッカー／企業研究の入力引き継ぎ導線も継続して成功
- `npm run test:local-jobs-smoke`
  - 9 tests passed
  - `/dashboard` が 307 で `/jobs/new` へ遷移することを確認
  - 求人チェッカー画面で「ダッシュボード」リンクが表示されないことを確認
  - `/criteria` の共通サイドバーでも「ダッシュボード」リンクが表示されないことを確認

## 変更対象外として維持したもの

- トップページの求人チェッカー入力引き継ぎは `/jobs/new?restoreDemo=1` のまま維持。
- トップページの企業研究入力引き継ぎは `/company-research?restoreDemo=1` のまま維持。
- `scripts/criteria-playwright-check.mjs` と `src/components/criteria/criteria-threshold-editor.tsx` には作業開始前から別変更があり、今回の作業では触れていない。
