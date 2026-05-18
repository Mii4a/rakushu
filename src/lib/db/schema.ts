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
    workAddress: text("work_address"),
    nearestStation: text("nearest_station"),
    commuteMinutes: integer("commute_minutes"),
    commuteMinutesMin: integer("commute_minutes_min"),
    commuteMinutesMax: integer("commute_minutes_max"),
    commuteMinutesTypical: integer("commute_minutes_typical"),
    commuteDataKind: text("commute_data_kind"),
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
    bonusCount: integer("bonus_count"),
    bonusPerformanceLinked: integer("bonus_performance_linked", { mode: "boolean" }),
    housingAllowance: integer("housing_allowance", { mode: "boolean" }),
    companyHousing: integer("company_housing", { mode: "boolean" }),
    retirementAllowance: integer("retirement_allowance", { mode: "boolean" }),
    benefitsJson: text("benefits_json"),
    warningsJson: text("warnings_json"),
    salaryRank: text("salary_rank"),
    holidayRank: text("holiday_rank"),
    holidayTypeRank: text("holiday_type_rank"),
    bonusRank: text("bonus_rank"),
    retirementAllowanceRank: text("retirement_allowance_rank"),
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
    uniqueIndex("subscriptions_user_id_unique").on(table.userId),
    uniqueIndex("subscriptions_stripe_customer_id_unique").on(table.stripeCustomerId),
    uniqueIndex("subscriptions_stripe_subscription_id_unique").on(table.stripeSubscriptionId)
  ]
);

export const userCommuteProfiles = sqliteTable(
  "user_commute_profiles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    homeAddress: text("home_address"),
    homeNearestStation: text("home_nearest_station"),
    preferredMaxCommuteMinutes: integer("preferred_max_commute_minutes"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    index("user_commute_profiles_user_id_idx").on(table.userId),
    uniqueIndex("user_commute_profiles_user_id_unique").on(table.userId)
  ]
);

export const resumeProfiles = sqliteTable(
  "resume_profiles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    templateName: text("template_name"),
    fullName: text("full_name"),
    furigana: text("furigana"),
    phone: text("phone"),
    email: text("email"),
    education: text("education"),
    experience: text("experience"),
    selfPr: text("self_pr"),
    motivation: text("motivation"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    index("resume_profiles_user_id_idx").on(table.userId),
    uniqueIndex("resume_profiles_user_id_unique").on(table.userId)
  ]
);

