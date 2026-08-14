# Admin analytics and AI cost ledger implementation plan

> For Hermes: use subagent-driven-development only when implementation starts. This document is the design and execution handoff.

Goal: add internal-only analytics foundations so Rakushu can track per-user AI cost, page/action-level AI usage, growth funnel quality, and unit economics without polluting end-user feature tables.

Architecture: keep durable business facts in the app DB as append-only ledgers and history tables, then surface them in narrowly scoped `/internal/*` pages. Treat Turso/GA4/GSC/MCP as exploration, validation, and external-behavior sources, not as the canonical storage layer for user-level cost or subscription history.

Tech stack: Next.js App Router, Drizzle ORM, Turso/libSQL, Stripe webhooks, internal server-rendered admin pages under `/internal`.

---

## 0. Verified current state

### Code-backed facts

Files inspected:
- `src/app/internal/parser-feedback/page.tsx`
- `src/lib/db/schema.ts`
- `src/lib/marketing/events.ts`
- `src/components/marketing-event-tracker.tsx`
- `src/lib/usage/counters.ts`
- `src/lib/plans.ts`
- `src/lib/subscription.ts`
- `src/app/api/stripe/webhook/route.ts`
- `src/lib/ai-interview/ai-openai-json.ts`
- `src/lib/ai-interview/ai-follow-up.ts`
- `src/lib/ai-interview/ai-category-feedback.ts`
- `src/lib/ai-interview/submit-confirmed-answer.ts`

Current behavior:
- Internal area currently exposes `parser-feedback` only.
- `marketing_events` stores top-funnel event counts and UTM/referrer context, but has no `user_id`, `anonymous_visitor_id`, or session linkage.
- `subscriptions` stores a single current-state subscription row per user.
- `stripe_webhook_events` dedupes webhook processing but is not a revenue ledger.
- `usage_counters` stores monthly `analysis_count`, `compare_count`, and `ai_credits_used` only.
- AI interview OpenAI requests do not persist token counts, latency, provider/model, or cost.
- AI interview generated rows (`ai_interview_generated_questions`, `ai_interview_category_feedbacks`) currently store product output only, not billing telemetry.

### Data-backed spot check

Observed counts from live Turso query:
- users: 4
- subscriptions: 1
- active_subscriptions: 1
- marketing_events: 43
- ai_interview_sessions: 25
- ai_interview_answers: 13
- usage_counters: 3
- stripe_webhook_events: 0

Observed marketing event mix:
- `lp_view`: 33
- `beta_form_view`: 4
- `analysis_completed`: 2
- `demo_interaction_started`: 2
- `job_text_pasted`: 2

Implication:
- a basic top-funnel board is possible now
- user-level attribution to paid conversion is not reliable yet
- AI cost accounting is not reliable yet
- strict churn/LTV is not reliable yet

---

## 1. Source-of-truth split

### App DB must own these facts

1. AI usage per call
2. credit grants and consumption
3. user-linked activation milestones
4. subscription periods/history
5. payment transactions
6. user-level conversion joins from anonymous visitor to signed-up user

### MCP / external tools can assist with these

1. Turso MCP
   - ad hoc SQL
   - cohort spot checks
   - validating admin-page aggregates
   - inspecting suspicious user/account cases

2. GA4 MCP
   - landing page views
   - traffic source / medium / campaign
   - page flow and on-site behavior
   - landing-page-to-signup funnel observation

3. GSC MCP
   - search query performance
   - page impressions, clicks, CTR, average position
   - SEO trend monitoring

### Not sufficient as canonical storage

Do not rely on GA4/GSC/Turso MCP alone for:
- per-user AI cost
- credit balance history
- paid conversion by linked user identity
- subscriber churn
- revenue churn
- LTV or contribution margin

---

## 2. Recommended internal page split

### `/internal/ai-cost` (first implementation target)

Purpose: understand AI spend, failure rate, and per-user/per-action burn.

Primary cards:
- total AI cost today / 7d / 30d
- AI cost by feature area
- AI cost by action key
- AI cost by model
- AI cost by user
- average cost per successful run
- fallback rate
- error rate
- free vs paid user cost split

### `/internal/growth`

Purpose: see acquisition-to-activation quality.

Primary cards:
- visitors
- signup started
- signup completed
- activation count
- activation rate
- new paid users
- paid conversion rate
- source/medium by activation and paid conversion

