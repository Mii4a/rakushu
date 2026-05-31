# Server-side application error 修正後チェックリスト

対象:
- 求人一覧
- 保存した求人
- 比較
- 履歴書
- 判断基準
- 料金
- 設定

## Preview / 本番 共通の見るポイント
- 500 / Application error が出ない
- 認証後にページが最後まで描画される
- ページ内の主要カードや一覧が表示される
- 画面遷移後にヘッダー / ナビ / アカウントメニューが崩れない
- ブラウザコンソールに致命的な hydration error が出ない

## ルート別チェック

### 1. 求人一覧 / 保存した求人
- `/jobs` を開く
- 一覧が表示される
- 既存求人がある場合はカード or 詳細が開ける
- 求人詳細の本文関連表示でエラーにならない
- 並び替え / フィルタ変更後も落ちない

### 2. 比較
- `/compare` を開く
- Pro でない場合は制限メッセージが正常表示される
- Pro の場合は比較テーブルが表示される
- 通勤時間 / 年間休日 / 総合ランク周りが描画される

### 3. 履歴書
- `/resume` を開く
- フォーム初期表示で落ちない
- 保存済みプロフィールがある場合も初期値展開で落ちない

### 4. 判断基準
- `/criteria` を開く
- 公開基準一覧が表示される
- 保存済み件数 / 利用数のメトリクスが表示される
- 所有テンプレートがある場合も詳細表示で落ちない

### 5. 料金
- `/pricing` を開く
- プランカードが表示される
- Plus / Pro ユーザーではランク設定フォームが表示される
- Free / Starter では制限付き表示のまま落ちない

### 6. 設定
- `/settings` から `/settings/account` へ遷移できる
- `/settings/account` でアカウント情報が表示される
- 通勤プロフィール有無に関係なく落ちない
- `/settings/commute` でフォーム初期表示ができる

## デプロイ後の確認順
1. ログイン
2. `/pricing`
3. `/criteria`
4. `/jobs`
5. `/compare`
6. `/resume`
7. `/settings/account`
8. `/settings/commute`

## 失敗時に見るログ
- Cloudflare / OpenNext の request log
- 失敗ルートの server stack trace
- 失敗時に `db.query.*` 由来の all-column select が残っていないか

## 今回の修正観点
- `db.query.*.findMany/findFirst` の一部を明示的な `select` へ置換
- 重い列は一覧で読まず、必要時のみ個別取得
- relation 展開が必要な箇所は edge で安全な join / select に寄せる
