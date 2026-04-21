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
    holidayTypeRank: text("holiday_type_rank"),
    benefitRank: text("benefit_rank"),
    totalRank: text("total_rank"),
    evidenceJson: text("evidence_json"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [index("job_analyses_job_id_idx").on(table.jobId)]
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

export const rankSettings = sqliteTable(
  "rank_settings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    overtimeAMaxHours: integer("overtime_a_max_hours").notNull().default(10),
    overtimeBMaxHours: integer("overtime_b_max_hours").notNull().default(20),
    overtimeCMaxHours: integer("overtime_c_max_hours").notNull().default(30),
    overtimeDMaxHours: integer("overtime_d_max_hours").notNull().default(45),
    holidaySMinDays: integer("holiday_s_min_days").notNull().default(130),
    holidayAMinDays: integer("holiday_a_min_days").notNull().default(125),
    holidayBMinDays: integer("holiday_b_min_days").notNull().default(120),
    holidayCMinDays: integer("holiday_c_min_days").notNull().default(115),
    holidayDMinDays: integer("holiday_d_min_days").notNull().default(110),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    index("rank_settings_user_id_idx").on(table.userId),
    uniqueIndex("rank_settings_user_id_unique").on(table.userId)
  ]
);

export const criteriaTemplates = sqliteTable(
  "criteria_templates",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    sourceTemplateId: text("source_template_id"),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    tagsJson: text("tags_json").notNull().default("[]"),
    visibility: text("visibility").notNull().default("private"),
    editable: integer("editable", { mode: "boolean" }).notNull().default(true),
    overtimeAMaxHours: integer("overtime_a_max_hours").notNull().default(10),
    overtimeBMaxHours: integer("overtime_b_max_hours").notNull().default(20),
    overtimeCMaxHours: integer("overtime_c_max_hours").notNull().default(30),
    overtimeDMaxHours: integer("overtime_d_max_hours").notNull().default(45),
    holidaySMinDays: integer("holiday_s_min_days").notNull().default(130),
    holidayAMinDays: integer("holiday_a_min_days").notNull().default(125),
    holidayBMinDays: integer("holiday_b_min_days").notNull().default(120),
    holidayCMinDays: integer("holiday_c_min_days").notNull().default(115),
    holidayDMinDays: integer("holiday_d_min_days").notNull().default(110),
    viewCount: integer("view_count").notNull().default(0),
    saveCount: integer("save_count").notNull().default(0),
    cloneCount: integer("clone_count").notNull().default(0),
    useCount: integer("use_count").notNull().default(0),
    popularityScore: integer("popularity_score").notNull().default(0),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    index("criteria_templates_user_id_idx").on(table.userId),
    index("criteria_templates_visibility_idx").on(table.visibility),
    index("criteria_templates_category_idx").on(table.category),
    index("criteria_templates_popularity_idx").on(table.popularityScore)
  ]
);

export const savedCriteriaTemplates = sqliteTable(
  "saved_criteria_templates",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    templateId: text("template_id").notNull().references(() => criteriaTemplates.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    index("saved_criteria_templates_user_id_idx").on(table.userId),
    uniqueIndex("saved_criteria_templates_user_template_unique").on(table.userId, table.templateId)
  ]
);

export const criteriaUsageEvents = sqliteTable(
  "criteria_usage_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    templateId: text("template_id").notNull().references(() => criteriaTemplates.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    index("criteria_usage_events_user_id_idx").on(table.userId),
    index("criteria_usage_events_template_id_idx").on(table.templateId),
    index("criteria_usage_events_event_type_idx").on(table.eventType)
  ]
);

export const usageCounters = sqliteTable(
  "usage_counters",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    monthKey: text("month_key").notNull(),
    analysisCount: integer("analysis_count").notNull().default(0),
    aiCreditsUsed: integer("ai_credits_used").notNull().default(0),
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
  rankSettings: one(rankSettings),
  criteriaTemplates: many(criteriaTemplates),
  savedCriteriaTemplates: many(savedCriteriaTemplates),
  usageCounters: many(usageCounters)
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  user: one(user, { fields: [jobs.userId], references: [user.id] }),
  analyses: many(jobAnalyses)
}));

export const analysesRelations = relations(jobAnalyses, ({ one }) => ({
  job: one(jobs, { fields: [jobAnalyses.jobId], references: [jobs.id] })
}));

export const rankSettingsRelations = relations(rankSettings, ({ one }) => ({
  user: one(user, { fields: [rankSettings.userId], references: [user.id] })
}));

export const criteriaTemplatesRelations = relations(criteriaTemplates, ({ one, many }) => ({
  user: one(user, { fields: [criteriaTemplates.userId], references: [user.id] }),
  savedBy: many(savedCriteriaTemplates),
  usageEvents: many(criteriaUsageEvents)
}));

export const savedCriteriaTemplatesRelations = relations(savedCriteriaTemplates, ({ one }) => ({
  user: one(user, { fields: [savedCriteriaTemplates.userId], references: [user.id] }),
  template: one(criteriaTemplates, { fields: [savedCriteriaTemplates.templateId], references: [criteriaTemplates.id] })
}));

export const criteriaUsageEventsRelations = relations(criteriaUsageEvents, ({ one }) => ({
  user: one(user, { fields: [criteriaUsageEvents.userId], references: [user.id] }),
  template: one(criteriaTemplates, { fields: [criteriaUsageEvents.templateId], references: [criteriaTemplates.id] })
}));
