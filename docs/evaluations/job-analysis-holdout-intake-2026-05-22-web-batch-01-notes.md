# Job Analysis Holdout Intake Notes — Web Batch 01

## Batch metadata
- collected_date: 2026-05-22
- collector: taro-bot
- batch_size: 20
- purpose: add 20 real public-web samples using the previously defined holdout collection flow

## Shape mix in this batch
- job_board_listcard: 10 (`en-japan listcard`)
- job_board_detail: 10 (`en-gage detail`)
- company_careers: 0
- prose_heavy: 0
- noisy_promo: 0

## Duplicate / overlap screening
- En-Japan rows were taken from one public list page but kept as separate list-card texts with different companies/titles.
- En-Gage rows were screened by distinct `desc_id` and excluded known fixture ids used in phase-2 fixture work.
- This batch is useful because it fills the biggest missing shape (`job_board_listcard`) and adds more real detail-page coverage.
- This batch does NOT close the remaining gaps for `company_careers`, `prose_heavy`, and `noisy_promo`.

## Approved candidates
- holdout-candidate-015: 弁護士法人ITO総合法律事務所 (en-japan listcard)
- holdout-candidate-016: 株式会社樋口総合研究所（東証TOKYO PRO Market・Fukuoka PRO Market上場） (en-japan listcard)
- holdout-candidate-017: 株式会社アイ・アール ジャパン (en-japan listcard)
- holdout-candidate-018: 株式会社アイ・アール ジャパン (en-japan listcard)
- holdout-candidate-019: METATEAM株式会社 (en-japan listcard)
- holdout-candidate-020: 株式会社日立製作所 (en-japan listcard)
- holdout-candidate-021: 株式会社 サクセス (en-japan listcard)
- holdout-candidate-022: 株式会社日立製作所 (en-japan listcard)
- holdout-candidate-023: 東京エレクトロン株式会社 (en-japan listcard)
- holdout-candidate-024: 日本電気株式会社 (en-japan listcard)
- holdout-candidate-025: 山本窯業化工株式会社 (en-gage detail)
- holdout-candidate-026: 東京サンブライト株式会社 (en-gage detail)
- holdout-candidate-027: 株式会社一宮保険事務所 (en-gage detail)
- holdout-candidate-028: 大木理工機材株式会社 (en-gage detail)
- holdout-candidate-029: 株式会社アルテクス 大分営業所 (en-gage detail)
- holdout-candidate-030: 日本機材株式会社 (en-gage detail)
- holdout-candidate-031: 株式会社ハウシーク (en-gage detail)
- holdout-candidate-032: 田中紙業株式会社 (en-gage detail)
- holdout-candidate-033: 合同資源サービス株式会社 (en-gage detail)
- holdout-candidate-034: (株)レンタルのニッケン (en-gage detail)
