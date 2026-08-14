# Company Research central screen mock checklist

Target mock: `UI-mock/company-research/01-company-research-input.png`
Target route: `/company-research`
Viewport: `1672x941`

## P0 structure

- [x] Input state has no dashboard topbar actions in the central area.
- [x] Input state has no left helper column beside the form.
- [x] Page heading uses building icon + `企業研究` + one description line.
- [x] Form card contains tabs, company select, URL input, and URL helper only.
- [x] CTA button and save note are outside the form card.
- [x] Input state does not show the orange bottom promo card.
- [x] Input state does not show a right history rail by default, or the rail does not affect central mock width.

## P1 visual parity

- [x] Central background is white/near-white, not green dashboard tint.
- [x] Heading, form width, and top spacing match the mock at 1672x941.
- [x] Active tab is white with subtle shadow; inactive tab is light gray.
- [x] Inputs use subtle gray border, lower radius, and no green-heavy styling.
- [x] CTA is black, card-external, icon-left.
- [x] Save note uses lock icon and centered muted text.

## P2 product truth

- [x] Checked job selection still updates URL input.
- [x] New company tab still clears selected job and allows manual URL entry.
- [x] Empty/unknown company names render as placeholder, not `会社名未取得` as a selected value.
- [x] Submit still calls `saveCompanyResearchAction`; browser smoke verified the card-external submit enables from manual URL input. Full click-to-save was not executed to avoid adding extra local DB usage records.
- [x] Existing result/history review wiring is preserved in the result-state branch.

## P3 verification

- [x] `npm run typecheck` passes after final code edit.
- [x] Focused Playwright/browser capture reaches authenticated `/company-research`.
- [x] 1672x941 screenshot is refreshed.
- [x] Page-level overflow is false at 1672x941.
- [x] Central screenshot is visually compared against `01-company-research-input.png`.

## Latest verification

- 2026-07-16: `npm run typecheck` PASS.
- 2026-07-16: `npm run build` PASS. Existing unrelated lint warnings remain in `src/actions/job-actions.ts`, `src/app/api/stripe/webhook/route.ts`, `src/app/compare/page.tsx`, `src/components/account-menu.tsx`, `src/lib/resume/xlsx-template.server.ts`, and `src/lib/usage/counters.test.ts`.
- 2026-07-16: `node scripts/visual-mock-audit.mjs` PASS for `/company-research?jobId=...`; refreshed `playwright-artifacts/visual-mock-audit/company-research-input-1672x941.png`; status 200, page overflow false, body overflow hidden.
- 2026-07-16: Focused Playwright DOM smoke confirmed `.company-research-input-stack` exists; no `.dashboard-mock-topbar`; no `.company-research-history-rail`; no input-state promo, selected-job alert, or old `企業URLを入力` hero heading; placeholder is `企業名を選択してください`; `会社名未取得` is not rendered as an option; new-company tab clears input and manual URL enables submit; selecting a checked job with URL autofills `https://example.com/admin`.
