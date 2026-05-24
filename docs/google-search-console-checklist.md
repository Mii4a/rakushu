# Google Search Console 登録チェックリスト

らくしゅうの本番公開 URL `https://rakushu.mii4a.workers.dev` を Search Console に登録し、sitemap 送信まで進めるための最短手順。

## 0. 前提
- `NEXT_PUBLIC_APP_URL=https://rakushu.mii4a.workers.dev` になっている
- `/robots.txt` と `/sitemap.xml` が本番で返る
- 今回は独自ドメインではなく `workers.dev` の URL prefix property で進める

確認 URL:
- `https://rakushu.mii4a.workers.dev/robots.txt`
- `https://rakushu.mii4a.workers.dev/sitemap.xml`

## 1. 事前確認
ブラウザで次を開いて確認する。

- [ ] `/robots.txt` が 200 で開く
- [ ] `/sitemap.xml` が 200 で開く
- [ ] LP (`/`) のソースか Elements で canonical が入っている
- [ ] `NEXT_PUBLIC_APP_URL` が本番URLのままズレていない

## 2. Search Console に property を追加
1. Google Search Console を開く
2. `プロパティを追加`
3. `URL プレフィックス` を選ぶ
4. 次を入力する

```text
https://rakushu.mii4a.workers.dev
```

注意:
- `http` ではなく `https`
- 末尾 `/` は付けない
- 今回は `ドメイン` 方式ではなく `URL プレフィックス` 方式

## 3. HTML タグの verification code を取得
1. 確認方法で `HTML タグ` を選ぶ
2. 表示される meta tag から `content` の値だけをコピーする

例:
```html
<meta name="google-site-verification" content="abc123example" />
```

この場合に使う値はこれだけ。

```text
abc123example
```

## 4. `.env.production` に設定する
ローカルの `.env.production` に追記または更新する。

```bash
GOOGLE_SEARCH_CONSOLE_SITE_VERIFICATION=abc123example
```

旧名 `GOOGLE_SITE_VERIFICATION` でも互換動作するが、今後は上の名前を優先で使う。

注意:
- meta tag 全体は入れない
- `content` の値だけ入れる
- 空白や引用符の混入に注意する

## 5. 再デプロイ
反映に必要なコマンド:

```bash
npm run deploy
```

必要ならデプロイ前に確認:

```bash
npm test
npm run build
```

## 6. 反映確認
デプロイ後に本番で確認する。

- [ ] `view-source:https://rakushu.mii4a.workers.dev/` で `google-site-verification` が見える
- [ ] Search Console の確認画面で `確認` を押して成功する

うまくいかないとき:
- deploy 前の古いページを見ていないか
- `GOOGLE_SEARCH_CONSOLE_SITE_VERIFICATION` に meta tag 全体を入れていないか
- `NEXT_PUBLIC_APP_URL` と実際の公開URLがズレていないか
- Cloudflare の反映待ちが少し残っていないか

## 7. sitemap を送信
Search Console の左メニューから `サイトマップ` を開き、次を送信する。

```text
sitemap.xml
```

またはフル URL:

```text
https://rakushu.mii4a.workers.dev/sitemap.xml
```

確認項目:
- [ ] 送信が成功する
- [ ] `取得できませんでした` にならない
- [ ] `送信された URL` の件数が後で反映される

## 8. 登録後に見ておくこと
初回登録後すぐ全部は出ないので、数日単位で見る。

- [ ] インデックス登録 > ページ
- [ ] サイトマップの取得状況
- [ ] ページのクロール状況
- [ ] 手動による対策の有無

## 9. 今回は後回しでいいもの
- 独自ドメイン化
- Domain property
- OGP 画像の本格整備
- 構造化データ追加

## 10. 独自ドメイン化するときの引き継ぎメモ
後で独自ドメインに移すときは次をまとめて見直す。

- `NEXT_PUBLIC_APP_URL`
- `BETTER_AUTH_URL`
- Google OAuth redirect URI
- Stripe webhook endpoint
- Search Console property
- sitemap 再送信

## 最短チェック
急ぐならこの 5 個だけでいい。

- [ ] `https://rakushu.mii4a.workers.dev/robots.txt` が開く
- [ ] `https://rakushu.mii4a.workers.dev/sitemap.xml` が開く
- [ ] Search Console に URL prefix property を追加
- [ ] `GOOGLE_SEARCH_CONSOLE_SITE_VERIFICATION` を入れて deploy
- [ ] Search Console に `sitemap.xml` を送信
