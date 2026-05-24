# Job Analysis Holdout Collection Rules

## Goal

完成判定に使う holdout 求人本文を、後から見てもブレないルールで集める。

この文書の目的は「たくさん集めること」ではなく、parser の完成判定に使える母集団を作ること。

特に次を防ぐ。

- 開発 fixture と実質同じ文面を混ぜる
- 同じ媒体・同じ shape に偏る
- parser に有利な綺麗な文面ばかり集める
- 収集時点で整形しすぎて、本番のコピペ入力とかけ離れる

## What counts as a valid holdout sample

1件の holdout sample は次を満たすものとする。

- 実在する求人本文のコピペである
- raw text が残っている
- parser hardening に直接使った fixture と同一文面ではない
- source shape を判定できる
- 後で scorecard に流せるよう、最小限の収集メタ情報がある

## What to collect

各 sample について最低限集めるもの。

- raw pasted text
- collection date
- collector
- source shape
- source note
  - 例: `en-gage detail`, `en-japan listcard`, `company careers page`, `manual paste from user`
- duplicate check note
- fixture overlap check note
- optional URL or source identifier
  - 公開 URL を残して問題ない場合だけ
  - 残さない場合は媒体名や収集経路メモだけでよい

## Hard exclusion rules

次に当てはまるものは holdout 本体に入れない。

### 1. Existing fixture overlap

- `fixtures/jobs/` にある文面と同一、または実質同一
- 既存 fixture を少しだけ書き換えたもの
- parser 改善のためにすでに読んだ known failure text

### 2. Same-job duplicates

- 同じ求人の rerun
- 媒体違いでも本文が実質同じな repost
- 同一会社・同一職種で本文がほぼ同じな multi-post

### 3. Non-real or synthetic text

- テスト用ダミー文面
- AI 生成の疑似求人
- 人が後から比較しやすいように整形し直した文面

### 4. Over-trimmed text

- 給与や休日だけ抜いた抜粋
- ノイズを削りすぎた要約版
- raw paste ではなく、人手で section を作り直した版

## Allowed light cleanup

holdout では raw text を優先する。ただし次の軽微な整形は許容する。

- 明らかな個人情報や応募先メールアドレスの redact
- 電話番号の redact
- URL の削除または置換
- コピー時に入った連続空行の軽微な整理

ただし、意味構造を変える編集はしない。

やってはいけない例:
- 見出しを足す
- section を並べ替える
- 箇条書きへ直す
- 給与文言を人が読みやすいように書き換える

## Required source-shape mix

holdout 本番 50件以上では、少なくとも次の 5 shape を含める。

- `job_board_detail`
- `job_board_listcard`
- `company_careers`
- `prose_heavy`
- `noisy_promo`

### Shape definitions

#### `job_board_detail`

特徴:
- 媒体の詳細ページ本文
- 見出しやラベルが比較的多い
- 募集要項がある程度まとまっている

例:
- 求人媒体の詳細求人ページ

#### `job_board_listcard`

特徴:
- 一覧カードや短い要約型
- 数行〜短文で給与・休日・雇用形態が圧縮されている
- summary line 依存になりやすい

例:
- 一覧ページ上のカード文面
- 検索結果の短い求人要約

#### `company_careers`

特徴:
- 企業採用ページ由来
- 会社独自の見出し・構造
- 制度説明やカルチャー文が混ざる

例:
- 企業サイトの採用情報ページ

#### `prose_heavy`

特徴:
- スカウト文や紹介文っぽい
- 文章量が多く、ラベル構造が弱い
- 情報が段落に埋まっている

例:
- 「こんな方におすすめ」「未経験から成長」中心の文面

#### `noisy_promo`

特徴:
- 会社説明・訴求・装飾が多い
- 求人情報以外の文が多く混在する
- parser にとってノイズが多い

例:
- 強い販促文、実績紹介、採用メッセージが長い文面

## Target distribution

本番 holdout 50件の推奨配分。

- 各 shape 8〜10件以上
- 同一媒体は全体の 40% を超えない
- 同一会社グループは全体の 20% を超えない
- 同一職種カテゴリばかりに偏らない

最低ライン:
- 5 shape すべてを含む
- どれか1 shape が 5件未満にならない

## Priority order for collection

収集は次の順で優先する。

1. 直近の real-world paste
2. 現在 parser が弱そうな shape の未見パターン
3. 同じ failure type が出そうでも、source shape が違うもの
4. 会社独自採用ページのような媒体外 shape
5. noisy な long-form 文面

