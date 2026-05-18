# GTFS commute MVP plan

`らくしゅう` の日本向け通勤時間機能は、当面 `Google Maps Routes API` を本命にせず、`GTFS/GTFS-JP + OpenStreetMap` を使う無料寄りの MVP として再設計する。

## Why this route

- `Google Maps Routes API` は同一 project / key でも海外の `TRANSIT` は返る一方、日本の主要駅区間では `ROUTE_NOT_FOUND` だった
- `GTFS` は無料の公開仕様で、静的 feed の自動取得もしやすい
- `GTFS-JP` は国土交通省が普及を進めている国内標準で、時刻表・停留所・運賃などの共有基盤として扱える
- `ODPT` と `GTFSデータリポジトリ` を組み合わせれば、無料で始められる可能性が高い

## Primary sources

- GTFS 仕様: https://gtfs.org/ja/documentation/overview/
- GTFS schedule reference: https://gtfs.org/ja/documentation/schedule/reference/
- 国土交通省 GTFS-JP: https://www.mlit.go.jp/sogoseisaku/transport/sosei_transport_tk_000067.html
- GTFS.JP: https://www.gtfs.jp/index.html
- GTFSデータリポジトリ API: https://docs.gtfs-data.jp/api.v2.html
- ODPT overview: https://www.odpt.org/en/overview/

## Scope for MVP

- 対象地域は `無料で継続取得しやすい feed がある地域` から順に広げる
- 最初は `首都圏 fixture / feed` で実装を固めつつ、設計自体は全国拡張前提にする
- 対象事業者は、まず `無料で継続取得しやすい feed` を優先する
- 最初からリアルタイム遅延反映はやらない
- 最初は `平日朝の参考通勤時間` に限定する

## Product behavior

### MVP outcome

- ユーザーの `自宅最寄り駅` と求人の `勤務地最寄り駅` から、参考通勤時間レンジを出す
- `jobs.commute_minutes_min`, `jobs.commute_minutes_max`, `jobs.commute_minutes_typical`, `jobs.commute_data_kind` に保存する
- UI では `実データ` と `推定値` を分けて表示する

### Non-goals

- 住所からドアツードア完全自動の全国経路検索
- リアルタイム遅延込みの最適経路
- 私鉄 / JR / 地方交通すべてを初回からカバー

## Data sources

### 1. GTFS / GTFS-JP static feeds

用途:
- `stops.txt`: 駅・停留所
- `routes.txt`: 路線
- `trips.txt`: 便
- `stop_times.txt`: 停車時刻
- `calendar.txt` / `calendar_dates.txt`: 運行日
- `transfers.txt`: 乗換補助

優先取得元:
- `GTFSデータリポジトリ`
- `ODPT catalog / developers site`
- 事業者公式の GTFS 配布 URL

### 2. OpenStreetMap

用途:
- 駅まで / 駅からの徒歩距離の概算
- 駅名ゆれだけでは解決しない位置補助

### 3. 国土数値情報

用途:
- 補助的な駅 / 路線位置の照合

注意:
- 国土数値情報だけでは時刻表が無いので、通勤時間本体の計算には使わない

## Suggested MVP architecture

### Phase 1: station-to-station only

最初は住所を使わず、以下だけを対象にする。

- `user_commute_profiles.home_nearest_station`
- `jobs.nearest_station`

処理:
1. 駅名から GTFS stop を引く
2. 平日朝の出発時刻を固定する
3. GTFS feed から `直通または 1 回乗換まで` の参考所要時間レンジを計算する
4. `jobs` の通勤レンジ列に保存する

これなら住所ジオコーディング問題を先送りできる。

補足:
- `calendar.txt` の平日運行に加えて `calendar_dates.txt` の例外日を保持し、必要なら `targetDate` 指定で祝日・臨時運休を反映できるようにする

### Phase 2: address assist

次に以下を追加する。

- `home_address` から最寄り駅候補を補助
- `work_address` から最寄り駅候補を補助

ただし、この段階でも最終計算の主軸は駅 to 駅に置く。

## Suggested implementation units in rakushu

### Keep existing tables

既存の以下はそのまま使う。

- `user_commute_profiles.home_address`
- `user_commute_profiles.home_nearest_station`
- `jobs.work_address`
- `jobs.nearest_station`
- `jobs.commute_minutes`
- `jobs.commute_minutes_min`
- `jobs.commute_minutes_max`
- `jobs.commute_minutes_typical`
- `jobs.commute_data_kind`

### New tables for MVP

1. `transit_feeds`
- `id`
- `provider_name`
- `source_url`
- `license_note`
- `region`
- `fetched_at`
- `valid_from`
- `valid_to`

2. `transit_stops`
- `id`
- `feed_id`
- `stop_id`
- `stop_name`
- `stop_lat`
- `stop_lon`
- `parent_station`
- `platform_code`

