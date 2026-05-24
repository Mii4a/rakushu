# らくしゅう: agent 分割してよいタスク / 分割禁止タスク運用表

## 目的

この文書は、らくしゅう開発で複数エージェントを使うときに、
- 何を分割してよいか
- 何を分割すると逆に遅くなるか
- どこを単独 ownership にすべきか
を判断するための実務メモです。

結論だけ先に書くと、multi-agent は常に速いわけではありません。
「責務が独立している変更」だけを分割し、「同じ変更線上にある仕事」はまとめて持たせた方が速いです。

---

## 最重要ルール

### Rule 1: 同じファイルを触るなら分けない
特に次は危険です。
- `src/lib/db/schema.ts`
- `drizzle/*.sql`
- `src/actions/job-actions.ts`
- `src/app/jobs/**/*`
- `src/app/criteria/page.tsx`
- `src/app/api/stripe/**/*`
- `src/lib/subscription.ts`
- `src/lib/auth/**/*`

### Rule 2: schema / auth / stripe は owner を1人に固定する
この3系統は副作用が強く、部分最適の変更が全体破壊になりやすい。
並列でやるより、1 agent がまとまって責任を持つ方が速い。

### Rule 3: UI と core が疎結合なら分けてよい
例:
- UI 表示改善
- compare 画面の見せ方改善
- dashboard の並び替え
- docs 更新

これらは並列化しやすい。

### Rule 4: 「別々にマージしても壊れないか」で判断する
この問いに即答できないなら、分割しない。

---

## 分類

### A. 分割してよい
条件:
- 触るファイル集合がほぼ重ならない
- 片方の変更がもう片方の型や payload を壊さない
- 先にマージしても後からマージしても大きな競合が起きにくい

### B. 条件付きで分割してよい
条件:
- 依存関係はあるが、task の順序を固定すれば進められる
- 親 agent がインターフェースを先に固定できる
- 片方が owner、もう片方が追従担当になる

### C. 分割禁止 / 単独 ownership 推奨
条件:
- schema、auth、stripe のように副作用が大きい
- 同一ページや同一 action を複数 agent が触る
- 仕様変更と実装変更が密結合している

---

## らくしゅう専用の判断表

| 作業タイプ | 分割可否 | 推奨形 | 理由 |
|---|---|---|---|
| `src/lib/analysis/*` の解析改善 | 条件付きで可 | Analysis owner 1人 + UI追従 1人 | 解析本体は1人の方が安全。表示調整だけ別にしやすい |
| compare / dashboard / settings の表示改善 | 可 | UI agent 単独、または docs と並列 | UI だけで閉じやすい |
| criteria 文言や見せ方調整 | 可 | UI agent 単独 | payload や schema を変えないなら安全 |
| README / docs / runbook 更新 | 可 | Docs agent を別にしてよい | 本体コードと競合しにくい |
| 通知機能の UI 追加 | 条件付きで可 | Platform owner + UI follower | 通知データ契約を先に固定すれば分けられる |
| resume / commute の表示改善 | 可 | UI agent 単独 | 独立しやすい |
| `src/actions/*` の payload 変更 | 原則禁止 | owner 1人 | page / form / schema と密結合しやすい |
| `src/lib/db/schema.ts` 変更 | 禁止 | DB owner 1人 | migration とセットになる |
| `drizzle/*.sql` 追加/修正 | 禁止 | DB owner 1人 | 並列で事故りやすい |
| Better Auth 調整 | 禁止 | Auth owner 1人 | セッションと保護ページに波及する |
| Stripe checkout / webhook / subscription | 禁止 | Billing owner 1人 | 依存が深く、確認コストも大きい |
| 同一 page.tsx を複数人で編集 | 禁止 | page owner 1人 | 競合のわりに得が薄い |
| deploy / wrangler / production secret 整備 | 禁止 | Release owner 1人 | 外部副作用が大きい |

---

## 分割してよい具体例

### 1. 解析強化 + UI追従
分け方:
- Agent A: `src/lib/analysis/*`, `src/lib/criteria/*`, tests
- Agent B: `src/app/compare/page.tsx`, `src/components/jobs/*`

条件:
- A が評価結果の shape を先に固定する
- B はその shape を受けて表示だけ調整する

### 2. 通知ロジック + 通知UI
分け方:
- Agent A: 通知抽出ロジック、action、必要なら API
- Agent B: dashboard / settings の通知表示

条件:
- A が返すデータ構造を先に決める
- B は data contract を変えない

### 3. 機能実装 + docs更新
分け方:
- Agent A: 本体コード
- Agent B: README, docs, runbook

これはかなり安全。

