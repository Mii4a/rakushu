# Job Analysis Holdout Intake Notes

## Batch metadata
- intake_window: 2026-05-22 initial bootstrap batch
- collector: taro-bot
- collection_scope: local saved jobs with latest analysis rows; bootstrap collection before broader 50-sample holdout
- related_rules_doc: `docs/job-analysis-holdout-collection-rules.md`

## Batch progress
- total_candidates_seen: 14
- candidate: 0
- approved_for_holdout: 14
- needs_review: 0
- excluded_duplicate: 0
- excluded_fixture_overlap: 0
- excluded_synthetic: 0
- excluded_too_clean: 0

## Shape distribution snapshot
- job_board_detail: 9
- job_board_listcard: 0
- company_careers: 1
- prose_heavy: 1
- noisy_promo: 3
- other: 0

## Duplicate / overlap notes
- Current batch is unique by `job_id`; reruns were collapsed to the latest analysis row before intake.
- Existing parser fixtures were not reused directly; this batch comes from saved job texts rather than `fixtures/jobs/`.
- This is still a bootstrap set, not a fresh blind 50-sample holdout, because several texts were already seen during trial review.

## Approved candidates this batch
- holdout-candidate-001: 株式会社CRISP（クリスプサラダワークス） (job_board_detail)
- holdout-candidate-002: 株式会社ラクスパートナーズ (job_board_detail)
- holdout-candidate-003: 転職・求人doda（デューダ）トップ人材サービス・アウトソーシング業界・コールセンター人材派遣北斗株式会社 (noisy_promo)
- holdout-candidate-004: 株式会社ＲＪＣ (job_board_detail)
- holdout-candidate-005: 小島工業株式会社 (job_board_detail)
- holdout-candidate-006: 株式会社コスモス薬品 (job_board_detail)
- holdout-candidate-007: 株式会社コプロコンストラクション【東証プライム上場・名証プレミア上場グループ】 (job_board_detail)
- holdout-candidate-008: 株式会社ボードルア【東証プライム上場】 (job_board_detail)
- holdout-candidate-009: 株式会社ワコール (job_board_detail)
- holdout-candidate-010: ALSOK近畿株式会社 (noisy_promo)
- holdout-candidate-011: 株式会社学情 (noisy_promo)
- holdout-candidate-012: unknown (prose_heavy)
- holdout-candidate-013: エクシオ・デジタルソリューションズ株式会社 (job_board_detail)
- holdout-candidate-014: YouTube/TikTok運用 (company_careers)

## Needs-review candidates
- none in this batch

## Excluded candidates and reasons
- none in this batch

## Coverage gaps after this batch
- Need 36 more approved samples to reach the 50-sample completion-review threshold.
- `job_board_listcard` remains 0; this is the biggest shape gap.
- `company_careers` and `prose_heavy` are still underrepresented, so future collection should prioritize them before adding more detail pages.

## Next collection targets
- 8-10 `job_board_listcard` samples from short summary/list-card views.
- 7+ more `company_careers` samples with company-specific section structures.
- 7+ more `prose_heavy` or `noisy_promo` samples that look like real messy copy-paste input.
