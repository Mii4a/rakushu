# Sprint Contract: Account Settings MVP

## Scope
- Add a protected account settings page at `/settings/account`
- Optionally redirect `/settings` to `/settings/account`
- Render current account information for the signed-in user
- Allow editing only the display name
- Keep email and other account metadata read-only
- Show sign-in provider summary from the existing auth account records

## Expected Behavior
- Unauthenticated access redirects to `/login`
- Authenticated users can open the settings page and see their account data
- Submitting a valid new display name persists it
- After save, session-dependent UI shows the updated name
- No UI or action allows editing another user's data
- Password change is out of scope for this MVP
- `name` is trimmed on the server
- Empty or whitespace-only `name` values are rejected
- `name` longer than 100 characters is rejected
- Read-only fields remain immutable even if submitted manually
- Validation and persistence failures surface a visible error state

## Constraints
- Reuse existing Next.js App Router, Better Auth, Drizzle, and session helpers
- Do not add new database tables for this MVP
- Do not add email-change flows or verification flows
- Prefer Better Auth user update APIs over direct user-table writes when session freshness matters
- Keep implementation narrow and avoid unrelated settings work
- The update path must derive the target user from the authenticated session only
- Do not accept or use any client-provided user ID
- Prefer a protected server action over a custom route handler for this MVP

## Verification
- Route requires authentication
- Settings page renders current user name and read-only email
- Name update persists across refresh
- Invalid/empty names are rejected with a visible error
- Navigation exposes a path to the account settings page
- Forged client input cannot target another user
- Submitting read-only fields has no effect on persisted data
- Updated name appears in session-dependent UI after refresh

## Must-Fix Review Lens
- Cross-user update risk
- Missing auth guard
- Name change not reflected after refresh
- Read-only fields accidentally editable
- Broken save/error state
