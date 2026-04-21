# Account Settings MVP Evaluator Notes

Based on `docs/agent/account-settings-spec.md` and `docs/agent/account-settings-contract.md`, this is a narrow MVP, but the contract is not yet tight enough for signoff.

## 1) Auth / Security Must-Fix Checks
- The update path must derive the target user strictly from the authenticated session; any client-supplied `userId` must be ignored or rejected.
- `GET /settings/account` must enforce auth server-side, and the state-changing update path must be blocked for unauthenticated callers as well.
- `name` validation must happen on the server, with trimming and a strict empty/whitespace-only rejection; do not rely on disabled or hidden UI controls.
- Read-only account fields must be enforced server-side too; attempts to submit `email`, `emailVerified`, avatar/image, provider summary, `createdAt`, or `updatedAt` changes must have no effect.
- If the implementation uses a route handler instead of a server action, the contract needs an explicit CSRF/same-site protection story; do not leave that implicit.
- Post-save, session-dependent UI must be refreshed from server state so the current name cannot drift between the settings page and the app chrome.

## 2) Contract Gaps
- There is no explicit `name` contract: length limit, normalization rules, and allowed character handling are unspecified.
- There is no explicit mutation contract: server action vs route handler, success response shape, redirect behavior, and error propagation are not defined.
- The contract says “session-dependent UI” should update, but it does not say which surfaces are in scope, especially the global header/layout.
- The contract does not state that read-only fields are protected backend-side, only that the UI should keep them read-only.
- Failure semantics are thin: unauthorized, validation failure, and persistence failure are not separately specified.

## 3) Suggested Acceptance Criteria Additions
- Unauthenticated access to `/settings/account` redirects to `/login`.
- Submitting no session, a forged `userId`, or another user’s ID cannot modify account data.
- `name` is trimmed, rejected when empty after trimming, and rejected when over a defined max length.
- Submitting read-only fields in the request does not change persisted data.
- A successful save updates the page and session-dependent UI after refresh without requiring logout/login.
- Validation and persistence failures surface a visible error state and do not silently fail.

## 4) MVP Scope Verdict
- The scope is acceptable in size for an MVP.
- It is not acceptable for approval as written because the security boundary and update semantics are under-specified. Tighten those before implementation starts.
