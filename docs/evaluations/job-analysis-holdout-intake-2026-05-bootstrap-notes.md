# Job Analysis Holdout Intake Notes

## Batch metadata
- intake_window: 2026-05 bootstrap batch
- collector: taro-bot
- collection_scope: local saved jobs only for intake bootstrap; not sufficient for final holdout
- related_rules_doc: `docs/job-analysis-holdout-collection-rules.md`

## Batch progress
- total_candidates_seen: 7
- candidate: 0
- approved_for_holdout: 1
- needs_review: 0
- excluded_duplicate: 0
- excluded_fixture_overlap: 2
- excluded_synthetic: 4
- excluded_too_clean: 0

## Shape distribution snapshot
- job_board_detail: 1
- job_board_listcard: 0
- company_careers: 2
- prose_heavy: 2
- noisy_promo: 0
- other: 2

## Duplicate / overlap notes
- local bootstrap batch contains clear fixture overlap for the Excio detail sample and the SNS/YouTube sample
- local bootstrap batch also contains obvious synthetic/demo records (`Test Company`, `株式会社ボーナスA/D`)
- no true duplicate screening across external source pools has been done yet; this is a local bootstrap only

## Approved candidates this batch
- holdout-bootstrap-001: prose_heavy / 新たなチャレンジは働きやすさ抜群の職場で！ 充実環境のもと、未経験から理想のキャ

## Needs-review candidates
- none

## Excluded candidates and reasons
- holdout-bootstrap-002: excluded_synthetic / Test Company / local test/dummy text, not real pasted job
- holdout-bootstrap-003: excluded_synthetic / Test Company / local test/dummy text, not real pasted job
- holdout-bootstrap-004: excluded_synthetic / 株式会社ボーナスD / appears synthetic/demo-style company naming
- holdout-bootstrap-005: excluded_synthetic / 株式会社ボーナスA / appears synthetic/demo-style company naming
- holdout-bootstrap-006: excluded_fixture_overlap / エクシオ・デジタルソリューションズ株式会社 / matches media-summary-anon fixture shape
- holdout-bootstrap-007: excluded_fixture_overlap / 募集職種 YouTube/TikTok運用 仕事内容 【未経験歓迎】SNSを活用 / matches sns-media-anon fixture shape

## Coverage gaps after this batch
- only 1 approved samples remain after exclusions, so this batch cannot serve as a real holdout start on its own
- no approved `job_board_detail` sample yet because the one local detail sample overlaps an existing fixture
- no approved `noisy_promo` sample yet, and company_careers coverage is still effectively zero after synthetic exclusions

## Next collection targets
- real `job_board_detail` samples that are not already fixtureized
- real `company_careers` pages with raw pasted text and no synthetic/demo naming
- `noisy_promo` and additional `prose_heavy` samples from fresh real-world pastes
