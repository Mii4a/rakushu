# Job Analysis Holdout Trial Notes

- run_date: 2026-05-22
- scope: first locally available analysis rows, supplemented with one unparsed job to reach 10 trial rows
- limitation: only 7 unique jobs exist locally, so several rows are parser reruns of the same job
- outcome: enough to test the scorecard columns and identify missing traceability fields

## Column change learned from trial
- `job_id` is needed to tie a row back to the saved job
- `analysis_id` is needed because feedback rows attach to analyses, not jobs
- `parser_version` is needed because reruns across versions are useful during trial review

## Per-sample notes

## trial-001
- job_id: 3c7afea1-73a8-4188-af71-8818b32832e1
- analysis_id: 112fa3d0-830b-47f4-8b22-330727c2edda
- parser_version: v1.5.0
- source_shape: prose_heavy
- overall_grade: B
- overall_reason: housing_allowance_unknown_with_keyword
- feedback_expected: yes
- feedback_saved: yes
- duplicate_of: -
- note: auto-trial-review | feedback_saved

## trial-002
- job_id: 0080ec0f-eccc-400c-b2fc-b2d7343b3133
- analysis_id: b028795c-245f-498e-b1d3-8ddfe7acca76
- parser_version: v1.5.0
- source_shape: other
- overall_grade: C
- overall_reason: too_many_unknown_critical_fields
- feedback_expected: yes
- feedback_saved: no
- duplicate_of: -
- note: auto-trial-review | source_manual

## trial-003
- job_id: 5d24e542-385d-4802-ac4e-bb451f615d34
- analysis_id: 3cf948a7-b84e-429c-adb4-54eaf7ad011b
- parser_version: v1.5.0
- source_shape: job_board_listcard
- overall_grade: B
- overall_reason: salary_text_without_base_salary
- feedback_expected: yes
- feedback_saved: no
- duplicate_of: -
- note: auto-trial-review

## trial-004
- job_id: 5d24e542-385d-4802-ac4e-bb451f615d34
- analysis_id: 49eb15b1-b691-4631-94d1-6d4faed7854d
- parser_version: v1.4.0
- source_shape: job_board_listcard
- overall_grade: B
- overall_reason: salary_text_without_base_salary
- feedback_expected: yes
- feedback_saved: no
- duplicate_of: trial-003
- note: auto-trial-review | duplicate_of_trial-003

## trial-005
- job_id: 47abf6f0-5209-4417-b03a-0dd8756827eb
- analysis_id: bf0e3dbf-8c94-49cc-a3eb-0984aa44d49f
- parser_version: v1.4.0
- source_shape: job_board_listcard
- overall_grade: B
- overall_reason: salary_text_without_base_salary
- feedback_expected: yes
- feedback_saved: no
- duplicate_of: -
- note: auto-trial-review

## trial-006
- job_id: 4ada0f3f-9e34-4b58-9a42-022628c95e1b
- analysis_id: 7393423e-36ce-4e2c-af37-6e110762c492
- parser_version: v1.3.2
- source_shape: prose_heavy
- overall_grade: C
- overall_reason: salary_text_without_base_salary | too_many_unknown_critical_fields
- feedback_expected: yes
- feedback_saved: no
- duplicate_of: -
- note: auto-trial-review

## trial-007
- job_id: 4ada0f3f-9e34-4b58-9a42-022628c95e1b
- analysis_id: 19a3cdc2-1ec7-47d5-b32c-f279dcaf147d
- parser_version: v1.3.2
- source_shape: prose_heavy
- overall_grade: C
- overall_reason: salary_text_without_base_salary | too_many_unknown_critical_fields
- feedback_expected: yes
- feedback_saved: no
- duplicate_of: trial-006
- note: auto-trial-review | duplicate_of_trial-006

## trial-008
- job_id: 5fbd0c13-f4fd-45cb-b1fa-522e8c14f321
- analysis_id: e45297e3-51c0-4394-93be-a1347b020196
- parser_version: v1.3.2
- source_shape: job_board_detail
- overall_grade: B
- overall_reason: critical usable 3/4
- feedback_expected: no
- feedback_saved: no
- duplicate_of: -
- note: auto-trial-review

## trial-009
- job_id: 4ada0f3f-9e34-4b58-9a42-022628c95e1b
- analysis_id: 8a0bef5b-fcb1-49e5-b6e5-5c5dfa648cb3
- parser_version: v1.1.0
- source_shape: prose_heavy
- overall_grade: C
- overall_reason: salary_text_without_base_salary | too_many_unknown_critical_fields
- feedback_expected: yes
- feedback_saved: no
- duplicate_of: trial-006
- note: auto-trial-review | duplicate_of_trial-006

## trial-010
- job_id: 38aebe72-ac9b-442a-8759-dbfb67932292
- analysis_id: -
- parser_version: -
- source_shape: other
- overall_grade: C
- overall_reason: no analysis snapshot available
- feedback_expected: yes
- feedback_saved: no
- duplicate_of: -
- note: trial_unparsed_saved_job
