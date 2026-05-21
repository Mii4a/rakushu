# GTFS feed candidates

最終更新: 2026-05-18

`らくしゅう` の通勤時間 GTFS 機能を `実用完了` へ進めるための、実 feed 候補メモ。

## 優先候補

### 1. 東京メトロ

- provider: `Tokyo Metro`
- region: `kanto-tokyometro`
- dataset: `東京メトロ 鉄道関連情報 / Train information of Tokyo Metro`
- source:
  - dataset: `https://ckan.odpt.org/dataset/train-tokyometro`
  - resource: `https://ckan.odpt.org/ja/dataset/train-tokyometro/resource/d4f11962-1c5a-4316-9a16-7fb229c227ea`
  - file URL: `https://api.odpt.org/api/v4/files/TokyoMetro/data/TokyoMetro-Train-GTFS.zip?acl:consumerKey=YOUR_ACCESS_TOKEN`

### 2. 東京都交通局

- provider: `Toei`
- region: `kanto-toei`
- dataset: `東京都交通局 鉄道関連情報 / Train information of Bureau of Transportation, Tokyo Metropolitan Government`
- source:
  - dataset: `https://ckan.odpt.org/dataset/train-toei`
  - resource: `https://ckan.odpt.org/dataset/train-toei/resource/35b68908-4558-47ae-bfa5-867e58544a1a`
  - token file URL: `https://api.odpt.org/api/v4/files/Toei/data/Toei-Train-GTFS.zip?acl:consumerKey=YOUR_ACCESS_TOKEN`

### 3. 東京臨海高速鉄道

- provider: `TWR Rinkai Line`
- region: `kanto-twr`
- dataset: `東京臨海高速鉄道 鉄道関連情報 / Train information of TWR Rinkai Line`
- source:
  - dataset: `https://ckan.odpt.org/dataset/train-twr`
  - resource: `https://ckan.odpt.org/dataset/train-twr/resource/f1953807-47da-4540-94bd-26c391e5caef`
  - file URL: `https://api.odpt.org/api/v4/files/TWR/data/TWR-Train-GTFS.zip?acl:consumerKey=YOUR_ACCESS_TOKEN`

### 4. 横浜市営地下鉄

- provider: `Yokohama Municipal Subway`
- region: `kanto-yokohama-subway`
- dataset: `横浜市営地下鉄 / Yokohama Municipal Subway`
- source:
  - dataset: `https://ckan.odpt.org/dataset/yokohama_municipal_train`
  - resource: `https://ckan.odpt.org/dataset/yokohama_municipal_train/resource/27ed8a34-c89f-4c5c-98af-5950f04183e2`
  - file URL example: `https://api.odpt.org/api/v4/files/odpt/YokohamaMunicipal/Train.zip?date=20251226&acl:consumerKey=YOUR_ACCESS_TOKEN`

## 方針

- 最初は `東京メトロ + 東京都交通局 + 東京臨海高速鉄道` を優先
- 次に `横浜市営地下鉄` を追加
- さらに広げるなら `つくばエクスプレス`, `多摩都市モノレール` などを追加

## 再開手順

1. `config/gtfs-feeds.kanto.example.json` を複製する
2. `file` に実際にダウンロードした zip の保存先を書く
3. `sourceUrl` は取得元 URL の記録として残す
4. `npm run db:import:gtfs -- --manifest <manifest-path>` を実行する

## メモ

- ODPT 系は `YOUR_ACCESS_TOKEN` の差し替えが必要な feed がある
- 2026-05-18 の確認では `Toei` の旧 public URL は `404 Not Found` だったため、実同期は token URL 前提で扱う
- dataset ページには version 付き resource が並ぶ場合があるので、manifest には `provider` と `region` を固定し、`file` 側を更新する運用でよい
