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
    issuer: text("issuer").notNull(),
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
    uniqueIndex("account_issuer_account_unique").on(table.issuer, table.accountId)
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
    isFavorite: integer("is_favorite", { mode: "boolean" }).notNull().default(false),
    rawText: text("raw_text"),
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
    missingItemSummaryJson: text("missing_item_summary_json"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [index("job_analyses_job_id_idx").on(table.jobId)]
);

export const aiUsageEvents = sqliteTable(
  "ai_usage_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    provider: text("provider").notNull().default("openai"),
    model: text("model").notNull(),
    featureArea: text("feature_area").notNull(),
    actionKey: text("action_key").notNull(),
    sourceTable: text("source_table"),
    sourceId: text("source_id"),
    requestStatus: text("request_status").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    cachedInputTokens: integer("cached_input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    reasoningTokens: integer("reasoning_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    webSearchCalls: integer("web_search_calls").notNull().default(0),
    inputUnitPriceMicroUsdPer1m: integer("input_unit_price_micro_usd_per_1m"),
    cachedInputUnitPriceMicroUsdPer1m: integer("cached_input_unit_price_micro_usd_per_1m"),
    outputUnitPriceMicroUsdPer1m: integer("output_unit_price_micro_usd_per_1m"),
    toolCostMicroUsd: integer("tool_cost_micro_usd"),
    totalCostMicroUsd: integer("total_cost_micro_usd"),
    fxYenPerUsdMilli: integer("fx_yen_per_usd_milli"),
    totalCostMilliYen: integer("total_cost_milli_yen"),
    latencyMs: integer("latency_ms").notNull().default(0),
    priceVersion: text("price_version"),
    errorCode: text("error_code"),
    metadataJson: text("metadata_json").notNull().default("{}"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    index("ai_usage_events_created_at_idx").on(table.createdAt),
    index("ai_usage_events_user_created_at_idx").on(table.userId, table.createdAt),
    index("ai_usage_events_feature_created_at_idx").on(table.featureArea, table.createdAt),
    index("ai_usage_events_action_created_at_idx").on(table.actionKey, table.createdAt),
    index("ai_usage_events_model_created_at_idx").on(table.model, table.createdAt),
    index("ai_usage_events_status_created_at_idx").on(table.requestStatus, table.createdAt)
  ]
);

export const jobAnalysisFeedback = sqliteTable(
  "job_analysis_feedback",
  {
    id: text("id").primaryKey(),
    jobAnalysisId: text("job_analysis_id").notNull().references(() => jobAnalyses.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("open"),
    source: text("source").notNull().default("auto"),
    severity: text("severity").notNull(),
    failureTypesJson: text("failure_types_json").notNull(),
    summaryText: text("summary_text").notNull(),
    rawExcerpt: text("raw_excerpt"),
    userReasonCode: text("user_reason_code"),
    userNote: text("user_note"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    uniqueIndex("job_analysis_feedback_job_analysis_id_unique").on(table.jobAnalysisId),
    index("job_analysis_feedback_status_idx").on(table.status),
    index("job_analysis_feedback_created_at_idx").on(table.createdAt),
    index("job_analysis_feedback_severity_idx").on(table.severity)
  ]
);

export const marketingEvents = sqliteTable(
  "marketing_events",
  {
    id: text("id").primaryKey(),
    eventType: text("event_type").notNull(),
    page: text("page"),
    referrer: text("referrer"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    utmContent: text("utm_content"),
    utmTerm: text("utm_term"),
    ctaVariant: text("cta_variant"),
    currentStatus: text("current_status"),
    topProblemCategory: text("top_problem_category"),
    textLengthBucket: text("text_length_bucket"),
    totalRank: text("total_rank"),
    interviewOptIn: integer("interview_opt_in", { mode: "boolean" }),
    metadataJson: text("metadata_json"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    index("marketing_events_event_type_idx").on(table.eventType),
    index("marketing_events_created_at_idx").on(table.createdAt),
    index("marketing_events_utm_campaign_idx").on(table.utmCampaign)
  ]
);

export const betaIntakeSubmissions = sqliteTable(
  "beta_intake_submissions",
  {
    id: text("id").primaryKey(),
    contact: text("contact").notNull(),
    currentStatus: text("current_status").notNull(),
    topProblemCategory: text("top_problem_category").notNull(),
    topProblem: text("top_problem").notNull(),
    desiredJobCategory: text("desired_job_category"),
    jobsPerWeekBucket: text("jobs_per_week_bucket"),
    interviewOptIn: integer("interview_opt_in", { mode: "boolean" }).notNull().default(false),
    referrer: text("referrer"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    utmContent: text("utm_content"),
    utmTerm: text("utm_term"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    index("beta_intake_submissions_created_at_idx").on(table.createdAt),
    index("beta_intake_submissions_current_status_idx").on(table.currentStatus),
    index("beta_intake_submissions_top_problem_category_idx").on(table.topProblemCategory)
  ]
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

export const companyResearches = sqliteTable(
  "company_researches",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    query: text("query").notNull(),
    companyName: text("company_name").notNull(),
    industry: text("industry").notNull(),
    location: text("location").notNull(),
    size: text("size").notNull(),
    summary: text("summary").notNull(),
    keyPointsJson: text("key_points_json").notNull(),
    interviewHintsJson: text("interview_hints_json").notNull(),
    nextActionsJson: text("next_actions_json").notNull(),
    websiteUrl: text("website_url"),
    reportJson: text("report_json").notNull().default('{"companyName":"","generatedAt":"","estimatedPages":24,"estimatedFigures":18,"sections":[],"sources":[],"suggestedQuestions":[]}'),
    sourceChunksJson: text("source_chunks_json").notNull().default("[]"),
    chatMessagesJson: text("chat_messages_json").notNull().default("[]"),
    modelName: text("model_name"),
    sourceCount: integer("source_count").notNull().default(0),
    errorCode: text("error_code"),
    errorSummary: text("error_summary"),
    status: text("status").notNull().default("要点整理済み"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    index("company_researches_user_id_idx").on(table.userId),
    index("company_researches_created_at_idx").on(table.createdAt),
    index("company_researches_website_url_idx").on(table.websiteUrl)
  ]
);

export const aiInterviewAttempts = sqliteTable(
  "ai_interview_attempts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    questionId: text("question_id").notNull(),
    prompt: text("prompt").notNull(),
    answerText: text("answer_text").notNull(),
    score: integer("score").notNull(),
    strengthsJson: text("strengths_json").notNull(),
    improvementsJson: text("improvements_json").notNull(),
    followUpsJson: text("follow_ups_json").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    index("ai_interview_attempts_user_id_idx").on(table.userId),
    index("ai_interview_attempts_created_at_idx").on(table.createdAt),
    index("ai_interview_attempts_question_id_idx").on(table.questionId)
  ]
);

export const aiInterviewSessions = sqliteTable(
  "ai_interview_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    settingSetName: text("setting_set_name").notNull().default("基本セット"),
    interviewType: text("interview_type").notNull(),
    targetCompany: text("target_company").notNull(),
    targetRole: text("target_role").notNull().default("営業職"),
    scenarioType: text("scenario_type").notNull().default("new-grad"),
    questionSet: text("question_set").notNull(),
    startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    index("ai_interview_sessions_user_id_idx").on(table.userId),
    index("ai_interview_sessions_updated_at_idx").on(table.updatedAt)
  ]
);

export const aiInterviewRecordingSessions = sqliteTable(
  "ai_interview_recording_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    sessionId: text("session_id").references(() => aiInterviewSessions.id, { onDelete: "set null" }),
    questionId: text("question_id").notNull(),
    inputMethod: text("input_method").notNull().default("voice"),
    status: text("status").notNull().default("queued"),
    mimeType: text("mime_type").notNull(),
    durationMs: integer("duration_ms").notNull(),
    byteSize: integer("byte_size").notNull(),
    tempObjectKey: text("temp_object_key"),
    audioDeleteState: text("audio_delete_state").notNull().default("pending"),
    audioDeletedAt: integer("audio_deleted_at", { mode: "timestamp_ms" }),
    lastErrorCode: text("last_error_code"),
    lastErrorSummary: text("last_error_summary"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    index("ai_interview_recording_sessions_user_id_idx").on(table.userId),
    index("ai_interview_recording_sessions_session_id_idx").on(table.sessionId),
    index("ai_interview_recording_sessions_status_idx").on(table.status),
    index("ai_interview_recording_sessions_audio_delete_state_idx").on(table.audioDeleteState),
    index("ai_interview_recording_sessions_updated_at_idx").on(table.updatedAt)
  ]
);

export const aiInterviewTranscriptions = sqliteTable(
  "ai_interview_transcriptions",
  {
    id: text("id").primaryKey(),
    recordingSessionId: text("recording_session_id")
      .notNull()
      .references(() => aiInterviewRecordingSessions.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("faster-whisper"),
    modelName: text("model_name").notNull(),
    languageCode: text("language_code").notNull().default("ja"),
    rawTranscriptText: text("raw_transcript_text"),
    normalizedTranscriptText: text("normalized_transcript_text"),
    status: text("status").notNull().default("queued"),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    uniqueIndex("ai_interview_transcriptions_recording_session_unique").on(table.recordingSessionId),
    index("ai_interview_transcriptions_status_idx").on(table.status)
  ]
);

export const aiInterviewTranscriptionSegments = sqliteTable(
  "ai_interview_transcription_segments",
  {
    id: text("id").primaryKey(),
    transcriptionId: text("transcription_id")
      .notNull()
      .references(() => aiInterviewTranscriptions.id, { onDelete: "cascade" }),
    segmentIndex: integer("segment_index").notNull(),
    startMs: integer("start_ms").notNull(),
    endMs: integer("end_ms").notNull(),
    text: text("text").notNull(),
    avgLogprob: text("avg_logprob"),
    noSpeechProb: text("no_speech_prob"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [uniqueIndex("ai_interview_transcription_segments_unique").on(table.transcriptionId, table.segmentIndex)]
);

export const aiInterviewConfirmedAnswers = sqliteTable(
  "ai_interview_confirmed_answers",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull().references(() => aiInterviewSessions.id, { onDelete: "cascade" }),
    recordingSessionId: text("recording_session_id").references(() => aiInterviewRecordingSessions.id, { onDelete: "set null" }),
    questionId: text("question_id").notNull(),
    sourceKind: text("source_kind").notNull().default("text"),
    rawTranscriptTextSnapshot: text("raw_transcript_text_snapshot"),
    confirmedText: text("confirmed_text").notNull(),
    confirmedAt: integer("confirmed_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    index("ai_interview_confirmed_answers_user_id_idx").on(table.userId),
    index("ai_interview_confirmed_answers_session_id_idx").on(table.sessionId),
    index("ai_interview_confirmed_answers_question_id_idx").on(table.questionId)
  ]
);

export const aiInterviewGeneratedQuestions = sqliteTable(
  "ai_interview_generated_questions",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().references(() => aiInterviewSessions.id, { onDelete: "cascade" }),
    categoryId: text("category_id").notNull(),
    questionId: text("question_id").notNull(),
    questionNumber: integer("question_number").notNull(),
    prompt: text("prompt").notNull(),
    basedOnAnswerId: text("based_on_answer_id").references(() => aiInterviewSessionAnswers.id, { onDelete: "set null" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    index("ai_interview_generated_questions_session_id_idx").on(table.sessionId),
    uniqueIndex("ai_interview_generated_questions_session_question_unique").on(table.sessionId, table.questionId)
  ]
);

export const aiInterviewCategoryFeedbacks = sqliteTable(
  "ai_interview_category_feedbacks",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().references(() => aiInterviewSessions.id, { onDelete: "cascade" }),
    categoryId: text("category_id").notNull(),
    startQuestionNumber: integer("start_question_number").notNull(),
    endQuestionNumber: integer("end_question_number").notNull(),
    overallScore: integer("overall_score").notNull(),
    summaryText: text("summary_text").notNull(),
    strengthsJson: text("strengths_json").notNull(),
    improvementsJson: text("improvements_json").notNull(),
    nextFocusText: text("next_focus_text").notNull(),
    nextQuestionsJson: text("next_questions_json").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    index("ai_interview_category_feedbacks_session_id_idx").on(table.sessionId),
    uniqueIndex("ai_interview_category_feedbacks_session_category_unique").on(table.sessionId, table.categoryId)
  ]
);

export const aiInterviewSessionAnswers = sqliteTable(
  "ai_interview_session_answers",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().references(() => aiInterviewSessions.id, { onDelete: "cascade" }),
    confirmedAnswerId: text("confirmed_answer_id").references(() => aiInterviewConfirmedAnswers.id, { onDelete: "set null" }),
    recordingSessionId: text("recording_session_id").references(() => aiInterviewRecordingSessions.id, { onDelete: "set null" }),
    answerSourceKind: text("answer_source_kind").notNull().default("text"),
    questionId: text("question_id").notNull(),
    prompt: text("prompt").notNull(),
    answerText: text("answer_text").notNull(),
    score: integer("score").notNull(),
    strengthsJson: text("strengths_json").notNull(),
    improvementsJson: text("improvements_json").notNull(),
    followUpsJson: text("follow_ups_json").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    index("ai_interview_session_answers_session_id_idx").on(table.sessionId),
    index("ai_interview_session_answers_created_at_idx").on(table.createdAt),
    index("ai_interview_session_answers_confirmed_answer_id_idx").on(table.confirmedAnswerId)
  ]
);

export const aiInterviewRecordingConsents = sqliteTable(
  "ai_interview_recording_consents",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    recordingSessionId: text("recording_session_id")
      .notNull()
      .references(() => aiInterviewRecordingSessions.id, { onDelete: "cascade" }),
    policyVersion: text("policy_version").notNull(),
    consentTextHash: text("consent_text_hash").notNull(),
    consentedAt: integer("consented_at", { mode: "timestamp_ms" }).notNull(),
    ipHash: text("ip_hash"),
    userAgentHash: text("user_agent_hash"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [index("ai_interview_recording_consents_recording_session_id_idx").on(table.recordingSessionId)]
);

export const aiInterviewAudioDeletionLogs = sqliteTable(
  "ai_interview_audio_deletion_logs",
  {
    id: text("id").primaryKey(),
    recordingSessionId: text("recording_session_id")
      .notNull()
      .references(() => aiInterviewRecordingSessions.id, { onDelete: "cascade" }),
    attemptedAt: integer("attempted_at", { mode: "timestamp_ms" }).notNull(),
    actor: text("actor").notNull(),
    outcome: text("outcome").notNull(),
    detailCode: text("detail_code"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [index("ai_interview_audio_deletion_logs_recording_session_id_idx").on(table.recordingSessionId)]
);

export const userOnboardingProfiles = sqliteTable(
  "user_onboarding_profiles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    started: integer("started", { mode: "boolean" }).notNull().default(false),
    currentStep: integer("current_step").notNull().default(0),
    nickname: text("nickname"),
    applicantStatusJson: text("applicant_status_json").notNull().default("[]"),
    workStylesJson: text("work_styles_json").notNull().default("[]"),
    locationsJson: text("locations_json").notNull().default("[]"),
    commutePreference: text("commute_preference"),
    locationNote: text("location_note"),
    salaryPreference: text("salary_preference"),
    avoidConditionsJson: text("avoid_conditions_json").notNull().default("[]"),
    jobHuntingStatus: text("job_hunting_status"),
    priorityJson: text("priority_json").notNull().default("[]"),
    deferredRoles: integer("deferred_roles", { mode: "boolean" }).notNull().default(false),
    deferredSkills: integer("deferred_skills", { mode: "boolean" }).notNull().default(false),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    skippedAt: integer("skipped_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => [
    index("user_onboarding_profiles_user_id_idx").on(table.userId),
    uniqueIndex("user_onboarding_profiles_user_id_unique").on(table.userId)
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
    asOfDate: text("as_of_date"),
    fullName: text("full_name"),
    furigana: text("furigana"),
    gender: text("gender"),
    birthDate: text("birth_date"),
    currentAddress: text("current_address"),
    contactAddress: text("contact_address"),
    phone: text("phone"),
    email: text("email"),
    education: text("education"),
    experience: text("experience"),
    licenses: text("licenses"),
    selfPr: text("self_pr"),
    motivation: text("motivation"),
    desiredConditions: text("desired_conditions"),
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

export const jobAnalysisFeedbackRelations = relations(jobAnalysisFeedback, ({ one }) => ({
  analysis: one(jobAnalyses, { fields: [jobAnalysisFeedback.jobAnalysisId], references: [jobAnalyses.id] })
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
