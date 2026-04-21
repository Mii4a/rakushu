# Account Settings Generator Notes

## 1) Concrete Implementation Scope
- Add a protected `/settings/account` page for the signed-in user.
- Optionally add `/settings` as a redirect to `/settings/account`.
- Show current account data from the authenticated session/user record.
- Allow editing `name` only.
- Keep `email`, `emailVerified`, avatar/image, provider summary, `createdAt`, and `updatedAt` read-only.
- Validate/trim `name` on the server, persist to the existing Better Auth `user` row, and refresh session-dependent UI after save.

## 2) Minimal File Ownership / Write-Set
- `src/app/settings/account/page.tsx`
- `src/app/settings/page.tsx` only if I add the convenience redirect
- `src/actions/account-settings-actions.ts` for the protected update path and validation
- `src/components/account-settings-form.tsx` only if the page needs a client form for save/error/success states

## 3) Ambiguities Resolved by Assumption
- I will treat `name` as the only mutable field and normalize it by trimming whitespace.
- I will not add a DB migration or any new settings tables.
- I will reuse the existing `getSession` / `requireUser` auth pattern and update only the current user.
- I will keep feedback local to the page; no broader notification system is required.

## 4) Contract Boundary
- I will not expand beyond the contract: no email changes, password flows, avatar upload, billing, notifications, or cross-user editing paths.