### `/internal/revenue`

Purpose: monitor paid plan health.

Primary cards:
- active subscribers
- new subscribers
- canceled subscribers
- reactivated subscribers
- MRR
- one-off credit-pack revenue
- ARPPU

### `/internal/unit-economics`

Purpose: determine whether the business model is working.

Primary cards:
- CAC
- paid conversion
- gross LTV
- contribution LTV
- LTV/CAC
- AI cost as % of revenue
- plan-level margin quality

### `/internal/seo`

Purpose: improve discoverability and LP quality.

Primary cards:
- top queries
- top landing pages
- CTR trends
- average position trends
- landing page -> signup rate
- landing page -> paid conversion rate

---

## 3. Metric definitions for Rakushu

### New-user paid conversion

Candidate denominators:
1. visitor-based: paid new users / LP visitors
2. signup-based: paid new users / new signed-up users
3. activation-based: paid new users / activated new users

Recommended operating definition:
- primary: paid new users / new signed-up users
- secondary: paid new users / activated new users

Reason:
- visitor-based is too noisy early on
- activation-based is useful for product quality
- signup-based is easiest to explain and compare over time

### Activation

Recommended definition for Rakushu core value:
- user pasted a job
- scoring/analysis completed
- result page viewed

Do not define activation as “created account” or “visited dashboard”.

### PMF framing

Do not use one metric.

Recommended provisional PMF dashboard bundle:
- new signed-up user paid conversion >= 4–6%
- activation rate >= 35%
- D30 retained activated users >= 20%
- paid user next-month retention >= 85%
- LTV/CAC >= 3.0

### Churn

Track two separate definitions:
- subscriber churn = canceled paid users / paid users at period start
- revenue churn = lost recurring revenue / recurring revenue at period start

Implementation order:
- compute subscriber churn first
- add revenue churn once payment history is stored cleanly

### LTV

Track both:
- gross LTV = cumulative user payments
- contribution LTV = cumulative user payments - AI cost - payment fees

This product should eventually favor contribution LTV when making plan/pricing decisions.

### CAC

Do not present CAC as “ready” until ad/channel spend is normalized somewhere.

Before that, present:
- organic acquisition share
- source/medium mix
- placeholder CAC status = unavailable / incomplete

---

## 4. Data model recommendation

### Table A: `ai_usage_events`

1 row = 1 LLM/API call.

Fields:
- `id`
- `user_id` nullable for anonymous/admin/system work if needed
- `provider`
- `model`
- `feature_area` (`ai_interview`, `company_research`, `job_analysis`, `resume`, etc.)
- `action_key` (`follow_up_question_generate`, `category_feedback_generate`, etc.)
- `page_path`
- `source_table`
- `source_id`
- `request_status` (`success`, `fallback`, `error`)
- `prompt_tokens`
- `completion_tokens`
- `total_tokens`
- `input_unit_price_microyen_per_1m`
- `output_unit_price_microyen_per_1m`
- `fx_rate_millionths` or versioned FX snapshot if needed
- `input_cost_microyen`
- `output_cost_microyen`
- `total_cost_microyen`
- `latency_ms`
- `price_version`
- `metadata_json`
- `created_at`

Notes:
- use integers for money, not floats
- do not add these columns to feature tables
- `source_table + source_id` is enough to reconnect UI/business rows later

### Table B: `credit_wallets`

Represents balance buckets.

Fields:
- `id`
- `user_id`
- `wallet_type` (`shared`, `ai_interview`, `company_research`, `job_analysis`, `resume`)
- `status`
- `created_at`
- `updated_at`

### Table C: `credit_ledger`

1 row = 1 balance movement.

Fields:
- `id`
- `wallet_id`
- `user_id`
- `delta_credits`
- `source_type` (`subscription_grant`, `credit_pack_purchase`, `feature_consume`, `manual_adjustment`, `refund`, `expiration`)
- `related_ai_usage_event_id` nullable
- `plan_code` nullable
- `pack_code` nullable
- `expires_at` nullable
- `metadata_json`
- `created_at`

Notes:
- append-only
- current balance should be derived, or materialized secondarily if needed for performance

### Table D: `subscription_periods`

