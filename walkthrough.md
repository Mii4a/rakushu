# Walkthrough

- 最初に入れた最小 CI は正しかったが、lint だけが `next lint` の対話待ちで gate に載せられていなかった。
- なので今回は『CI 追加の続き』として、lint 経路そのものを直す。
- 方針は `next lint` にしがみつかず、ESLint flat config へ寄せること。これでローカルでも CI でも同じ `eslint .` を実行できる。
- flat config では Next.js / core-web-vitals / TypeScript の推奨セットを素直に読み込み、独自ルールは最小限に留める。
- `.next` や `node_modules` などの生成物は ignore する。
- CI は `lint -> test -> typecheck -> build` に拡張する。
- commit / push は、repo 全体に他の作業差分が大量にあるので、今回の CI / ESLint 関連ファイルだけを明示的に stage する。
- これで『PR / main で lint も含めて落とせる repo-side CI』までは持っていく。
