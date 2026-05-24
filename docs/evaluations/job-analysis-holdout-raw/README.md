# Job Analysis Holdout Raw Text Store

このディレクトリは holdout 候補の raw pasted text を保管する。

## Directory layout

- `candidate/`: まだ判定前の候補
- `approved/`: holdout 本体に採用済み
- `review/`: duplicate / overlap / shape 判定が保留のもの
- `excluded/`: 除外したが判断根拠として一時保持するもの

## File naming

基本は intake CSV の `candidate_id` と一致させる。

例:
- `candidate/holdout-candidate-001.txt`
- `approved/holdout-candidate-017.txt`
- `review/holdout-candidate-024.txt`

## Handling rules

- raw text を優先し、意味構造を変える整形はしない
- redact は collection rules に従う
- approved に移したら intake CSV の `status` と `raw_text_path` を更新する
- excluded に移した場合も、除外理由を intake CSV か notes に残す

正本ルール: `docs/job-analysis-holdout-collection-rules.md`