### 4. 別領域の UI 改善を並列で進める
例:
- Agent A: `/resume`
- Agent B: `/settings/account`

ただし shared component を同時に触らないこと。

---

## 分割すると遅くなりやすい具体例

### 1. schema / migration / action を別agentに切る
例:
- Agent A: `schema.ts`
- Agent B: `drizzle/0011_*.sql`
- Agent C: `job-actions.ts`

これは一見分業に見えるが、実際は1本の変更線。
統合地点が多く、遅延しやすい。

### 2. 同じフォームを複数agentで触る
例:
- Agent A: `job-create-form.tsx`
- Agent B: `job-actions.ts`
- Agent C: `jobs/new/page.tsx`

境界が薄く、payload ズレが起きやすい。
1 owner で持つ方が速い。

### 3. Stripe を checkout / webhook / subscription に分解する
一見責務分離に見えるが、同じ課金フローの上下流なので確認コストが膨らむ。
課金系は 1 owner にまとめる。

### 4. auth / session / protected page を別々にする
これも遅い。
認証は「ログインできる」「保護ページで弾ける」「session が読める」が全部繋がっている。

---

## 推奨 agent 構成

### 最小構成
1. Lead / Orchestrator
2. Implementation owner
3. QA / Review

小〜中規模の変更はこれで十分。

### 標準構成
1. Lead / Orchestrator
2. Analysis agent
3. UI agent
4. Platform agent
5. QA / Review agent

ただし常時5人で回す必要はない。
必要な役割だけ起動する。

### らくしゅう向けの ownership 原則
- DB owner: `schema.ts`, `drizzle/*`
- Auth owner: `src/lib/auth/*`, `src/app/api/auth/*`
- Billing owner: `src/lib/subscription*`, `src/app/api/stripe/*`
- Analysis owner: `src/lib/analysis/*`
- UI owner: `src/app/*`, `src/components/*`

---

## 実運用ルール

### ルール 1: 同時実装 agent は 2〜3 まで
それ以上は coordination cost の方が勝ちやすい。

### ルール 2: dispatch 前に依存グラフを書く
最低限これを書く。
- どの file / directory を触るか
- 誰が owner か
- どの task が先か
- merge 順はどうするか

### ルール 3: interface を先に固定する
並列化したいなら先に次を固定する。
- form payload
- action の引数
- return shape
- DB column 名

ここが未確定だと、並列化はほぼ失敗する。

### ルール 4: schema 変更は最初にやる
UI から先に作ると後で壊れやすい。
DB を触る task は最初に確定させる。

### ルール 5: 各 task の完了条件を明文化する
例:
- `npm test` が通る
- `npx tsc --noEmit` が通る
- 対象画面で新項目が表示される
- 既存 flow が壊れていない

### ルール 6: 最後に QA gate を置く
実装 agent の self-review だけで閉じない。
最低でも次を確認する。
- diff の衝突箇所
- 型チェック
- テスト
- スコープ逸脱の有無

### ルール 7: 親 agent は判断、subagent は材料集めを担う
親 agent に残す:
- 設計判断
- 実装方針の採択
- root cause analysis
- 複数案比較
- 大きめのリファクタ方針決め
- docs / issue / plan の作成

subagent に投げる:
- 関連箇所の洗い出し
- ログ要約
- 差分読み
- 小さめの実装
- テスト追加の叩き台

補足:
- subagent の出力はそのまま採用せず、親 agent が再編集して task / plan / docs に反映する
- 同じファイル群をまたぐ依存の強い変更は、分割せず owner 1人で持つ
- subagent へ渡すときは、期待する出力形式（箇条書き / 差分候補 / テスト候補）を明示する

---

## まず守るべき最小ルール

迷ったらこれだけ守る。

1. 同じファイルを複数 agent に触らせない
2. schema / auth / stripe は owner 1人
3. 並列にするのは UI と docs か、UI と analysis 表示追従まで
4. 同時実装 agent は 2〜3 まで
5. 「別々にマージしても壊れないか」に答えられないなら分けない

---

## おすすめの判断フロー

1. 変更対象ファイルを列挙する
2. 副作用が強い領域があるか確認する
3. data contract を先に固定できるか確認する
4. 別マージしても壊れないか確認する
5. YES なら分割、NO なら owner 1人に寄せる

---

## まとめ

らくしゅう開発では、multi-agent の価値は「人手を増やすこと」ではなく、
- 独立した責務を並列で進めること
- 危険領域を owner 制で守ること
にあります。

速くしたいなら、agent 数を増やすより先に、
「どこを分けてはいけないか」を先に決める方が効きます。