export const transitFeeds = sqliteTable(
  "transit_feeds",
  {
    id: text("id").primaryKey(),
    providerName: text("provider_name").notNull(),
    sourceUrl: text("source_url"),
    licenseNote: text("license_note"),
    region: text("region").notNull(),
    validFrom: text("valid_from"),
    validTo: text("valid_to"),
    fetchedAt: integer("fetched_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    index("transit_feeds_region_idx").on(table.region),
    index("transit_feeds_provider_name_idx").on(table.providerName)
  ]
);

export const transitStops = sqliteTable(
  "transit_stops",
  {
    id: text("id").primaryKey(),
    feedId: text("feed_id").notNull().references(() => transitFeeds.id, { onDelete: "cascade" }),
    stopId: text("stop_id").notNull(),
    stopName: text("stop_name").notNull(),
    stopLat: text("stop_lat"),
    stopLon: text("stop_lon"),
    parentStation: text("parent_station"),
    platformCode: text("platform_code"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    index("transit_stops_feed_id_idx").on(table.feedId),
    index("transit_stops_stop_name_idx").on(table.stopName),
    uniqueIndex("transit_stops_feed_stop_unique").on(table.feedId, table.stopId)
  ]
);

export const transitRoutes = sqliteTable(
  "transit_routes",
  {
    id: text("id").primaryKey(),
    feedId: text("feed_id").notNull().references(() => transitFeeds.id, { onDelete: "cascade" }),
    routeId: text("route_id").notNull(),
    routeShortName: text("route_short_name"),
    routeLongName: text("route_long_name"),
    routeDesc: text("route_desc"),
    routeType: integer("route_type"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    index("transit_routes_feed_id_idx").on(table.feedId),
    index("transit_routes_route_short_name_idx").on(table.routeShortName),
    uniqueIndex("transit_routes_feed_route_unique").on(table.feedId, table.routeId)
  ]
);

export const transitTrips = sqliteTable(
  "transit_trips",
  {
    id: text("id").primaryKey(),
    feedId: text("feed_id").notNull().references(() => transitFeeds.id, { onDelete: "cascade" }),
    tripId: text("trip_id").notNull(),
    routeId: text("route_id"),
    serviceId: text("service_id"),
    tripShortName: text("trip_short_name"),
    tripHeadsign: text("trip_headsign"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    index("transit_trips_feed_id_idx").on(table.feedId),
    index("transit_trips_route_id_idx").on(table.routeId),
    uniqueIndex("transit_trips_feed_trip_unique").on(table.feedId, table.tripId)
  ]
);

export const transitServices = sqliteTable(
  "transit_services",
  {
    id: text("id").primaryKey(),
    feedId: text("feed_id").notNull().references(() => transitFeeds.id, { onDelete: "cascade" }),
    serviceId: text("service_id").notNull(),
    monday: integer("monday", { mode: "boolean" }).notNull().default(false),
    tuesday: integer("tuesday", { mode: "boolean" }).notNull().default(false),
    wednesday: integer("wednesday", { mode: "boolean" }).notNull().default(false),
    thursday: integer("thursday", { mode: "boolean" }).notNull().default(false),
    friday: integer("friday", { mode: "boolean" }).notNull().default(false),
    saturday: integer("saturday", { mode: "boolean" }).notNull().default(false),
    sunday: integer("sunday", { mode: "boolean" }).notNull().default(false),
    startDate: text("start_date"),
    endDate: text("end_date"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    index("transit_services_feed_id_idx").on(table.feedId),
    index("transit_services_service_id_idx").on(table.serviceId),
    uniqueIndex("transit_services_feed_service_unique").on(table.feedId, table.serviceId)
  ]
);

export const transitServiceExceptions = sqliteTable(
  "transit_service_exceptions",
  {
    id: text("id").primaryKey(),
    feedId: text("feed_id").notNull().references(() => transitFeeds.id, { onDelete: "cascade" }),
    serviceId: text("service_id").notNull(),
    serviceDate: text("service_date").notNull(),
    exceptionType: integer("exception_type").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    index("transit_service_exceptions_feed_id_idx").on(table.feedId),
    index("transit_service_exceptions_service_date_idx").on(table.serviceDate),
    uniqueIndex("transit_service_exceptions_feed_service_date_unique").on(table.feedId, table.serviceId, table.serviceDate)
  ]
);

export const transitStopTimes = sqliteTable(
  "transit_stop_times",
  {
    id: text("id").primaryKey(),
    feedId: text("feed_id").notNull().references(() => transitFeeds.id, { onDelete: "cascade" }),
    tripId: text("trip_id").notNull(),
    stopId: text("stop_id").notNull(),
    arrivalTime: text("arrival_time"),
    departureTime: text("departure_time"),
    stopSequence: integer("stop_sequence").notNull(),
    stopHeadsign: text("stop_headsign"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    index("transit_stop_times_feed_id_idx").on(table.feedId),
    index("transit_stop_times_trip_id_idx").on(table.tripId),
    index("transit_stop_times_stop_id_idx").on(table.stopId),
    uniqueIndex("transit_stop_times_feed_trip_sequence_unique").on(table.feedId, table.tripId, table.stopSequence)
  ]
);

export const transitStationAliases = sqliteTable(
  "transit_station_aliases",
  {
    id: text("id").primaryKey(),
    normalizedName: text("normalized_name").notNull(),
    canonicalStopId: text("canonical_stop_id").notNull(),
    canonicalStopName: text("canonical_stop_name").notNull(),
    region: text("region"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    index("transit_station_aliases_normalized_name_idx").on(table.normalizedName),
    index("transit_station_aliases_region_idx").on(table.region),
    uniqueIndex("transit_station_aliases_name_stop_unique").on(table.normalizedName, table.canonicalStopId)
  ]
);



export const stripeWebhookEvents = sqliteTable(
  "stripe_webhook_events",
  {
    id: text("id").primaryKey(),
    stripeEventId: text("stripe_event_id").notNull().unique(),
    eventType: text("event_type").notNull(),
    processedAt: integer("processed_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [index("stripe_webhook_events_event_type_idx").on(table.eventType)]
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
    bonusSMinCount: integer("bonus_s_min_count").notNull().default(3),
    bonusAMinCount: integer("bonus_a_min_count").notNull().default(2),
    bonusBMinCount: integer("bonus_b_min_count").notNull().default(2),
    bonusCMinCount: integer("bonus_c_min_count").notNull().default(1),
    retirementWithAllowanceRank: text("retirement_with_allowance_rank").notNull().default("A"),
    retirementWithoutAllowanceRank: text("retirement_without_allowance_rank").notNull().default("D"),
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
    bonusSMinCount: integer("bonus_s_min_count").notNull().default(3),
    bonusAMinCount: integer("bonus_a_min_count").notNull().default(2),
    bonusBMinCount: integer("bonus_b_min_count").notNull().default(2),
    bonusCMinCount: integer("bonus_c_min_count").notNull().default(1),
    retirementWithAllowanceRank: text("retirement_with_allowance_rank").notNull().default("A"),
    retirementWithoutAllowanceRank: text("retirement_without_allowance_rank").notNull().default("D"),
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
    compareCount: integer("compare_count").notNull().default(0),
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
  commuteProfile: one(userCommuteProfiles),
  resumeProfile: one(resumeProfiles),
  criteriaTemplates: many(criteriaTemplates),
  savedCriteriaTemplates: many(savedCriteriaTemplates),
  usageCounters: many(usageCounters)
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  user: one(user, { fields: [jobs.userId], references: [user.id] }),
  analyses: many(jobAnalyses),
  statusEvents: many(jobStatusEvents)
}));

export const userCommuteProfilesRelations = relations(userCommuteProfiles, ({ one }) => ({
  user: one(user, { fields: [userCommuteProfiles.userId], references: [user.id] })
}));

export const resumeProfilesRelations = relations(resumeProfiles, ({ one }) => ({
  user: one(user, { fields: [resumeProfiles.userId], references: [user.id] })
}));

export const transitFeedsRelations = relations(transitFeeds, ({ many }) => ({
  stops: many(transitStops),
  routes: many(transitRoutes),
  trips: many(transitTrips),
  services: many(transitServices),
  serviceExceptions: many(transitServiceExceptions),
  stopTimes: many(transitStopTimes)
}));

export const transitStopsRelations = relations(transitStops, ({ one }) => ({
  feed: one(transitFeeds, { fields: [transitStops.feedId], references: [transitFeeds.id] })
}));

export const transitRoutesRelations = relations(transitRoutes, ({ one }) => ({
  feed: one(transitFeeds, { fields: [transitRoutes.feedId], references: [transitFeeds.id] })
}));

export const transitTripsRelations = relations(transitTrips, ({ one }) => ({
  feed: one(transitFeeds, { fields: [transitTrips.feedId], references: [transitFeeds.id] })
}));

export const transitServicesRelations = relations(transitServices, ({ one }) => ({
  feed: one(transitFeeds, { fields: [transitServices.feedId], references: [transitFeeds.id] })
}));

export const transitServiceExceptionsRelations = relations(transitServiceExceptions, ({ one }) => ({
  feed: one(transitFeeds, { fields: [transitServiceExceptions.feedId], references: [transitFeeds.id] })
}));

export const transitStopTimesRelations = relations(transitStopTimes, ({ one }) => ({
  feed: one(transitFeeds, { fields: [transitStopTimes.feedId], references: [transitFeeds.id] })
}));

export const analysesRelations = relations(jobAnalyses, ({ one }) => ({
  job: one(jobs, { fields: [jobAnalyses.jobId], references: [jobs.id] })
}));

export const statusEventsRelations = relations(jobStatusEvents, ({ one }) => ({
  job: one(jobs, { fields: [jobStatusEvents.jobId], references: [jobs.id] })
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
