# Core workspace UI comparison checklist — 2026-07-12

Legend: exact = supplied mock can be matched; approximate = real data/product wiring changes content; unavailable = no real route/storage exists yet.

## 2026-07-13 visual audit rerun

Fresh audit output: `/home/openclaw/rakushu/playwright-artifacts/visual-mock-audit/report.json`.

- [x] `/jobs/new`: switched from public header to mock sidebar shell; page-level overflow fixed at 1672x941 (`doc=941/body=941/overflow=false`). Remaining approximation: CTA can be disabled on empty input, so it appears gray until enough text is entered.
- [x] `/ai-interview`: setup and feedback modals now expose real `role="dialog"`, viewport-fit within 1672x941, and use CSS fade/slide animation with reduced-motion fallback. Remaining approximation: live background content is slightly different from the supplied saved-session mock data.
- [x] `/jobs`: page-level overflow fixed at 1491x1055 (`doc=1055/body=1055/overflow=false`) and list scroll is confined to the route shell. Remaining approximation: local data has 27 rows, so visible row count differs from the 8-row mock.
- [x] `/jobs/[id]`: page-level overflow fixed at 1448x1086 (`doc=1086/body=1086/overflow=false`) and workspace content scrolls inside the shell. Remaining approximation: this implementation keeps the authenticated app sidebar/workspace tabs rather than the public marketing header shown in the original single-page result mock.
- [x] `/company-research`: page-level overflow already false at 1672x941; content is confined inside the dashboard mock shell. Remaining approximation: current screen keeps additional left helper panels and account topbar beyond the sparse input mock.
- [x] `/criteria`: page-level overflow already false at 1493x1054; carousel cards and detail pane render in the dashboard mock shell. Remaining approximation: current implementation shows the editable threshold walkthrough earlier than the original list-first mock.
- [ ] `/onboarding?preview=1`: still page-level overflow at 1448x1086 (`doc=1201/body=1201/overflow=true`); not part of the original 5-route core checklist but included in the new mock audit and still open.

## P0 — structure and behavior

- [x] `/jobs`: fixed left sidebar + one-row list/table; no card grid. (exact)
- [x] `/jobs`: sidebar action toggles the right detail/summary pane. (approximation of SSA detail-pane toggle)
- [x] `/jobs`: default new-first, match high/low, favorite sorts.
- [x] `/jobs`: search/location/job type/salary filter row. (exact)
- [x] `/jobs/[id]`: company workspace with tabs for job check/company research/resume/interview. (Playwright asserts tab URL state and jobId-preserving CTAs)
- [x] `/jobs/[id]`: unfinished tabs show a single real start CTA. (exact)
- [x] `/jobs/[id]`: job report exposes required checklist, detail fields, S–D grading and thin-input warning. (approximate: parser data)
- [x] `/jobs/new`: large chat-style paste field + optional company HP URL + one primary analysis action. (exact)
- [x] `/jobs/new`: no AI preview. (exact)
- [x] `/company-research`: saved-company/new-company mode; saved URL autofill and `jobId` context preselect. (Playwright asserts selected job context)
- [x] `/company-research`: input → processing → saved result/history state machine. (current server action is synchronous, pending UI shown during action)
- [x] `/criteria`: popular carousel + list + selected details. (seeded 5 public defaults; Playwright asserts 5 carousel links)
- [x] `/resume`: MHLW two-page preview keeps page 2 as resume continuation, not work-history document. (15 rows on page 1, 7 continuation rows on page 2)
- [x] `/resume`: AI draft/review/company-adjustment proposals require explicit apply before mutating the form. (Playwright asserts unchanged before apply for all 3 modes)

## P1 — first impression and hierarchy

- [ ] White/off-white overseas SaaS surface, thin cool-gray borders, restrained shadows.
- [ ] Strong black Japanese headings, muted gray support copy, green used only for state/action.
- [ ] Main action remains obvious without competing preview/promo panels.
- [ ] Student-facing copy stays short and reassuring.
- [ ] Pipeline status is visible but does not dominate job facts.

## P2 — density and content resilience

- [ ] `/jobs` now prioritizes the table by hiding the right summary pane by default and compacting the header/filter area; final row-count fit still needs human screenshot sign-off.
- [ ] Long company/job names truncate or wrap without shifting progress columns.
- [ ] Missing facts say “未記載/要確認” and explain low-score treatment.
- [ ] Empty first-run states contain no fake prior history or scores.
- [x] `/resume`: large two-page MHLW preview + overlay input form trigger. (initial implementation)
- [x] `/resume`: AI draft/review/company-adjustment starts with diff-confirmation UX before applying values. (local confirmation shell)
- [ ] Result/history content comes from persisted records and survives reload.

## P3 — polish and accessibility

- [ ] Visible keyboard focus for rows, tabs, carousel controls and CTAs.
- [ ] Carousel pauses on hover/focus and stops under `prefers-reduced-motion`.
- [ ] Processing animation has text/status semantics and a reduced-motion fallback.
- [ ] Narrow screens use horizontal list/table scrolling or stacked panes without document overflow.
- [x] Target routes are browser-verified with authenticated state. (`npm run test:local-jobs-smoke`, 9 routes passed)
- [x] Mock/workspace shell invariants are covered in Playwright for `/criteria`, `/company-research`, `/jobs`, `/jobs/new`, `/resume`, `/jobs/[id]`. (dashboard-frame/dashboard-mock-frame/jobs-mock-surface)