3. `transit_trips`
- `id`
- `feed_id`
- `trip_id`
- `route_id`
- `service_id`

4. `transit_stop_times`
- `id`
- `feed_id`
- `trip_id`
- `stop_id`
- `arrival_time`
- `departure_time`
- `stop_sequence`

5. `transit_station_aliases`
- `id`
- `normalized_name`
- `canonical_stop_id`
- `canonical_stop_name`

最初は SQLite/Turso に全量を正規化してもいいが、feed 規模次第では `stop_times` は簡易 index だけ持ってローカル加工に寄せる。

## Routing strategy

### Option A: self-implemented minimal search

最初の MVP は、重いルーティングエンジンを入れずに以下で始める。

1. `origin stop` と `destination stop` を決める
2. 対象日の `stop_times` から、朝 7:00-10:00 の候補便を読む
3. 直通または 1 回乗換までを優先探索する
4. 極端に長い乗換待ちを外したうえで、`最短-最長-代表値` を返す

利点:
- 初期構成が軽い
- Cloudflare / Turso 前提でも進めやすい

欠点:
- 汎用ルータではない
- 事業者横断の乗換が増えると複雑になる

### Option B: OpenTripPlanner later

将来、対象地域と feed 数が増えたら `OpenTripPlanner` を検討する。

利点:
- GTFS + OSM で公共交通ルーティングを扱える

欠点:
- インフラが重い
- 現在の `rakushu` 構成にはやや大きい

結論:
- MVP は `Option A`
- 広域化したら `Option B`

## Service filtering rules

`らくしゅう` の通勤時間は、就活判断に使う `日常的な通勤` を想定する。
そのため、`特急` や `新幹線` を前提にした経路は既定で除外する。

### Default exclude

以下を含む便は、既定で通勤候補から外す。

- `新幹線`
- `Shinkansen`
- `特急`
- `LIMITED EXPRESS`
- `LTD. EXP.`
- `ライナー`
- `liner`

判定対象:

- `routes.route_short_name`
- `routes.route_long_name`
- `routes.route_desc`
- `trips.trip_short_name`
- `trips.trip_headsign`
- `stop_times.stop_headsign`

初期実装の設定ファイル:

- `src/lib/commute/service-filters.ts`

### Default allow

以下は、通勤候補として残す初期方針にする。

- `普通`
- `各駅停車`
- `快速`
- `区間快速`
- `急行`
- `準急`
- `通勤快速`
- `通勤急行`

理由:
- 首都圏や大都市圏では `快速` や `急行` も日常通勤で一般的
- 逆にこれらまで外すと、参考通勤時間が不自然に長くなりやすい

### Ambiguous services

以下は事業者ごとの補助ルールで扱う。

- `快特`
- `特別快速`
- `新快速`
- `空港快特`
- `通勤特急`

方針:
- 初期実装では `commute express allowlist / denylist` を feed 単位または事業者単位で持つ
- 曖昧な種別は一律ハードコードせず、対象地域での通勤実態に合わせて調整する

### Product implication

- `最短-最長` の参考通勤時間は、除外後の候補便から計算する
- つまり、`特急を使えばもっと短い` 場合でも、表示は `日常通勤として妥当な範囲` を優先する
- 将来的にオプションを付けるなら `特急等を含める` トグルを別機能として扱う

## UI / product rules

### Show data quality explicitly

- `実データ`: GTFS から算出できた
- `推定`: 路線 / 駅情報から概算
- `未対応`: feed 不足で算出不可

### Plan gating draft

- `Starter`: 通勤情報の手入力保存
- `Plus`: 参考通勤時間の計算
- `Pro`: 複数求人の通勤比較

## Fallback rules

以下のときは `commute_minutes` を自動確定しない。

- 最寄り駅が未入力
- 駅名マッチが複数候補で曖昧
- GTFS feed が対象地域を持たない
- 乗換探索ができない

代わりに:
- `未対応`
- `駅名を見直してください`
- `推定のみ`

のどれかを返す。

## Operational notes

- GTFS feed は `毎日` もしくは `有効期限接近時` に更新確認する
- `stop_id`, `route_id`, `agency_id` の継続性は feed 更新時の重要チェック項目
- feed の取得元ごとに利用条件メモを残す

## Recommended next implementation order

1. `MVP 対象事業者` を 1-3 事業者に絞る
2. feed 取得スクリプトを作る
3. `transit_stops` と `station_aliases` だけ先に作る
4. 駅名マッチ API を作る
5. 駅 to 駅の最短所要時間計算を入れる
6. `jobs.commute_minutes` 保存と UI 表示をつなぐ

## Open questions

- 首都圏 MVP の対象を `東京メトロ中心` にするか、`都営` まで含めるか
- JR 系を初回から対象にできる無料 feed が安定して取れるか
- feed を Turso に正規化保存するか、ビルド済み index を別ファイルで持つか
