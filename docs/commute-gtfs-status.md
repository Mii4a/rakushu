# GTFS commute status

最終更新: 2026-05-18

## 現在地

`らくしゅう` の GTFS ベース通勤時間機能は、`最小完了` まで到達済み。

現時点で成立していること:

- `GTFS` static feed を `ディレクトリ` と `.zip` の両方から取り込める
- 同じ `provider + region` の feed は既定で置換再取込できる
- manifest から複数 feed を一括取込できる
- `calendar.txt` と `calendar_dates.txt` を保持できる
- `特急 / 新幹線` を除外できる
- `直通 + 1回乗換` の参考通勤時間レンジを計算できる
- `jobs.commute_minutes_min/max/typical` と `commute_data_kind` に保存できる
- 既存求人に backfill できる
- 求人一覧 / 詳細 / 比較で `参考通勤時間レンジ` を表示できる

## 最小完了の定義

以下を満たしたら `最小完了` とみなす。

1. 通勤レンジ計算の骨格が実装済み
2. feed の import / replace / zip / manifest が使える
3. `jobs` への保存と UI 表示がつながっている
4. fixture または実 feed で end-to-end 確認できている

現在はこの条件を満たしている。

## 主要コマンド

単一 feed 取込:

```bash
cd /home/openclaw/rakushu
./node_modules/.bin/dotenv -e .env.local -- node scripts/import-gtfs-static.mjs \
  --provider "Provider Name" \
  --region "region-code" \
  --file /path/to/feed.zip
```

複数 feed 一括取込:

```bash
cd /home/openclaw/rakushu
npm run db:import:gtfs -- --manifest ./config/gtfs-feeds.example.json
```

既存求人への backfill:

```bash
cd /home/openclaw/rakushu
npm run db:backfill:commute
```

## 次にやる候補

### 実用完了へ進める

- 実際の首都圏 feed を manifest に追加する
- 主要駅で `参考通勤時間レンジ` が返ることを確認する
- `未対応` 地域の見せ方を必要に応じて調整する

### 拡大型へ進める

- 地域ごとの実 feed を増やす
- 駅名ゆれ補正を追加する
- 必要なら `2回以上の乗換` を検討する
- feed 更新運用を決める

## 途中停止しても再開しやすいポイント

- 最初の再開点は `config/gtfs-feeds.example.json` を実 feed 用に複製して埋めること
- 機能実装を再開するなら `docs/commute-gtfs-mvp-plan.md` を先に読む
- 既存データを埋め直すときは `npm run db:backfill:commute`

## 関連ファイル

- 設計: `docs/commute-gtfs-mvp-plan.md`
- 状態メモ: `docs/commute-gtfs-status.md`
- 単一 feed 取込: `scripts/import-gtfs-static.mjs`
- manifest 取込: `scripts/import-gtfs-manifest.mjs`
- backfill: `scripts/backfill-gtfs-commute-ranges.ts`
