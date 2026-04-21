# Account Settings Section Spec

## Goal
Add a logged-in account settings section where users can review their account identity and update the small set of profile fields already represented in auth data.

## User-Facing Scope
- Provide a simple account settings area for signed-in users.
- Let users update their display name.
- Let users view their email address and sign-in method.
- Let users view their current profile image/avatar state.
- Do not expand into billing, job preferences, or rank settings in this slice.

## Routes
- Primary route: `/settings/account`
- Optional future wrapper route: `/settings`
  - Can redirect to `/settings/account` or render a minimal settings nav if the app later gains more settings sections.

## Editable Fields
- `name`
- Optional stretch, only if supported cleanly by existing auth flow: `image`
  - Prefer treating image as phase-later unless there is already an upload or remote-image pattern in the app.

## Non-Editable Fields
- `email`
- `emailVerified`
- Auth provider / sign-in method summary
- Account creation timestamp
- Last update timestamp
- Internal user ID and session/account records

## Auth And Security
- Route must require an authenticated user using the existing server-side session pattern.
- Only allow a user to read and update their own profile record.
- Perform updates on the server side; do not trust client-supplied user IDs.
- Validate and normalize editable fields before persistence.
- Treat email as read-only in this slice to avoid email verification and account-linking complexity.
- If image editing is included, constrain accepted input sources and validation to avoid arbitrary URL abuse.
- Return safe error states without leaking internal auth/account details.

## Data Flow
1. Server-render settings page using the current session user as the source of truth.
2. Read current profile values from the Better Auth-backed `user` table.
3. Submit edits through a protected server action or authenticated route handler.
4. Persist changes to the auth user record via the app’s existing auth/DB layer.
5. Revalidate or refresh the settings page and any shared session-dependent UI that shows user name/image.

## Data Model Notes
- Prefer reusing the existing Better Auth `user` table fields (`name`, `email`, `image`).
- No new table is required for the baseline account settings slice.
- Only add schema if a later phase introduces settings that do not belong in auth-owned user fields.

## UX Notes
- Keep the page small and account-focused.
- Separate editable identity info from read-only account metadata.
- Show clear save, success, and validation/error states.
- Link to logout from this area if helpful, but logout is not the core feature.

## Suggested Sprint Contract Draft
### Generator
- Add a protected account settings page at `/settings/account`.
- Display current user profile data from the authenticated session/user record.
- Implement update support for `name`.
- Keep `email` visible but read-only.
- Use existing auth/session and Drizzle-backed persistence patterns.
- Keep implementation minimal and consistent with current app structure.

### Evaluator
- Verify unauthenticated access redirects to login.
- Verify authenticated users can load `/settings/account`.
- Verify `name` updates persist and are reflected after refresh/navigation.
- Verify `email` is displayed and cannot be edited through the settings UI.
- Verify no cross-user update path is possible from client input alone.
- Verify no unnecessary schema expansion was introduced for the baseline slice.

## Out Of Scope
- Email change flow
- Password management
- Multi-provider account linking management
- Billing/subscription settings
- Notification preferences
- Job/ranking preferences not directly tied to auth identity
