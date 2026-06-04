# Implementation Plan

1. 現状確認
   - `package.json` の scripts を確認する。
   - 既存 CI workflow と README の現状を確認する。
   - `eslint-config-next` と `eslint` のインストール状況を確認し、flat config 化に足りる依存があるかを確かめる。

2. ESLint flat config 方針を確定する
   - `eslint.config.mjs` を追加する。
   - `FlatCompat` で `next/core-web-vitals` と `next/typescript` を取り込む。
   - `.next` `node_modules` などは ignore に入れる。
   - `npm run lint` は `eslint .` ベースへ置き換える。

3. CI を lint 込みに更新する
   - `.github/workflows/ci.yml` に `npm run lint` を追加する。
   - 既存の `test -> typecheck -> build` は維持する。
   - trigger はそのまま `pull_request` と `main` push を使う。

4. ドキュメント更新
   - `README.md` の CI / CD セクションを更新する。
   - 以前の『lint 未導入』記述を撤回し、現在の gate を `lint / test / typecheck / build` に更新する。

5. 検証
   - `npm run lint`
   - `npm run typecheck`
   - `npm test`
   - `npm run build`
   - workflow ファイルと git diff を再確認する。

6. commit / push
   - 今回の関連ファイルだけを stage する。
   - conventional commit message で commit する。
   - 現在の `main` にそのまま push する。
   - 他の未追跡・未整理ファイルは commit に含めない。
