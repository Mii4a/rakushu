# Task

らくしゅうの repo-side CI を実用レベルまで一段進め、変更を安全に push できる状態にする。

今回の目的:
- すでに追加した最小 CI を、lint まで含む形に拡張する
- `next lint` の対話的セットアップ依存を外し、ESLint flat config へ移行する
- 今回の CI + ESLint 変更だけを意図的に commit / push する

今回このターンでやること:
- ESLint flat config を追加する
- `npm run lint` を CI で使える非対話コマンドへ置き換える
- GitHub Actions workflow に lint を追加する
- lint / typecheck / test / build をローカルで再検証する
- 今回の関連変更だけを stage / commit / push する

今回の判断方針:
- Cloudflare deploy や本番 DB 操作は引き続き CI に入れない
- 既存 repo の unrelated な変更は巻き込まず、今回の変更ファイルだけを commit する
- flat config は Next.js / TypeScript に素直に乗る最小構成を採る

完了条件:
- `eslint.config.mjs` が追加される
- `npm run lint` が非対話で成功する
- `.github/workflows/ci.yml` に lint が追加される
- lint / typecheck / test / build がローカルで通る
- 今回の変更だけが commit / push される