## Duplicate screening rule

各 sample を holdout に入れる前に、次を確認する。

### Level 1: same text check

次は duplicate 扱い。
- 冒頭 2〜3行が同一
- 給与・休日・雇用形態・会社名の並びがほぼ同一
- 会社紹介文まで含めて大半が一致

### Level 2: same posting shape check

本文が完全一致でなくても、次なら duplicate 候補として弾く。
- 同一会社・同一職種・同一媒体で、差分が勤務地だけ
- 同一会社・同一職種で、訴求文だけ少し違う repost
- parser failure shape が実質同じで、新しい coverage を生まない

### Rule of thumb

迷ったら次で決める。
- 新しい parser coverage を増やすなら残す
- 既知 failure をもう一回踏むだけなら除外する

## Fixture overlap screening rule

holdout は fixture と切り分ける。

チェック観点:
- `fixtures/jobs/README.md` の anonymization ルールに照らして同一起源でないか
- 既存 fixture の failure shape を再確認する前提で作られた文面でないか
- すでに parser 修正検証に使った有名サンプルでないか

迷った場合:
- fixture 寄りなら holdout ではなく fixture candidate に回す
- holdout に入れるのは「まだ完成判定に使える未知サンプル」だけ

## Collection batch rule

一度に50件集め切ろうとしない。

推奨バッチ:
- まず 10件集める
- shape の偏りを見る
- 足りない shape を補充する
- さらに 10件ずつ追加する
- 30件時点で distribution を見直す
- 50件で確定版を作る

理由:
- 早い段階で偏りに気づける
- 同じ媒体を取りすぎる事故を防げる
- 収集ルール自体の穴を途中で補正できる

## Minimum metadata schema

収集時点では、少なくとも次の列を持つ。

- `candidate_id`
- `collected_date`
- `collector`
- `source_shape`
- `source_note`
- `company_or_hint`
- `duplicate_check`
- `fixture_overlap_check`
- `status`
- `notes`

### Status values

- `candidate`
- `approved_for_holdout`
- `excluded_duplicate`
- `excluded_fixture_overlap`
- `excluded_synthetic`
- `excluded_too_clean`
- `needs_review`

## Approval checklist for a sample

holdout へ昇格させる前に次を全部見る。

- [ ] 実在求人コピペである
- [ ] raw pasted text が残っている
- [ ] 既存 fixture と重なっていない
- [ ] duplicate ではない
- [ ] shape を一意に置ける
- [ ] 本番コピペ入力として十分な長さがある
- [ ] 過度に整形されていない

## Approval checklist for the batch

50件セットを確定する前に次を見る。

- [ ] total 50件以上
- [ ] 5 shape をすべて含む
- [ ] 各 shape 8〜10件以上が理想、最低 5件以上
- [ ] 同一媒体 40%超えなし
- [ ] 同一会社グループ 20%超えなし
- [ ] fixture overlap なし
- [ ] duplicate rerun を除外済み
- [ ] raw text ベースで統一されている

## Output artifacts

収集フェーズが終わったら、最低限次を残す。

- holdout candidate list
- exclude 理由つきの除外メモ
- approved holdout raw text 一式
- 収集バッチ summary

初回テンプレとして次を用意済み。
- `docs/evaluations/job-analysis-holdout-intake-template.csv`
- `docs/evaluations/job-analysis-holdout-intake-notes-template.md`
- `docs/evaluations/job-analysis-holdout-raw/README.md`
- `docs/evaluations/job-analysis-holdout-raw/{candidate,approved,review,excluded}/`

本番バッチでの推奨:
- `docs/evaluations/job-analysis-holdout-intake-YYYY-MM.csv`
- `docs/evaluations/job-analysis-holdout-intake-YYYY-MM-notes.md`
- `docs/evaluations/job-analysis-holdout-raw/`

## Relationship to the review runbook

この文書は「何を holdout に入れてよいか」を決めるためのもの。
採点そのものは `docs/job-analysis-holdout-review-runbook.md` に従う。

順番は次。

1. この文書で holdout を集める
2. approved sample を 50件以上にする
3. scorecard に流す
4. runbook に沿って A/B/C と failure type を採点する

## Notes

- holdout は parser を勝たせるためのデータではなく、完成判定のためのデータ
- 「良さそうなサンプル」ではなく「現実のコピペ入力」を優先する
- 迷った sample は無理に採用せず `needs_review` に落とす