Fields:
- `id`
- `user_id`
- `subscription_id` nullable reference to current snapshot if retained
- `plan`
- `status`
- `billing_cycle`
- `started_at`
- `ended_at` nullable
- `source` (`stripe_webhook`, `backfill`, `manual`)
- `created_at`

### Table E: `payment_transactions`

Fields:
- `id`
- `user_id`
- `provider` (`stripe`)
- `kind` (`subscription`, `credit_pack`, `refund`)
- `plan_code` nullable
- `pack_code` nullable
- `provider_customer_id`
- `provider_invoice_id` nullable
- `provider_payment_intent_id` nullable
- `amount_yen`
- `fee_yen` nullable
- `net_amount_yen` nullable
- `paid_at`
- `refunded_at` nullable
- `metadata_json`
- `created_at`

### Table F: acquisition linkage upgrade

Either expand `marketing_events` or create a companion table, but preserve these fields somewhere durable:
- `anonymous_visitor_id`
- `session_id`
- `user_id` nullable until identified
- `first_touch_source`
- `first_touch_medium`
- `first_touch_campaign`
- `last_touch_source`
- `last_touch_medium`
- `last_touch_campaign`

Recommended approach:
- add `anonymous_visitor_id` cookie at LP entry
- persist it on marketing events
- attach it to user on signup completion

---

## 5. Migration-safe rollout order

### Phase 1: AI usage ledger foundation

Objective: enable admin-only AI cost visibility without touching end-user screens.

Files likely to modify:
- `src/lib/db/schema.ts`
- new migration files
- `src/lib/ai-interview/ai-openai-json.ts`
- `src/lib/ai-interview/ai-follow-up.ts`
- `src/lib/ai-interview/ai-category-feedback.ts`
- new internal loader/query files under `src/lib/internal/`
- new page `src/app/internal/ai-cost/page.tsx`

Acceptance:
- one row written per AI call
- status distinguishes success/fallback/error
- `/internal/ai-cost` renders basic aggregates
- `/ai-interview` UX unchanged

### Phase 2: acquisition linkage

Objective: make LP -> signup -> activation -> paid reporting trustworthy.

Files likely to modify:
- `src/lib/db/schema.ts`
- `src/lib/marketing/events.ts`
- `src/lib/marketing/client.ts`
- `src/components/marketing-event-tracker.tsx`
- signup completion flow files
- new internal growth queries/page

Acceptance:
- anonymous visitor id persists from LP through signup
- signup and activation events can be grouped by linked user

### Phase 3: subscription and revenue history

Objective: make churn, MRR, and LTV defensible.

Files likely to modify:
- `src/lib/db/schema.ts`
- `src/lib/subscription.ts`
- `src/app/api/stripe/webhook/route.ts`
- new revenue query helpers and internal pages

Acceptance:
- subscription updates append history rows
- payments are recorded as transactions
- subscriber churn can be computed from history rather than snapshots

### Phase 4: external analytics integration

Objective: enrich traffic and SEO decisions after app-DB instrumentation is stable.

Dependencies:
- configure Hermes `mcp_servers` for Turso/GA4/GSC if desired
- or implement direct product-side exports if not using MCP

Acceptance:
- internal SEO/growth dashboards clearly label DB-native vs external-source metrics

---

## 6. Things that can be shown immediately vs not yet

### Can show now with acceptable honesty

- marketing event counts by type
- LP view counts
- beta form view/submit counts if event exists
- AI interview session counts
- basic subscription count snapshot
- coarse monthly AI credit usage from `usage_counters`

### Can show only as rough / incomplete

- paid conversion from signups if signup-complete event exists but user linkage is weak
- AI credit consumption as a coarse total only

### Should not be claimed as reliable yet

- per-user AI cost in yen
- action-level AI cost by page path
- strict churn
- strict LTV
- strict CAC
- contribution margin by user or plan

---

## 7. Immediate next implementation slice

Recommended first real build:
1. add `ai_usage_events`
2. instrument `requestAiInterviewJson()` so every OpenAI call writes a ledger row
3. classify AI interview calls with `feature_area=ai_interview`
4. set `action_key` to at least:
   - `follow_up_question_generate`
   - `category_feedback_generate`
5. build `/internal/ai-cost` with 7d/30d totals and user/feature/action breakdowns
6. keep `usage_counters` alive only for existing plan-limit behavior until credit ledger replaces it

This gives the fastest truthful admin value with the least schema blast radius.
