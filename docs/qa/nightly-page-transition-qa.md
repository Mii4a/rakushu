# Nightly page-transition QA

## Goal
毎晩、実在するページ遷移 A → B の全ペアを browser QA で検証する。

ここでいう「全ペア」は数学的な全ページ組み合わせではなく、UI 上に存在する導線だけを対象にする。

## Why this scope
- 全ページ × 全ページだと無意味な組み合わせが増える
- 実在導線ベースなら、壊れた導線をそのまま検出できる
- 失敗時に `from / action / to` の単位で原因を追える

## Route inventory from source

### Public routes
- `/`
- `/beta`
- `/login`
- `/legal/commerce`
- `/legal/privacy`
- `/legal/refund`
- `/legal/terms`

### Authenticated routes
- `/dashboard`
- `/pricing`
- `/criteria`
- `/criteria/[id]`
- `/jobs`
- `/jobs/new`
- `/jobs/[id]`
- `/jobs/[id]/edit`
- `/compare`
- `/resume`
- `/settings`
- `/settings/account`
- `/settings/commute`
- `/internal/parser-feedback`

### Auth redirects / special routes
- `/` redirects to `/dashboard` when authenticated
- `/login` redirects to `/dashboard` when authenticated
- `/dashboard` redirects to `/login` when unauthenticated
- `requireUser()`-guarded pages redirect to `/login` when unauthenticated
- `/settings` redirects to `/settings/account`

## Test unit
1ケースは「遷移元ページ + 操作要素 + 遷移先」で持つ。

例:
- `/dashboard` + sidebar:求人一覧 → `/jobs`
- `/criteria` + CTA:この基準でランク付け → `/jobs/new`
- `/jobs` + row-link:詳細を見る → `/jobs/[id]`

同じ遷移先でも入口 UI が違うなら別ケースとして持つ。

## Assertions per edge
各 edge で最低限見るもの:
- クリック前ページが表示できる
- 対象導線が見つかる
- クリック後に想定ページへ到達する
- 404 / 500 が出ていない
- 主要見出しまたは page marker が表示される
- console error がない
- 無限ローディングしていない

## Exclusions
- destructive action を伴う導線
- 外部決済へ進む checkout 完了導線
- 削除、ログアウト、保存変更のような状態破壊操作
- internal admin 導線で、nightly 用の専用検証アカウントに表示されないもの

## Edge manifest schema
`docs/qa/nightly-page-transition-edges.json` で管理する。

```json
{
  "baseUrlEnv": "RAKUSHU_QA_BASE_URL",
  "authState": {
    "mode": "google-session-cookie",
    "required": true
  },
  "edges": [
    {
      "id": "dashboard-to-jobs-sidebar",
      "from": "/dashboard",
      "to": "/jobs",
      "auth": "required",
      "action": {
        "kind": "click-text",
        "target": "求人一覧"
      },
      "assert": {
        "urlIncludes": "/jobs",
        "pageText": ["求人一覧", "保存した求人"]
      }
    }
  ]
}
```

## Current recommended coverage split
### Public smoke
- `/` → `/login`
- `/` → `/criteria`
- `/` → legal pages
- `/beta` → `/pricing`

### Authenticated navigation core
- `/dashboard` → `/jobs`
- `/dashboard` → `/criteria`
- `/dashboard` → `/pricing`
- `/jobs` → `/jobs/new`
- `/jobs` → `/jobs/[id]`
- `/jobs/[id]` → `/jobs/[id]/edit`
- `/criteria` → `/jobs/new`
- `/compare` → `/jobs`
- `/compare` → `/jobs/new`
- `/settings/account` ↔ `/settings/commute`

### Redirect checks
- unauthenticated `/dashboard` → `/login`
- authenticated `/login` → `/dashboard`
- authenticated `/` → `/dashboard`
- authenticated `/settings` → `/settings/account`

## Data dependencies
Dynamic edges (`/jobs/[id]`, `/criteria/[id]`) は nightly 実行前に fixture データが必要。

Nightly では `node --env-file=.env.production scripts/prepare-nightly-qa-auth.mjs` を先に実行し、以下をまとめて確認する:
- Better Auth の signed session cookie を生成できるか
- QA 対象ユーザーを決定できるか
- jobs / criteria など最低限の fixture 件数が足りるか

最低限:
- テスト用ユーザー 1人
- そのユーザーに紐づく求人 1件以上
- 可能なら criteria 1件以上

`RAKUSHU_QA_USER_EMAIL` が未設定でも、DB 上の user が1件だけなら helper script がその1件を自動採用する。
複数ユーザーになった時点で env 明示に切り替える。

Nightly job は edge 実行前に「テストデータが足りない edge」を skip ではなく `blocked` として報告する。

## Auth/session strategy
- Google OAuth は nightly cron で踏まない
- 代わりに helper script が session table に短命の QA session を作る
- browser には signed cookie を `document.cookie` で注入して authenticated edge を開く
- cookie が受理されず `/login` に戻る場合は `blocked: auth-cookie-rejected`

## Failure report shape
失敗時は以下を返す:
- edge id
- from
- action
- expected to
- actual url
- page marker mismatch
- console errors
- screenshot path or summary
- blocked reason if data missing

## Execution strategy in Hermes
- route inventory / edge manifest は repo で固定管理
- cron は fresh session で動くので prompt は自己完結にする
- browser QA は manifest を上から順に回す
- 成功ケースは集計だけ、失敗ケースは詳細を書く

## Definition of done
- 実在導線の edge manifest が repo にある
- public / authenticated / redirect edge が分類されている
- dynamic edge の前提データ要件が明文化されている
- cron に載せる self-contained prompt がある
