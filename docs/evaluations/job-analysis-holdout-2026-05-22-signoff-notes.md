# Job Analysis Holdout Sign-off Notes

## Review scope
- review_window: 2026-05-22 sign-off batch
- total approved samples reviewed: 50
- corpus source: 50 approved raw-text holdout files under `docs/evaluations/job-analysis-holdout-raw/approved`

## Method
- `holdout-candidate-001` 〜 `holdout-candidate-014` は既存の initial formal review をそのまま採用した。
- `holdout-bootstrap-001` は既存の trial row (`analysis_id=112fa3d0-830b-47f4-8b22-330727c2edda`) を流用した。
- `holdout-candidate-015` 〜 `holdout-candidate-049` は、現行 parser (`v1.5.0`) を raw text に対して再実行し、`docs/job-analysis-completion-criteria.md` の rubric に沿う heuristic review を行った。
- public web holdout は internal DB 上の保存済み analysis ではないため、`feedback_saved` は current `shouldCreateFeedback(report)` 挙動による simulation を notes に明記した。
- したがって feedback-loop 判定では、observed saved-job subset と simulated public subset を分けて読む必要がある。

## Verification run
- `npm test -- src/lib/analysis/quality.test.ts src/lib/analysis/parser.test.ts` → pass
- `npm test` → pass
- `npm run build` → pass

## Observed vs simulated feedback evidence
- observed subset: 15 rows
  - feedback_expected: 7
  - feedback_saved: 4
  - recall: 57%
- simulated public subset: 35 rows
  - feedback_expected: 33
  - feedback_saved (simulated): 29
  - recall (simulated): 88%

## Dominant failure clusters
- recurring failure hits: prose_heavy:too_many_unknown_critical_fields=5, prose_heavy:benefits_suspected_but_not_extracted=3, job_board_detail:salary_text_without_base_salary=5, noisy_promo:too_many_unknown_critical_fields=6, noisy_promo:salary_text_without_base_salary=5, company_careers:too_many_unknown_critical_fields=6, job_board_listcard:too_many_unknown_critical_fields=9, job_board_listcard:salary_text_without_base_salary=7
- high-priority backlog count: 28
- most common failure type: `too_many_unknown_critical_fields` (26 / 50)
- next most common failure type: `salary_text_without_base_salary` (18 / 50)

## Review caveat
- この batch は sign-off judgment 用に十分大きいが、50件中 35件は public holdout を parser に直接通した review であり、internal feedback table への実保存までは行っていない。
- よって parser quality の fail 判定はかなり強く言える一方、feedback-loop quality は "observed では fail、current logic simulation では pass" という split evidence になっている。

## 2026-05-22 post-fix addendum
- parser を `v1.6.0` へ更新し、priority fixes 1〜4 に対応した。
- 追加した匿名 fixture: `phase3-doda-platform-noise-anon.txt`, `phase3-green-company-card-anon.txt`, `phase3-green-cta-noise-anon.txt`, `phase3-wantedly-other-jobs-anon.txt`
- focused verification: `npm test -- --run src/lib/analysis/parser.test.ts src/lib/analysis/quality.test.ts` → pass
- full verification: `npm test` → pass
- spot-check result:
  - `003`: companyName が `北斗株式会社` に正常化。feedback は `negative_base_salary_detected` で save 対象化。
  - `011`: observed save miss だった negative base salary を `negative_base_salary_detected` で save 対象化。
  - `035`: Green 圧縮カードで `株式会社ミラリンク` / `600万円〜650万円` を抽出。
  - `040`: CTA ノイズ由来の salary false positive を unknown へ戻した。
  - `045` / `047` / `049`: prose-heavy Wantedly 系で companyName fallback を回収。
- まだ 50件 full rerun の scorecard は更新していないため、sign-off verdict 自体は未更新のまま据え置く。
