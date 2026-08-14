# Company Research sidebar mock checklist

## P0 structure

- [ ] Left sidebar uses the Company Research UI mock width and fixed full-height layout.
- [ ] Sidebar is a flat white/near-white rail with a thin right border, not a rounded card.
- [ ] Content scrolls inside the sidebar when needed; the page body does not grow because of the sidebar.
- [ ] Settings stays at the bottom of the rail on desktop.

## P1 visual parity

- [ ] Logo is black and compact, with no green brand card or subtitle.
- [ ] Navigation labels match the Company Research mock: ダッシュボード / 求人一覧 / 求人チェッカー / 企業研究 / レジュメAI / AI面接 / チェック基準 / みんなで知恵袋 / 設定.
- [ ] Active state is a light gray rounded rectangle with black text and icon, not green.
- [ ] Normal nav items use black icon/text and generous vertical spacing.
- [ ] Promo cards from the current mock sidebar are not shown on Company Research.

## P2 product truth

- [ ] Existing real routes are preserved for implemented destinations.
- [ ] Missing destinations are rendered as disabled visual items rather than fake links.
- [ ] The shared sidebar component still supports existing default and mock callers.

## P3 verification

- [ ] TypeScript check passes after the final edit.
- [ ] Lint or focused build result is recorded when feasible.
- [ ] Browser check reaches `/company-research` and records sidebar/body overflow metrics when auth permits.
