# Account Settings MVP Spec

## Goal
Add a protected account settings page for signed-in users.

## Route
- `GET /settings/account`
- Optional convenience route: `GET /settings` redirects to `/settings/account`

## User-Facing Scope
- Show current account information
- Allow updating display name only
- Keep other account information read-only in this MVP
- Show clear save, success, and error states

## Editable Fields
- `name`

## Read-Only Fields
- `email`
- `emailVerified`
- avatar/image preview
- sign-in provider summary
- account `createdAt`
- account `updatedAt`

## Security and Auth
- Require authentication using the existing server-side session pattern
- Never trust client-provided user IDs
- Read and update only the current signed-in user
- Validate and normalize `name` on the server
- Keep email read-only to avoid email verification complexity in this phase

## Data Flow
- Load the current user from the authenticated session on the server
- Submit edits through a protected server action or authenticated route handler
- Persist updates to the existing Better Auth `user` table
- Refresh/revalidate session-dependent UI after save so the updated name appears across the app

## Non-Goals
- Email change
- Password reset by email
- Avatar upload
- Billing settings
- Notification preferences
