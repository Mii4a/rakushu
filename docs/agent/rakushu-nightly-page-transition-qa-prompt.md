Nightly page-transition QA cron prompt

Role:
You are running nightly browser QA for rakushu. Verify every navigation edge defined in `docs/qa/nightly-page-transition-edges.json`.

Environment:
- Repo root: `/home/openclaw/rakushu`
- Primary env file: `.env.production`
- Base URL defaults to `.env.production` `NEXT_PUBLIC_APP_URL`, but `RAKUSHU_QA_BASE_URL` may override it
- Edge manifest: `docs/qa/nightly-page-transition-edges.json`
- Auth/session helper: `node --env-file=.env.production scripts/prepare-nightly-qa-auth.mjs`
- Use browser, file, and terminal tools
- Do not perform destructive actions
- Do not log out
- Do not complete checkout

Procedure:
1. Read `docs/qa/nightly-page-transition-edges.json`.
2. Run `node --env-file=.env.production scripts/prepare-nightly-qa-auth.mjs` from repo root.
3. Parse the helper JSON.
   - `status=error` -> stop and report setup failure.
   - `status=blocked` -> continue, but mark every `auth=required` edge as `blocked` with the helper's blocked reasons.
   - `status=ok` -> use `baseUrl` from helper output and keep `auth.injectScript` for authenticated edges.
4. Split edges into three buckets:
   - `public`
   - `required`
   - `unauth-only`
5. For `public` and `unauth-only` edges:
   - navigate normally with no auth cookie injection
   - for `unauth-only`, verify the redirect target without carrying any authenticated browser state
6. For each `required` edge when helper status is `ok`:
   - first navigate to `${baseUrl}/login`
   - run the exact JavaScript string in `auth.injectScript`
   - navigate to the edge `from` URL again
   - if the page still lands on `/login`, mark `blocked: auth-cookie-rejected`
7. For every executed edge:
   - build the full URL from `baseUrl` + `from`
   - open the page with browser automation
   - perform the declared action unless `kind=navigate-only`
   - verify URL and page markers from `assert`
   - read browser console and record any errors
   - if the page shows `Application error` or `Digest:` treat it as `fail`
8. For dynamic routes:
   - rely on helper fixture counts and the edge's `dataDependency`
   - if required data is absent, mark `blocked: missing-fixture-data`
   - do not fabricate IDs
9. Keep a per-edge result with:
   - `id`
   - `status`: pass | fail | blocked
   - `from`
   - `to`
   - `actualUrl`
   - `consoleErrors`
   - `note`
10. Final output must be concise and structured exactly as:

Nightly page-transition QA result
- base_url: ...
- total_edges: N
- passed: N
- failed: N
- blocked: N

Failed edges
- <id>: <short reason>

Blocked edges
- <id>: <short reason>

If there are no failed edges, write `Failed edges: none`.
If there are no blocked edges, write `Blocked edges: none`.

Extra rules:
- If browser text and snapshot disagree, trust the actual rendered page after refresh.
- If a click target label appears multiple times, use the first visible one unless the manifest specifies an occurrence.
- If an edge fails, continue with the remaining edges.
- Prefer evidence over guessing.
- Never try to drive Google OAuth during this cron run.
