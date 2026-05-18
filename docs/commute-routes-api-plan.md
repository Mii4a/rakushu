# Google Maps Routes API plan

`らくしゅう` の通勤時間自動取得は `Google Maps Platform Routes API` を前提に進める。

## Purpose

- ユーザーの通勤プロフィールにある自宅住所または最寄り駅から、求人の勤務地住所または最寄り駅までの通勤時間を取得する
- 求人詳細と比較ページで、ランク情報に加えて通勤しやすさを判断できるようにする

## Required env

- `GOOGLE_MAPS_SERVER_API_KEY`
- 将来の地図表示用として `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY`

## Planned flow

1. `user_commute_profiles` の自宅住所 / 自宅最寄り駅を起点にする
2. `jobs.work_address` と `jobs.nearest_station` を到着側候補にする
3. Routes API から所要時間を取得する
4. 正常取得できた値を `jobs.commute_minutes` に保存する
5. 比較ページで通勤時間を横並び表示する

## Key separation

- 開発/本番でキーを分ける
- server/browser でキーを分ける
- Routes API は browser key では呼ばない

## Product gating draft

- `Starter`: 通勤情報の手入力保存
- `Plus`: Routes API による通勤時間自動取得
- `Pro`: 比較ページで複数求人の通勤比較

## Current implementation notes

- API 呼び出しは `ComputeRouteMatrix` を使う
- 入力は「住所優先」ではなく「最寄り駅優先」で `TRANSIT` を評価する
- `TRANSIT` で `ROUTE_NOT_FOUND` の場合は、UI に「最寄り駅を見直してください」を返す

## Confirmed behavior as of 2026-05-16

- 同じ API key で `DRIVE` と `WALK` は正常に route が返る
- `TRANSIT` は `荻窪駅 -> 渋谷駅` の最小ケースでも `ROUTE_NOT_FOUND` を返した
- そのため、現在のボトルネックは env 未設定ではなく、Google 側の transit route 可用性または project/API 設定の確認にある

## Next checks in GCP

1. 対象 project で `Routes API` が有効になっているか確認する
2. 対象 key の `API restrictions` に `Routes API` が含まれているか確認する
3. Billing が有効で、Maps Platform project と紐付いているか確認する
4. Cloud Console の Metrics / Logs で `computeRouteMatrix` の `TRANSIT` リクエスト結果を確認する
5. 必要なら Google の Capabilities Explorer で同じ origin/destination を `TRANSIT` で再現し、project 固有か request 条件固有かを切り分ける
