import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Better Auth tables
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" })
  },
  (table) => [index("session_user_id_idx").on(table.userId)]
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    uniqueIndex("account_provider_account_unique").on(table.providerId, table.accountId)
  ]
);

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(sql`(unixepoch() * 1000)`)
});

// App tables
export const jobs = sqliteTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    companyName: text("company_name"),
    title: text("title"),
    sourceName: text("source_name"),
    sourceUrl: text("source_url"),
    selectionStatus: text("selection_status").notNull().default("saved"),
    nextActionAt: integer("next_action_at", { mode: "timestamp_ms" }),
    selectionMemo: text("selection_memo"),
    rawText: text("raw_text").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [index("jobs_user_id_idx").on(table.userId)]
);

export const jobAnalyses = sqliteTable(
  "job_analyses",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
    parserVersion: text("parser_version").notNull(),
    employmentType: text("employment_type"),
    baseSalaryMin: integer("base_salary_min"),
    baseSalaryMax: integer("base_salary_max"),
    fixedOvertimeHours: integer("fixed_overtime_hours"),
    fixedOvertimePay: integer("fixed_overtime_pay"),
    annualHolidays: integer("annual_holidays"),
    holidayType: text("holiday_type"),
    housingAllowance: integer("housing_allowance", { mode: "boolean" }),
    companyHousing: integer("company_housing", { mode: "boolean" }),
    benefitsJson: text("benefits_json"),
    warningsJson: text("warnings_json"),
    salaryRank: text("salary_rank"),
    holidayRank: text("holiday_rank"),
    benefitRank: text("benefit_rank"),
    totalRank: text("total_rank"),
    evidenceJson: text("evidence_json"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [index("job_analyses_job_id_idx").on(table.jobId)]
);

export const jobStatusEvents = sqliteTable(
  "job_status_events",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [index("job_status_events_job_id_idx").on(table.jobId)]
);

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    plan: text("plan").notNull().default("free"),
    status: text("status").notNull().default("inactive"),
    currentPeriodEnd: integer("current_period_end", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    index("subscriptions_user_id_idx").on(table.userId),
    uniqueIndex("subscriptions_user_id_unique").on(table.userId)
  ]
);

export const usageCounters = sqliteTable(
  "usage_counters",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    monthKey: text("month_key").notNull(),
    analysisCount: integer("analysis_count").notNull().default(0),
    compareCount: integer("compare_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    index("usage_counters_user_id_idx").on(table.userId),
    uniqueIndex("usage_counters_user_month_unique").on(table.userId, table.monthKey)
  ]
);

export const userRelations = relations(user, ({ many, one }) => ({
  jobs: many(jobs),
  sessions: many(session),
  accounts: many(account),
  subscription: one(subscriptions),
  usageCounters: many(usageCounters)
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  user: one(user, { fields: [jobs.userId], references: [user.id] }),
  analyses: many(jobAnalyses),
  statusEvents: many(jobStatusEvents)
}));

export const analysesRelations = relations(jobAnalyses, ({ one }) => ({
  job: one(jobs, { fields: [jobAnalyses.jobId], references: [jobs.id] })
}));

export const statusEventsRelations = relations(jobStatusEvents, ({ one }) => ({
  job: one(jobs, { fields: [jobStatusEvents.jobId], references: [jobs.id] })
}));
