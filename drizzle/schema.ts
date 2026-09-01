import { mysqlTable, mysqlSchema, AnyMySqlColumn, index, uniqueIndex, int, varchar, text, tinyint, timestamp, mysqlEnum, json, decimal, float, bigint, date } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const acceleratorAlumniCompanies = mysqlTable("accelerator_alumni_companies", {
	id: int().autoincrement().primaryKey(),
	acceleratorId: int("accelerator_id").notNull(),
	cohortId: int("cohort_id"),
	companyName: varchar("company_name", { length: 255 }).notNull(),
	sector: varchar({ length: 100 }),
	description: text(),
	country: varchar({ length: 100 }),
	city: varchar({ length: 100 }),
	logo: text(),
	website: text(),
	fundingRaised: varchar("funding_raised", { length: 100 }),
	fundingStage: varchar("funding_stage", { length: 50 }),
	employeeCount: int("employee_count"),
	foundedYear: int("founded_year"),
	founderName: varchar("founder_name", { length: 255 }),
	isActive: tinyint("is_active").default(1),
	linkedinUrl: text("linkedin_url"),
	sortOrder: int("sort_order").default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("acc_alumni_accel_id").on(table.acceleratorId),
	index("acc_alumni_cohort_id").on(table.cohortId),
]);

export const acceleratorBenefits = mysqlTable("accelerator_benefits", {
	id: int().autoincrement().primaryKey(),
	acceleratorId: int("accelerator_id").notNull(),
	category: varchar({ length: 100 }),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	icon: varchar({ length: 50 }),
	value: varchar({ length: 100 }),
	sortOrder: int("sort_order").default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("acc_benefits_accel_id").on(table.acceleratorId),
]);

export const acceleratorCohorts = mysqlTable("accelerator_cohorts", {
	id: int().autoincrement().primaryKey(),
	acceleratorId: int("accelerator_id").notNull(),
	cohortNumber: int("cohort_number").notNull(),
	name: varchar({ length: 255 }),
	year: int().notNull(),
	startDate: varchar("start_date", { length: 50 }),
	endDate: varchar("end_date", { length: 50 }),
	demoDayDate: varchar("demo_day_date", { length: 50 }),
	cohortSize: int("cohort_size"),
	applicationsReceived: int("applications_received"),
	acceptanceRate: varchar("acceptance_rate", { length: 20 }),
	status: mysqlEnum(['completed','active','upcoming']).default('completed'),
	theme: varchar({ length: 255 }),
	highlights: text(),
	totalFundingRaised: varchar("total_funding_raised", { length: 100 }),
	jobsCreated: int("jobs_created"),
	sortOrder: int("sort_order").default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("acc_cohorts_accel_id").on(table.acceleratorId),
]);

export const acceleratorDeckSubmissions = mysqlTable("accelerator_deck_submissions", {
	id: int().autoincrement().primaryKey(),
	acceleratorId: int("accelerator_id").notNull(),
	userId: int("user_id"),
	programId: int("program_id"),
	companyName: varchar("company_name", { length: 255 }).notNull(),
	contactName: varchar("contact_name", { length: 255 }).notNull(),
	contactEmail: varchar("contact_email", { length: 320 }).notNull(),
	fileUrl: text("file_url").notNull(),
	message: text(),
	status: mysqlEnum(['pending','reviewed','accepted','rejected']).default('pending'),
	submittedAt: timestamp("submitted_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("acc_deck_accel_id").on(table.acceleratorId),
]);

export const acceleratorFaqs = mysqlTable("accelerator_faqs", {
	id: int().autoincrement().primaryKey(),
	acceleratorId: int("accelerator_id").notNull(),
	question: text().notNull(),
	answer: text().notNull(),
	category: varchar({ length: 100 }),
	sortOrder: int("sort_order").default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("acc_faqs_accel_id").on(table.acceleratorId),
]);

export const acceleratorMilestones = mysqlTable("accelerator_milestones", {
	id: int().autoincrement().primaryKey(),
	acceleratorId: int("accelerator_id").notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	date: varchar({ length: 50 }),
	type: mysqlEnum(['launch','cohort','partnership','achievement','funding','expansion']).default('achievement'),
	sortOrder: int("sort_order").default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("acc_milestones_accel_id").on(table.acceleratorId),
]);

export const acceleratorPartners = mysqlTable("accelerator_partners", {
	id: int().autoincrement().primaryKey(),
	acceleratorId: int("accelerator_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	type: varchar({ length: 100 }),
	description: text(),
	logo: text(),
	website: text(),
	sinceYear: int("since_year"),
	sortOrder: int("sort_order").default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("acc_partners_accel_id").on(table.acceleratorId),
]);

export const acceleratorPrograms = mysqlTable("accelerator_programs", {
	id: int().autoincrement().primaryKey(),
	acceleratorId: int("accelerator_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	duration: varchar({ length: 100 }),
	format: mysqlEnum(['hybrid','in-person','virtual']).default('hybrid'),
	equityTaken: varchar("equity_taken", { length: 50 }),
	fundingProvided: varchar("funding_provided", { length: 100 }),
	nextDeadline: varchar("next_deadline", { length: 100 }),
	nextStartDate: varchar("next_start_date", { length: 100 }),
	status: mysqlEnum(['open','closed','upcoming']).default('upcoming'),
	eligibility: text(),
	applicationUrl: text("application_url"),
	phases: json(),
	weekByWeek: json("week_by_week"),
	sortOrder: int("sort_order").default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("acc_programs_accel_id").on(table.acceleratorId),
]);

export const acceleratorReminders = mysqlTable("accelerator_reminders", {
	id: int().autoincrement().primaryKey(),
	acceleratorId: int("accelerator_id").notNull(),
	programId: int("program_id"),
	userId: int("user_id"),
	email: varchar({ length: 320 }).notNull(),
	reminderType: mysqlEnum("reminder_type", ['application_open','deadline','program_start']).default('application_open'),
	isNotified: tinyint("is_notified").default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("acc_reminders_accel_id").on(table.acceleratorId),
]);

export const acceleratorStats = mysqlTable("accelerator_stats", {
	id: int().autoincrement().primaryKey(),
	acceleratorId: int("accelerator_id").notNull(),
	metricName: varchar("metric_name", { length: 100 }).notNull(),
	metricValue: varchar("metric_value", { length: 100 }).notNull(),
	metricLabel: varchar("metric_label", { length: 100 }),
	icon: varchar({ length: 50 }),
	category: varchar({ length: 50 }),
	sortOrder: int("sort_order").default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("acc_stats_accel_id").on(table.acceleratorId),
]);

export const acceleratorTeamMembers = mysqlTable("accelerator_team_members", {
	id: int().autoincrement().primaryKey(),
	acceleratorId: int("accelerator_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	title: varchar({ length: 255 }),
	bio: text(),
	photo: text(),
	linkedin: text(),
	twitter: text(),
	email: varchar({ length: 320 }),
	roleType: mysqlEnum("role_type", ['leadership','mentor','advisor','operations','partner']).default('operations'),
	sortOrder: int("sort_order").default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("acc_team_accel_id").on(table.acceleratorId),
]);

export const acceleratorTestimonials = mysqlTable("accelerator_testimonials", {
	id: int().autoincrement().primaryKey(),
	acceleratorId: int("accelerator_id").notNull(),
	quote: text().notNull(),
	authorName: varchar("author_name", { length: 255 }).notNull(),
	authorTitle: varchar("author_title", { length: 255 }),
	companyName: varchar("company_name", { length: 255 }),
	photo: text(),
	cohortNumber: int("cohort_number"),
	sortOrder: int("sort_order").default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("acc_testimonials_accel_id").on(table.acceleratorId),
]);

export const accelerators = mysqlTable("accelerators", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
	description: text(),
	shortDescription: text(),
	logo: text(),
	website: text(),
	location: varchar({ length: 255 }),
	regionId: int(),
	sectorId: int(),
	programLength: varchar({ length: 100 }),
	equity: varchar({ length: 100 }),
	funding: varchar({ length: 100 }),
	applicationDeadline: timestamp({ mode: 'string' }),
	programStartDate: timestamp({ mode: 'string' }),
	programEndDate: timestamp({ mode: 'string' }),
	benefits: text(),
	requirements: text(),
	applicationUrl: text(),
	status: mysqlEnum(['active','upcoming','completed','paused']).default('active'),
	isFeatured: tinyint().default(0),
	createdById: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	countryId: int(),
	geoRegionId: int(),
	cityId: int(),
	addressLine: text(),
	claimedByUserId: int(),
	statusId: int().default(1),
	facebook: text(),
	instagram: text(),
	linkedIn: text(),
	twitter: text(),
	email: varchar({ length: 320 }),
	alumniCompanies: json("alumni_companies"),
	batchCount: int("batch_count"),
	successStories: json("success_stories"),
	mission: text(),
	programDetails: json("program_details"),
	applicationProcess: text("application_process"),
	cohortSize: varchar("cohort_size", { length: 50 }),
	investmentRange: varchar("investment_range", { length: 100 }),
	equityTaken: varchar("equity_taken", { length: 50 }),
	successRate: varchar("success_rate", { length: 50 }),
	totalFunded: int("total_funded"),
	totalRaisedByAlumni: varchar("total_raised_by_alumni", { length: 100 }),
	avgFollowon: varchar("avg_followon", { length: 100 }),
	teamMembers: json("team_members"),
	partners: json(),
	notableAlumni: json("notable_alumni"),
	socialLinks: json("social_links"),
	contactEmail: varchar("contact_email", { length: 255 }),
	contactPhone: varchar("contact_phone", { length: 50 }),
	youtube: varchar({ length: 512 }),
	coverImage: varchar("cover_image", { length: 512 }),
	gallery: json(),
	nextCohortDate: varchar("next_cohort_date", { length: 100 }),
},
(table) => [
	uniqueIndex("accelerators_slug_unique").on(table.slug),
]);

export const adBlocklist = mysqlTable("ad_blocklist", {
	id: int().autoincrement().primaryKey(),
	type: mysqlEnum(['domain','keyword','category']).notNull(),
	value: varchar({ length: 255 }).notNull(),
	reason: text(),
	createdById: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
});

export const adCampaigns = mysqlTable("ad_campaigns", {
	id: int().autoincrement().primaryKey(),
	partnerId: int(),
	name: varchar({ length: 255 }).notNull(),
	campaignType: mysqlEnum(['direct','sponsorship','programmatic','house']).default('direct').notNull(),
	objective: mysqlEnum(['awareness','traffic','leads','conversions']).default('awareness'),
	budget: decimal({ precision: 15, scale: 2 }),
	budgetType: mysqlEnum(['total','daily']).default('total'),
	pricingModel: mysqlEnum(['cpm','cpc','cpa','flat']).default('cpm').notNull(),
	pricePerUnit: decimal({ precision: 10, scale: 4 }),
	targetSlots: json(),
	targetCategories: json(),
	targetGeos: json(),
	targetDevices: json(),
	startDate: timestamp({ mode: 'string' }).defaultNow().notNull(),
	endDate: timestamp({ mode: 'string' }),
	frequencyCap: int(),
	frequencyCapPeriod: mysqlEnum(['hour','day','week','month']),
	status: mysqlEnum(['draft','pending_approval','approved','active','paused','completed','rejected']).default('draft').notNull(),
	approvedById: int(),
	approvedAt: timestamp({ mode: 'string' }),
	impressions: int().default(0),
	clicks: int().default(0),
	conversions: int().default(0),
	spend: decimal({ precision: 15, scale: 2 }).default('0.00'),
	createdById: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const adClicks = mysqlTable("ad_clicks", {
	id: int().autoincrement().primaryKey(),
	impressionId: int().notNull(),
	campaignId: int().notNull(),
	creativeId: int().notNull(),
	clickUrl: text().notNull(),
	timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const adCreatives = mysqlTable("ad_creatives", {
	id: int().autoincrement().primaryKey(),
	campaignId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	format: mysqlEnum(['banner','native','video','text']).default('banner').notNull(),
	dimensions: varchar({ length: 32 }),
	fileUrl: text(),
	nativeHeadline: varchar({ length: 128 }),
	nativeDescription: text(),
	nativeImage: text(),
	nativeCta: varchar({ length: 32 }),
	clickUrl: text().notNull(),
	clickTrackingUrl: text(),
	impressionTrackingUrl: text(),
	status: mysqlEnum(['draft','pending_approval','approved','rejected']).default('draft').notNull(),
	approvedById: int(),
	approvedAt: timestamp({ mode: 'string' }),
	rejectionReason: text(),
	impressions: int().default(0),
	clicks: int().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const adFrequencyLog = mysqlTable("ad_frequency_log", {
	id: int().autoincrement().primaryKey(),
	campaignId: int().notNull(),
	creativeId: int().notNull(),
	sessionId: varchar({ length: 255 }),
	userId: int(),
	impressionCount: int().default(0),
	firstSeen: timestamp({ mode: 'string' }).defaultNow().notNull(),
	lastSeen: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("ad_freq_campaign_session").on(table.campaignId, table.sessionId),
]);

export const adImpressions = mysqlTable("ad_impressions", {
	id: int().autoincrement().primaryKey(),
	campaignId: int().notNull(),
	creativeId: int().notNull(),
	slotId: int().notNull(),
	sessionId: varchar({ length: 64 }),
	userId: int(),
	pageUrl: text(),
	ipAddress: varchar({ length: 45 }),
	userAgent: text(),
	countryCode: varchar({ length: 2 }),
	deviceType: varchar({ length: 32 }),
	timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const adSlots = mysqlTable("ad_slots", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 128 }).notNull(),
	slotKey: varchar({ length: 64 }).notNull(),
	pageType: varchar({ length: 64 }).notNull(),
	position: varchar({ length: 64 }).notNull(),
	dimensions: varchar({ length: 32 }),
	floorPrice: decimal({ precision: 10, scale: 2 }).default('0.00'),
	isPremium: tinyint().default(0),
	isActive: tinyint().default(1),
	adsenseSlotId: varchar({ length: 128 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	uniqueIndex("ad_slots_slotKey_unique").on(table.slotKey),
]);

export const adsenseSettings = mysqlTable("adsense_settings", {
	id: int().autoincrement().primaryKey(),
	publisherId: varchar({ length: 100 }),
	autoAdsEnabled: tinyint().default(0),
	adsenseEnabled: tinyint().default(0),
	adsTxtContent: text(),
	globalKillSwitch: tinyint().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
});

export const affiliateClicks = mysqlTable("affiliate_clicks", {
	id: int().autoincrement().primaryKey(),
	resourceId: int(),
	partnerId: int(),
	sessionId: varchar({ length: 64 }),
	userId: int(),
	pageUrl: text(),
	destinationUrl: text().notNull(),
	utmSource: varchar({ length: 128 }),
	utmMedium: varchar({ length: 128 }),
	utmCampaign: varchar({ length: 128 }),
	utmContent: varchar({ length: 128 }),
	ipAddress: varchar({ length: 45 }),
	userAgent: text(),
	referer: text(),
	countryCode: varchar({ length: 2 }),
	deviceType: varchar({ length: 32 }),
	clickedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const affiliateConversions = mysqlTable("affiliate_conversions", {
	id: int().autoincrement().primaryKey(),
	clickId: int(),
	resourceId: int(),
	partnerId: int(),
	conversionType: mysqlEnum(['signup','purchase','subscription','lead','download']).notNull(),
	orderId: varchar({ length: 128 }),
	amount: decimal({ precision: 15, scale: 2 }),
	currency: varchar({ length: 3 }).default('USD'),
	commissionAmount: decimal({ precision: 15, scale: 2 }),
	commissionCurrency: varchar({ length: 3 }).default('USD'),
	status: mysqlEnum(['pending','approved','rejected','paid']).default('pending').notNull(),
	approvedById: int(),
	approvedAt: timestamp({ mode: 'string' }),
	notes: text(),
	convertedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const aiAbTestVariants = mysqlTable("ai_ab_test_variants", {
	id: int().autoincrement().primaryKey(),
	testName: varchar("test_name", { length: 255 }).notNull(),
	sessionId: int("session_id"),
	articleId: int("article_id"),
	variantLabel: varchar("variant_label", { length: 64 }).notNull(),
	title: varchar({ length: 512 }),
	content: text(),
	metaDescription: varchar("meta_description", { length: 512 }),
	status: mysqlEnum(['draft','active','winner','loser','archived']).default('draft').notNull(),
	impressions: int().default(0),
	clicks: int().default(0),
	engagementScore: float("engagement_score"),
	avgTimeOnPage: float("avg_time_on_page"),
	bounceRate: float("bounce_rate"),
	conversionRate: float("conversion_rate"),
	startDate: timestamp("start_date", { mode: 'string' }),
	endDate: timestamp("end_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_ai_ab_test").on(table.testName),
	index("idx_ai_ab_article").on(table.articleId),
]);

export const aiAgentCrawlLog = mysqlTable("ai_agent_crawl_log", {
	id: int().autoincrement().primaryKey(),
	sourceId: int("source_id").notNull(),
	status: varchar({ length: 32 }).notNull(),
	articlesFound: int("articles_found").default(0),
	articlesNew: int("articles_new").default(0),
	articlesDuplicate: int("articles_duplicate").default(0),
	articlesRelevant: int("articles_relevant").default(0),
	articlesGenerated: int("articles_generated").default(0),
	durationMs: int("duration_ms"),
	errorMessage: text("error_message"),
	crawlData: json("crawl_data"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_ai_crawl_source").on(table.sourceId),
	index("idx_ai_crawl_created_at").on(table.createdAt),
]);

export const aiAgentDiscoveredArticles = mysqlTable("ai_agent_discovered_articles", {
	id: int().autoincrement().primaryKey(),
	sourceId: int("source_id").notNull(),
	crawlLogId: int("crawl_log_id"),
	externalUrl: text("external_url").notNull(),
	externalTitle: varchar("external_title", { length: 512 }),
	externalExcerpt: text("external_excerpt"),
	externalContent: text("external_content"),
	externalPublishedAt: timestamp("external_published_at", { mode: 'string' }),
	externalAuthor: varchar("external_author", { length: 255 }),
	externalImageUrl: text("external_image_url"),
	relevanceScore: int("relevance_score"),
	relevanceReason: text("relevance_reason"),
	isDuplicate: tinyint("is_duplicate").default(0),
	duplicateOfId: int("duplicate_of_id"),
	fingerprint: varchar({ length: 64 }),
	status: varchar({ length: 32 }).default('discovered').notNull(),
	generationSessionId: int("generation_session_id"),
	articleId: int("article_id"),
	processedAt: timestamp("processed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	channelType: mysqlEnum("channel_type", ['rss','atom','linkedin','whatsapp','twitter','email','scrape','api']).default('rss'),
	editorialTier: tinyint("editorial_tier"),
	category: varchar({ length: 128 }),
	menaEntities: json("mena_entities"),
	fundingSignal: json("funding_signal"),
	llmReasoning: text("llm_reasoning"),
	suggestedAngle: varchar("suggested_angle", { length: 512 }),
	stage1Score: int("stage1_score"),
	stage2Score: int("stage2_score"),
	stage3Adjustment: int("stage3_adjustment").default(0),
	contentLanguage: varchar("content_language", { length: 8 }).default('en'),
	translatedTitle: varchar("translated_title", { length: 512 }),
	translatedExcerpt: text("translated_excerpt"),
	editorialFeedback: mysqlEnum("editorial_feedback", ['accepted','accepted_edited','rejected']),
	feedbackAt: timestamp("feedback_at", { mode: 'string' }),
	autoGenerated: tinyint("auto_generated").default(0),
	llmProviderUsed: varchar("llm_provider_used", { length: 32 }),
	llmConfidence: int("llm_confidence"),
},
(table) => [
	index("idx_ai_discovered_source").on(table.sourceId),
	index("idx_ai_discovered_status").on(table.status),
	index("idx_ai_discovered_relevance").on(table.relevanceScore),
	index("idx_ai_discovered_fingerprint").on(table.fingerprint),
	index("idx_ai_discovered_created_at").on(table.createdAt),
]);

export const aiAgentEditorialFeedback = mysqlTable("ai_agent_editorial_feedback", {
	id: int().autoincrement().primaryKey(),
	discoveredArticleId: int("discovered_article_id").notNull(),
	articleId: int("article_id"),
	action: mysqlEnum(['generated','published','published_edited','rejected','dismissed','flagged']).notNull(),
	editorId: int("editor_id"),
	editDistance: int("edit_distance"),
	feedbackFeatures: json("feedback_features"),
	sourceId: int("source_id"),
	taxonomyCategory: varchar("taxonomy_category", { length: 128 }),
	relevanceScore: int("relevance_score"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => [
	index("idx_ai_feedback_discovered").on(table.discoveredArticleId),
	index("idx_ai_feedback_action").on(table.action),
	index("idx_ai_feedback_source").on(table.sourceId),
	index("idx_ai_feedback_editor").on(table.editorId),
	index("idx_ai_feedback_created_at").on(table.createdAt),
]);

export const aiAgentEntities = mysqlTable("ai_agent_entities", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	nameAr: varchar("name_ar", { length: 255 }),
	nameUr: varchar("name_ur", { length: 255 }),
	type: mysqlEnum(['company','person','investor','fund','city','country','government_body','event','university','accelerator']).notNull(),
	tier: tinyint().default(2).notNull(),
	country: varchar({ length: 64 }),
	sector: varchar({ length: 128 }),
	aliases: json(),
	mentionCount: int("mention_count").default(0),
	lastSeenAt: timestamp("last_seen_at", { mode: 'string' }),
	metadata: json(),
	isActive: tinyint("is_active").default(1),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_ai_entities_type").on(table.type),
	index("idx_ai_entities_tier").on(table.tier),
	index("idx_ai_entities_country").on(table.country),
	index("idx_ai_entities_name").on(table.name),
	index("idx_ai_entities_active").on(table.isActive),
]);

export const aiAgentKeywords = mysqlTable("ai_agent_keywords", {
	id: int().autoincrement().primaryKey(),
	keyword: varchar({ length: 255 }).notNull(),
	language: varchar({ length: 8 }).default('en').notNull(),
	weight: int().default(1).notNull(),
	category: varchar({ length: 128 }),
	keywordType: mysqlEnum("keyword_type", ['mena_entity','funding_signal','sector','geography','person','event','suppress']).default('mena_entity').notNull(),
	isActive: tinyint("is_active").default(1),
	matchCount: int("match_count").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_ai_keywords_type").on(table.keywordType),
	index("idx_ai_keywords_language").on(table.language),
	index("idx_ai_keywords_active").on(table.isActive),
	index("idx_ai_keywords_keyword").on(table.keyword),
]);

export const aiAgentLlmProviders = mysqlTable("ai_agent_llm_providers", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 64 }).notNull(),
	displayName: varchar("display_name", { length: 128 }).notNull(),
	isEnabled: tinyint("is_enabled").default(1),
	priority: int().default(1),
	modelId: varchar("model_id", { length: 128 }),
	monthlyBudgetUsd: int("monthly_budget_usd").default(50),
	currentMonthSpendCents: int("current_month_spend_cents").default(0),
	totalTokensUsed: int("total_tokens_used").default(0),
	consecutiveFailures: int("consecutive_failures").default(0),
	lastFailureAt: timestamp("last_failure_at", { mode: 'string' }),
	apiKeyMasked: varchar("api_key_masked", { length: 64 }),
	rateLimit: int("rate_limit").default(60),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_ai_llm_providers_enabled").on(table.isEnabled),
	index("idx_ai_llm_providers_priority").on(table.priority),
]);

export const aiAgentSources = mysqlTable("ai_agent_sources", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	url: text().notNull(),
	feedUrl: text("feed_url"),
	feedType: varchar("feed_type", { length: 32 }).default('rss'),
	scrapingConfig: json("scraping_config"),
	isActive: tinyint("is_active").default(1),
	crawlIntervalMinutes: int("crawl_interval_minutes").default(120),
	lastCrawledAt: timestamp("last_crawled_at", { mode: 'string' }),
	lastSuccessAt: timestamp("last_success_at", { mode: 'string' }),
	consecutiveFailures: int("consecutive_failures").default(0),
	totalArticlesFound: int("total_articles_found").default(0),
	totalArticlesPublished: int("total_articles_published").default(0),
	relevanceThreshold: int("relevance_threshold").default(70),
	autoPublish: tinyint("auto_publish").default(0),
	defaultCategoryId: int("default_category_id"),
	defaultPolicyId: int("default_policy_id"),
	defaultTemplateId: int("default_template_id"),
	priority: int().default(5),
	notes: text(),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	channelType: mysqlEnum("channel_type", ['rss','atom','linkedin','whatsapp','twitter','email','scrape','api']).default('rss'),
	editorialBrief: text("editorial_brief"),
	mustWatchKeywords: json("must_watch_keywords"),
	ignoreKeywords: json("ignore_keywords"),
	maxAgeHours: int("max_age_hours"),
	acceptanceRate: int("acceptance_rate").default(0),
	authorityScore: int("authority_score").default(50),
	autoGenerateEnabled: tinyint("auto_generate_enabled").default(0),
	language: varchar({ length: 8 }).default('en'),
	llmProviderOverride: varchar("llm_provider_override", { length: 32 }),
	tags: json(),
	targetAcceptanceRate: int("target_acceptance_rate").default(40),
	targetDailyRelevant: int("target_daily_relevant").default(3),
},
(table) => [
	index("idx_ai_sources_active").on(table.isActive),
	index("idx_ai_sources_last_crawled").on(table.lastCrawledAt),
]);

export const aiAgentTaxonomy = mysqlTable("ai_agent_taxonomy", {
	id: int().autoincrement().primaryKey(),
	tier: tinyint().notNull(),
	name: varchar({ length: 128 }).notNull(),
	description: text(),
	signalKeywordsEn: json("signal_keywords_en"),
	signalKeywordsAr: json("signal_keywords_ar"),
	autoGenerateEligible: tinyint("auto_generate_eligible").default(0),
	autoGenerateThreshold: int("auto_generate_threshold").default(85),
	sortOrder: int("sort_order").default(0),
	isActive: tinyint("is_active").default(1),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_ai_taxonomy_tier").on(table.tier),
	index("idx_ai_taxonomy_active").on(table.isActive),
]);

export const aiApiKeys = mysqlTable("ai_api_keys", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	keyHash: varchar("key_hash", { length: 255 }).notNull(),
	keyPrefix: varchar("key_prefix", { length: 16 }).notNull(),
	permissions: json(),
	rateLimit: int("rate_limit").default(100),
	rateLimitWindow: int("rate_limit_window").default(3600),
	isActive: tinyint("is_active").default(1).notNull(),
	lastUsedAt: timestamp("last_used_at", { mode: 'string' }),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	totalRequests: int("total_requests").default(0),
	createdById: int("created_by_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const aiBatchJobs = mysqlTable("ai_batch_jobs", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	status: mysqlEnum(['pending','running','completed','failed','cancelled']).default('pending').notNull(),
	totalItems: int("total_items").default(0),
	completedItems: int("completed_items").default(0),
	failedItems: int("failed_items").default(0),
	provider: varchar({ length: 64 }),
	model: varchar({ length: 128 }),
	policyId: int("policy_id"),
	templateId: int("template_id"),
	items: json(),
	createdById: int("created_by_id"),
	startedAt: timestamp("started_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const aiCompetitorArticles = mysqlTable("ai_competitor_articles", {
	id: int().autoincrement().primaryKey(),
	sourceId: int("source_id").notNull(),
	title: varchar({ length: 512 }).notNull(),
	url: text().notNull(),
	summary: text(),
	publishedAt: timestamp("published_at", { mode: 'string' }),
	topics: json(),
	entities: json(),
	hasOurCoverage: tinyint("has_our_coverage").default(0),
	ourArticleId: int("our_article_id"),
	coverageGap: tinyint("coverage_gap").default(0),
	relevanceScore: float("relevance_score"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_ai_comp_source").on(table.sourceId),
	index("idx_ai_comp_gap").on(table.coverageGap),
]);

export const aiCompetitorSources = mysqlTable("ai_competitor_sources", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	url: text().notNull(),
	feedUrl: text("feed_url"),
	sourceType: mysqlEnum("source_type", ['rss','web','api']).default('rss').notNull(),
	isActive: tinyint("is_active").default(1).notNull(),
	crawlIntervalMinutes: int("crawl_interval_minutes").default(120),
	lastCrawledAt: timestamp("last_crawled_at", { mode: 'string' }),
	totalArticles: int("total_articles").default(0),
	coverageScore: float("coverage_score"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const aiContentCalendar = mysqlTable("ai_content_calendar", {
	id: int().autoincrement().primaryKey(),
	sessionId: int("session_id"),
	articleId: int("article_id"),
	title: varchar({ length: 512 }).notNull(),
	contentType: varchar("content_type", { length: 64 }).default('article').notNull(),
	scheduledDate: timestamp("scheduled_date", { mode: 'string' }).notNull(),
	scheduledTime: varchar("scheduled_time", { length: 10 }),
	status: mysqlEnum(['planned','generating','generated','review','approved','published','failed','cancelled']).default('planned').notNull(),
	assignedTo: int("assigned_to"),
	notes: text(),
	priority: mysqlEnum(['low','medium','high','urgent']).default('medium').notNull(),
	tags: json(),
	createdById: int("created_by_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_ai_calendar_date").on(table.scheduledDate),
	index("idx_ai_calendar_status").on(table.status),
]);

export const aiContentTemplates = mysqlTable("ai_content_templates", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
	description: text(),
	contentType: varchar("content_type", { length: 64 }).notNull(),
	articleType: varchar("article_type", { length: 64 }),
	templatePrompt: text("template_prompt").notNull(),
	outputSchema: json("output_schema"),
	requiredInputs: json("required_inputs"),
	exampleOutput: text("example_output"),
	policyId: int("policy_id"),
	isActive: tinyint("is_active").default(1),
	usageCount: int("usage_count").default(0),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_ai_templates_content_type").on(table.contentType),
	index("idx_ai_templates_slug").on(table.slug),
]);

export const aiContentVersions = mysqlTable("ai_content_versions", {
	id: int().autoincrement().primaryKey(),
	sessionId: int("session_id"),
	articleId: int("article_id"),
	versionNumber: int("version_number").default(1).notNull(),
	title: varchar({ length: 512 }),
	content: text(),
	source: mysqlEnum(['ai_generated','ai_rewritten','ai_enhanced','human_edited','published']).default('ai_generated').notNull(),
	modelUsed: varchar("model_used", { length: 128 }),
	diff: text(),
	createdById: int("created_by_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_ai_ver_session").on(table.sessionId),
	index("idx_ai_ver_article").on(table.articleId),
]);

export const aiEditorialPolicies = mysqlTable("ai_editorial_policies", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
	description: text(),
	contentType: varchar("content_type", { length: 64 }).notNull(),
	rules: json().notNull(),
	isDefault: tinyint("is_default").default(0),
	isActive: tinyint("is_active").default(1),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_ai_policies_content_type").on(table.contentType),
	index("idx_ai_policies_slug").on(table.slug),
]);

export const aiEntityAliases = mysqlTable("ai_entity_aliases", {
	id: int().autoincrement().primaryKey(),
	entityType: varchar("entity_type", { length: 64 }).notNull(),
	entityId: int("entity_id").notNull(),
	alias: varchar({ length: 512 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_ai_aliases_entity").on(table.entityType, table.entityId),
	index("idx_ai_aliases_alias").on(table.alias),
]);

export const aiEntityExtractions = mysqlTable("ai_entity_extractions", {
	id: int().autoincrement().primaryKey(),
	sessionId: int("session_id").notNull(),
	entityType: varchar("entity_type", { length: 64 }).notNull(),
	extractedName: varchar("extracted_name", { length: 512 }).notNull(),
	extractedData: json("extracted_data"),
	confidence: varchar({ length: 16 }).default('medium'),
	matchStatus: varchar("match_status", { length: 32 }).default('pending'),
	matchedEntityId: int("matched_entity_id"),
	mentionType: varchar("mention_type", { length: 32 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_ai_extractions_session").on(table.sessionId),
	index("idx_ai_extractions_entity_type").on(table.entityType),
	index("idx_ai_extractions_match_status").on(table.matchStatus),
]);

export const aiGenerationSessions = mysqlTable("ai_generation_sessions", {
	id: int().autoincrement().primaryKey(),
	sessionType: varchar("session_type", { length: 64 }).notNull(),
	contentType: varchar("content_type", { length: 64 }).notNull(),
	status: varchar({ length: 32 }).default('pending').notNull(),
	inputTitle: text("input_title"),
	inputUrl: text("input_url"),
	inputText: text("input_text"),
	inputData: json("input_data"),
	templateId: int("template_id"),
	policyId: int("policy_id"),
	llmProvider: varchar("llm_provider", { length: 32 }),
	llmModel: varchar("llm_model", { length: 64 }),
	generatedContent: text("generated_content"),
	generatedTitle: varchar("generated_title", { length: 512 }),
	generatedExcerpt: text("generated_excerpt"),
	generatedSeoTitle: varchar("generated_seo_title", { length: 512 }),
	generatedSeoDescription: text("generated_seo_description"),
	generatedImageUrl: text("generated_image_url"),
	generatedImageAlt: text("generated_image_alt"),
	generatedData: json("generated_data"),
	articleId: int("article_id"),
	entityId: int("entity_id"),
	entityType: varchar("entity_type", { length: 64 }),
	agentSourceId: int("agent_source_id"),
	generationTimeMs: int("generation_time_ms"),
	tokenCount: int("token_count"),
	estimatedCost: varchar("estimated_cost", { length: 32 }),
	approvalStatus: varchar("approval_status", { length: 32 }).default('pending'),
	approvedBy: int("approved_by"),
	approvalNotes: text("approval_notes"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	createdBy: int("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_ai_sessions_status").on(table.status),
	index("idx_ai_sessions_content_type").on(table.contentType),
	index("idx_ai_sessions_approval").on(table.approvalStatus),
	index("idx_ai_sessions_created_at").on(table.createdAt),
	index("idx_ai_sessions_article_id").on(table.articleId),
	index("idx_ai_sessions_agent_source").on(table.agentSourceId),
]);

export const aiLlmUsageLogs = mysqlTable("ai_llm_usage_logs", {
	id: int().autoincrement().primaryKey(),
	sessionId: int("session_id"),
	provider: varchar({ length: 32 }).notNull(),
	model: varchar({ length: 64 }).notNull(),
	operation: varchar({ length: 64 }).notNull(),
	inputTokens: int("input_tokens").default(0),
	outputTokens: int("output_tokens").default(0),
	totalTokens: int("total_tokens").default(0),
	latencyMs: int("latency_ms"),
	estimatedCostUsd: varchar("estimated_cost_usd", { length: 32 }),
	success: tinyint().default(1),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_ai_usage_provider").on(table.provider),
	index("idx_ai_usage_session").on(table.sessionId),
	index("idx_ai_usage_created_at").on(table.createdAt),
	index("idx_ai_usage_operation").on(table.operation),
]);

export const aiPlagiarismChecks = mysqlTable("ai_plagiarism_checks", {
	id: int().autoincrement().primaryKey(),
	sessionId: int("session_id"),
	articleId: int("article_id"),
	originalityScore: float("originality_score"),
	totalSentences: int("total_sentences"),
	flaggedSentences: int("flagged_sentences"),
	matches: json(),
	status: mysqlEnum(['pending','checking','clean','flagged','error']).default('pending').notNull(),
	checkedAt: timestamp("checked_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_ai_plag_session").on(table.sessionId),
]);

export const aiRevenueAttribution = mysqlTable("ai_revenue_attribution", {
	id: int().autoincrement().primaryKey(),
	articleId: int("article_id").notNull(),
	sessionId: int("session_id"),
	date: timestamp({ mode: 'string' }).notNull(),
	pageViews: int("page_views").default(0),
	uniqueVisitors: int("unique_visitors").default(0),
	adImpressions: int("ad_impressions").default(0),
	adClicks: int("ad_clicks").default(0),
	adRevenue: float("ad_revenue"),
	affiliateClicks: int("affiliate_clicks").default(0),
	affiliateRevenue: float("affiliate_revenue"),
	totalRevenue: float("total_revenue"),
	costToGenerate: float("cost_to_generate"),
	roi: float(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_ai_rev_article").on(table.articleId),
	index("idx_ai_rev_date").on(table.date),
]);

export const aiSocialPosts = mysqlTable("ai_social_posts", {
	id: int().autoincrement().primaryKey(),
	sessionId: int("session_id"),
	articleId: int("article_id"),
	platform: mysqlEnum(['twitter','linkedin','facebook','instagram','threads']).notNull(),
	content: text().notNull(),
	hashtags: json(),
	mediaUrl: text("media_url"),
	scheduledAt: timestamp("scheduled_at", { mode: 'string' }),
	publishedAt: timestamp("published_at", { mode: 'string' }),
	status: mysqlEnum(['draft','scheduled','published','failed']).default('draft').notNull(),
	engagement: json(),
	createdById: int("created_by_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_ai_social_article").on(table.articleId),
	index("idx_ai_social_platform").on(table.platform),
]);

export const aiToneAnalysis = mysqlTable("ai_tone_analysis", {
	id: int().autoincrement().primaryKey(),
	sessionId: int("session_id"),
	articleId: int("article_id"),
	overallTone: varchar("overall_tone", { length: 64 }),
	readabilityScore: float("readability_score"),
	fleschKincaid: float("flesch_kincaid"),
	sentimentScore: float("sentiment_score"),
	sentimentLabel: varchar("sentiment_label", { length: 32 }),
	wordCount: int("word_count"),
	avgSentenceLength: float("avg_sentence_length"),
	passiveVoicePercent: float("passive_voice_percent"),
	toneBreakdown: json("tone_breakdown"),
	suggestions: json(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_ai_tone_session").on(table.sessionId),
]);

export const aiWebhookConfigs = mysqlTable("ai_webhook_configs", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	url: text().notNull(),
	secret: varchar({ length: 255 }),
	events: json().notNull(),
	isActive: tinyint("is_active").default(1).notNull(),
	headers: json(),
	lastTriggeredAt: timestamp("last_triggered_at", { mode: 'string' }),
	failureCount: int("failure_count").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const aiWebhookLogs = mysqlTable("ai_webhook_logs", {
	id: int().autoincrement().primaryKey(),
	webhookId: int("webhook_id").notNull(),
	event: varchar({ length: 128 }).notNull(),
	payload: json(),
	responseStatus: int("response_status"),
	responseBody: text("response_body"),
	success: tinyint().default(0).notNull(),
	durationMs: int("duration_ms"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_ai_wh_log_webhook").on(table.webhookId),
]);

export const articleAccelerators = mysqlTable("article_accelerators", {
	id: int().autoincrement().primaryKey(),
	articleId: int().notNull(),
	acceleratorId: int().notNull(),
	mentionType: mysqlEnum(['primary','mentioned','interview','investor_in_round','partner','speaker','sponsor']).default('mentioned').notNull(),
	createdById: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_article_accelerators_article").on(table.articleId),
	index("idx_article_accelerators_acceleratorid").on(table.acceleratorId),
]);

export const articleCategories = mysqlTable("article_categories", {
	articleId: int().notNull(),
	categoryId: int().notNull(),
},
(table) => [
	index("idx_article_categories_article").on(table.articleId),
	index("idx_article_categories_categoryid").on(table.categoryId),
]);

export const articleEditorialBatches = mysqlTable("article_editorial_batches", {
	id: int().autoincrement().primaryKey(),
	batchId: int().notNull(),
	articleId: int().notNull(),
	sequence: int().notNull(),
	sourceCandidateId: varchar({ length: 32 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	uniqueIndex("article_editorial_batches_article_unique").on(table.articleId),
	uniqueIndex("article_editorial_batches_sequence_unique").on(table.batchId, table.sequence),
	index("idx_article_editorial_batches_batch").on(table.batchId),
]);

export const articleCompanies = mysqlTable("article_companies", {
	id: int().autoincrement().primaryKey(),
	articleId: int().notNull(),
	companyId: int().notNull(),
	mentionType: mysqlEnum(['primary','mentioned','interview','investor_in_round','partner','speaker','sponsor']).default('mentioned').notNull(),
	createdById: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_article_companies_article").on(table.articleId),
	index("idx_article_companies_companyid").on(table.companyId),
]);

export const articleEarnings = mysqlTable("article_earnings", {
	id: int().autoincrement().primaryKey(),
	articleId: int().notNull(),
	writerId: int().notNull(),
	periodMonth: varchar({ length: 7 }).notNull(),
	pageviews: int().default(0),
	directAdRevenue: decimal({ precision: 15, scale: 2 }).default('0.00'),
	adsenseRevenueEstimated: decimal({ precision: 15, scale: 2 }).default('0.00'),
	affiliateRevenue: decimal({ precision: 15, scale: 2 }).default('0.00'),
	totalRevenue: decimal({ precision: 15, scale: 2 }).default('0.00'),
	writerShare: decimal({ precision: 15, scale: 2 }).default('0.00'),
	status: mysqlEnum(['pending','calculated','paid']).default('pending').notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_article_earnings_article").on(table.articleId),
	index("idx_article_earnings_writerid").on(table.writerId),
]);

export const articleEvents = mysqlTable("article_events", {
	id: int().autoincrement().primaryKey(),
	articleId: int().notNull(),
	eventId: int().notNull(),
	mentionType: mysqlEnum(['primary','mentioned','interview','investor_in_round','partner','speaker','sponsor']).default('mentioned').notNull(),
	createdById: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_article_events_article").on(table.articleId),
	index("idx_article_events_eventid").on(table.eventId),
]);

export const articleInvestors = mysqlTable("article_investors", {
	id: int().autoincrement().primaryKey(),
	articleId: int().notNull(),
	investorId: int().notNull(),
	mentionType: mysqlEnum(['primary','mentioned','interview','investor_in_round','partner','speaker','sponsor']).default('mentioned').notNull(),
	createdById: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_article_investors_article").on(table.articleId),
	index("idx_article_investors_investorid").on(table.investorId),
]);

export const articleKeywords = mysqlTable("article_keywords", {
	id: int().autoincrement().primaryKey(),
	articleId: int().notNull(),
	keywordId: int().notNull(),
	keywordType: mysqlEnum(['focus','additional']).default('additional'),
	sortOrder: int().default(0),
},
(table) => [
	index("idx_article_keywords_article").on(table.articleId),
	index("idx_article_keywords_keywordid").on(table.keywordId),
]);

export const articleLocations = mysqlTable("article_locations", {
	id: int().autoincrement().primaryKey(),
	articleId: int().notNull(),
	country: varchar({ length: 2 }).notNull(),
	region: varchar({ length: 10 }),
	city: varchar({ length: 255 }),
	createdById: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_article_locations_article").on(table.articleId),
	index("idx_article_locations_country").on(table.country),
]);

export const articlePeople = mysqlTable("article_people", {
	id: int().autoincrement().primaryKey(),
	articleId: int().notNull(),
	personId: int().notNull(),
	mentionType: mysqlEnum(['primary','mentioned','interview','investor_in_round','partner','speaker','sponsor']).default('mentioned').notNull(),
	createdById: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_article_people_article").on(table.articleId),
	index("idx_article_people_personid").on(table.personId),
]);

export const articleRegions = mysqlTable("article_regions", {
	articleId: int().notNull(),
	regionId: int().notNull(),
},
(table) => [
	index("idx_article_regions_article").on(table.articleId),
	index("idx_article_regions_regionid").on(table.regionId),
]);

export const articleRelatedEntities = mysqlTable("article_related_entities", {
	id: int().autoincrement().primaryKey(),
	articleId: int().notNull(),
	entityType: varchar({ length: 64 }).notNull(),
	entityId: int().notNull(),
	sortOrder: int().default(0),
},
(table) => [
	index("idx_article_related_entities_article").on(table.articleId),
	index("idx_article_related_entities_entity").on(table.entityType, table.entityId),
]);

export const articleSectors = mysqlTable("article_sectors", {
	articleId: int().notNull(),
	sectorId: int().notNull(),
},
(table) => [
	index("idx_article_sectors_article").on(table.articleId),
	index("idx_article_sectors_sectorid").on(table.sectorId),
]);

export const articleSourceReferences = mysqlTable("article_source_references", {
	id: int().autoincrement().primaryKey(),
	articleId: int().notNull(),
	sourceType: mysqlEnum(['primary','supporting']).default('supporting').notNull(),
	title: varchar({ length: 512 }),
	url: text().notNull(),
	publisher: varchar({ length: 255 }),
	publishedAt: timestamp({ mode: 'string' }),
	sortOrder: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_article_source_references_article").on(table.articleId),
	index("idx_article_source_references_type").on(table.articleId, table.sourceType),
]);

export const articleTags = mysqlTable("article_tags", {
	articleId: int().notNull(),
	tagId: int().notNull(),
},
(table) => [
	index("idx_article_tags_article").on(table.articleId),
	index("idx_article_tags_tagid").on(table.tagId),
]);

export const articleTopics = mysqlTable("article_topics", {
	articleId: int().notNull(),
	topicId: int().notNull(),
},
(table) => [
	index("idx_article_topics_article").on(table.articleId),
	index("idx_article_topics_topicid").on(table.topicId),
]);

export const articles = mysqlTable("articles", {
	id: int().autoincrement().primaryKey(),
	title: varchar({ length: 512 }).notNull(),
	slug: varchar({ length: 512 }).notNull(),
	excerpt: text(),
	content: text(),
	featuredImageId: int(),
	authorId: int().notNull(),
	statusId: int().notNull(),
	isFeatured: tinyint().default(0),
	isTrending: tinyint().default(0),
	viewCount: int().default(0),
	publishedAt: timestamp({ mode: 'string' }),
	scheduledAt: timestamp({ mode: 'string' }),
	wpOriginalId: int(),
	wpOriginalUrl: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	isFlash: tinyint().default(0),
	flashExpiresAt: timestamp({ mode: 'string' }),
	flashDurationHours: int(),
	featuredExpiresAt: timestamp({ mode: 'string' }),
	featuredDurationHours: int(),
	primaryCategoryId: int(),
	focusKeywordId: int(),
	coverageCountryId: int(),
	coverageGeoRegionId: int(),
	coverageCityId: int(),
	hasFundingEvent: tinyint().default(0),
	robotsIndexing: mysqlEnum(['index','noindex']).default('index'),
	ogImageId: int(),
	ogTitle: varchar({ length: 512 }),
	ogDescription: text(),
	articleType: mysqlEnum(['news','opinion','press_release','report','interview']).default('news').notNull(),
	googleNewsKeywords: text(),
	seoTitle: varchar({ length: 512 }),
	seoDescription: text(),
	seoKeywords: text(),
	canonicalUrl: text(),
	isEditorPick: tinyint().default(0),
	autoGenerated: tinyint("auto_generated").default(0),
	discoveredArticleId: int("discovered_article_id"),
},
(table) => [
	uniqueIndex("articles_slug_unique").on(table.slug),
	index("idx_articles_status").on(table.statusId),
	index("idx_articles_published_at").on(table.publishedAt),
	index("idx_articles_primary_category").on(table.primaryCategoryId),
	index("idx_articles_status_published").on(table.statusId, table.publishedAt),
]);

export const auditLogs = mysqlTable("audit_logs", {
	id: int().autoincrement().primaryKey(),
	userId: int(),
	userEmail: varchar({ length: 320 }),
	action: varchar({ length: 64 }).notNull(),
	resourceType: varchar({ length: 64 }).notNull(),
	resourceId: int(),
	changes: json(),
	metadata: json(),
	ipAddress: varchar({ length: 45 }),
	userAgent: text(),
	timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_audit_logs_user").on(table.userId),
	index("idx_audit_logs_resource").on(table.resourceType, table.resourceId),
	index("idx_audit_logs_timestamp").on(table.timestamp),
]);

export const bookmarks = mysqlTable("bookmarks", {
	id: int().autoincrement().primaryKey(),
	userId: int().notNull(),
	contentType: varchar({ length: 32 }).notNull(),
	contentId: int().notNull(),
	contentTitle: varchar({ length: 500 }),
	contentSlug: varchar({ length: 500 }),
	contentCategory: varchar({ length: 128 }),
	contentImageUrl: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_bookmarks_user").on(table.userId),
	index("idx_bookmarks_content").on(table.contentType, table.contentId),
	index("unique_bookmark").on(table.userId, table.contentType, table.contentId),
]);

export const browsingHistory = mysqlTable("browsing_history", {
	id: int().autoincrement().primaryKey(),
	userId: int().notNull(),
	contentType: varchar({ length: 32 }).notNull(),
	contentId: int().notNull(),
	contentTitle: varchar({ length: 500 }),
	contentSlug: varchar({ length: 500 }),
	contentCategory: varchar({ length: 128 }),
	contentImageUrl: text(),
	viewCount: int().default(1).notNull(),
	lastViewedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const calculators = mysqlTable("calculators", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
	description: text(),
	shortDescription: varchar({ length: 512 }),
	type: mysqlEnum(['valuation','runway','dilution','cap_table','burn_rate','break_even','roi','ltv_cac','mrr','custom']).notNull(),
	featuredImage: text(),
	config: json(),
	formula: text(),
	inputFields: json(),
	outputFields: json(),
	helpText: text(),
	exampleData: json(),
	isActive: tinyint().default(1),
	isFeatured: tinyint().default(0),
	usageCount: int().default(0),
	sortOrder: int().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_calculators_type").on(table.type),
	index("idx_calculators_active").on(table.isActive),
	index("slug").on(table.slug),
]);

export const categories = mysqlTable("categories", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
	description: text(),
	parentId: int(),
	module: mysqlEnum(['news','jobs','events','resources','research']).notNull(),
	sortOrder: int().default(0),
	isActive: tinyint().default(1),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	uniqueIndex("categories_slug_unique").on(table.slug),
]);

export const cities = mysqlTable("cities", {
	id: int().autoincrement().primaryKey(),
	countryId: int().notNull(),
	geoRegionId: int(),
	name: varchar({ length: 255 }).notNull(),
	latitude: decimal({ precision: 10, scale: 7 }),
	longitude: decimal({ precision: 10, scale: 7 }),
	isActive: tinyint().default(1),
	sortOrder: int().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const claimReviewHistory = mysqlTable("claim_review_history", {
	id: int().autoincrement().primaryKey(),
	claimId: int().notNull(),
	reviewerId: int().notNull(),
	reviewerName: varchar({ length: 255 }),
	action: mysqlEnum(['submitted','under_review','needs_clarification','approved','rejected']).notNull(),
	comment: text(),
	fromStatus: varchar({ length: 64 }),
	toStatus: varchar({ length: 64 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const claimedProfiles = mysqlTable("claimed_profiles", {
	id: int().autoincrement().primaryKey(),
	userId: int().notNull(),
	entityType: mysqlEnum(['person','company','accelerator','event','investor']).notNull(),
	entityId: int().notNull(),
	entityName: varchar({ length: 255 }).notNull(),
	entitySlug: varchar({ length: 255 }),
	entityLogo: text(),
	status: mysqlEnum(['pending','under_review','needs_clarification','approved','rejected']).default('pending').notNull(),
	role: mysqlEnum(['owner','admin','editor']).default('owner').notNull(),
	verificationNote: text(),
	requestNote: text(),
	reviewedById: int(),
	reviewedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	proofText: text(),
	companyEmail: varchar({ length: 320 }),
},
(table) => [
	index("idx_claimed_userId").on(table.userId),
	index("idx_claimed_entity").on(table.entityType, table.entityId),
	index("idx_claimed_status").on(table.status),
]);

export const companies = mysqlTable("companies", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
	tagline: text(),
	description: text(),
	logo: text(),
	website: text(),
	linkedIn: text(),
	twitter: text(),
	location: varchar({ length: 255 }),
	regionId: int(),
	industry: varchar({ length: 100 }),
	sectorId: int(),
	stage: mysqlEnum(['pre_seed','seed','series_a','series_b','series_c','series_d_plus','public','acquired']),
	foundedYear: int(),
	employeeCount: varchar({ length: 50 }),
	totalFunding: varchar({ length: 100 }),
	isVerified: tinyint().default(0),
	isFeatured: tinyint().default(0),
	statusId: int().notNull(),
	viewCount: int().default(0),
	claimedByUserId: int(),
	publishedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	countryId: int(),
	geoRegionId: int(),
	cityId: int(),
	addressLine: text(),
	latitude: decimal({ precision: 10, scale: 7 }),
	longitude: decimal({ precision: 10, scale: 7 }),
	createdByUserId: int(),
	shortDescription: text("short_description"),
	facebook: text(),
	instagram: text(),
	email: varchar({ length: 320 }),
	phone: varchar({ length: 32 }),
	techStack: json("tech_stack"),
	keyPeople: json("key_people"),
	mission: text(),
	vision: text(),
	problemSolved: text("problem_solved"),
	marketServed: text("market_served"),
	coverImage: text("cover_image"),
	brandColor: varchar("brand_color", { length: 20 }),
	activeUsersRange: varchar("active_users_range", { length: 100 }),
	arrRange: varchar("arr_range", { length: 100 }),
	countriesServed: int("countries_served"),
	clientsCount: int("clients_count"),
	notableCustomers: json("notable_customers"),
	partnerships: json(),
	mediaKit: text("media_kit"),
	logoPack: text("logo_pack"),
	boilerplate: text(),
	prContactEmail: varchar("pr_contact_email", { length: 320 }),
	appStoreLink: text("app_store_link"),
	playStoreLink: text("play_store_link"),
	youtube: text(),
	timeline: json(),
	certifications: json(),
	pitchDeck: text("pitch_deck"),
	whitepapers: json(),
	caseStudies: json("case_studies"),
	hiringActively: tinyint("hiring_actively").default(0),
	verificationLevel: varchar("verification_level", { length: 50 }).default('basic'),
	profileCompleteness: int("profile_completeness").default(20),
	lastUpdatedBy: varchar("last_updated_by", { length: 50 }).default('system'),
	dataSource: varchar("data_source", { length: 50 }).default('editorial'),
},
(table) => [
	uniqueIndex("companies_slug_unique").on(table.slug),
	index("idx_companies_status").on(table.statusId),
]);

export const companyAwards = mysqlTable("company_awards", {
	id: int().autoincrement().primaryKey(),
	companyId: int("company_id").notNull(),
	title: varchar({ length: 255 }).notNull(),
	year: int(),
	organization: varchar({ length: 255 }),
	description: text(),
	image: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => [
	index("idx_company_awards_company").on(table.companyId),
]);

export const companyProducts = mysqlTable("company_products", {
	id: int().autoincrement().primaryKey(),
	companyId: int("company_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	category: varchar({ length: 100 }),
	description: text(),
	screenshots: json(),
	demoVideo: text("demo_video"),
	pricingModel: varchar("pricing_model", { length: 100 }),
	integrations: json(),
	clients: json(),
	sortOrder: int("sort_order").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_company_products_company").on(table.companyId),
]);

export const companyRegions = mysqlTable("company_regions", {
	companyId: int().notNull(),
	regionId: int().notNull(),
});

export const companySectors = mysqlTable("company_sectors", {
	companyId: int().notNull(),
	sectorId: int().notNull(),
});

export const companyUpdates = mysqlTable("company_updates", {
	id: int().autoincrement().primaryKey(),
	companyId: int("company_id").notNull(),
	type: mysqlEnum(['text','image','milestone','event','product_launch']).default('text'),
	title: varchar({ length: 255 }),
	content: text(),
	image: text(),
	link: text(),
	likesCount: int("likes_count").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => [
	index("idx_company_updates_company").on(table.companyId),
	index("idx_company_updates_created").on(table.createdAt),
]);

export const countries = mysqlTable("countries", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	iso2: varchar({ length: 2 }).notNull(),
	iso3: varchar({ length: 3 }).notNull(),
	dialCode: varchar({ length: 10 }),
	currency: varchar({ length: 3 }),
	isActive: tinyint().default(1),
	sortOrder: int().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("iso2").on(table.iso2),
	index("iso3").on(table.iso3),
]);

export const crawlSessions = mysqlTable("crawl_sessions", {
	id: int().autoincrement().primaryKey(),
	sessionType: mysqlEnum("session_type", ['scheduled','manual']).default('scheduled').notNull(),
	status: mysqlEnum(['running','completed','failed','partial']).default('running').notNull(),
	totalUrls: int("total_urls").default(0),
	crawledUrls: int("crawled_urls").default(0),
	newIssuesFound: int("new_issues_found").default(0),
	issuesResolved: int("issues_resolved").default(0),
	errorMessage: text("error_message"),
	startedAt: timestamp("started_at", { mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	triggeredById: int("triggered_by_id"),
},
(table) => [
	index("crawl_session_status_idx").on(table.status),
	index("crawl_session_started_idx").on(table.startedAt),
]);

export const dealRedemptions = mysqlTable("deal_redemptions", {
	id: int().autoincrement().primaryKey(),
	dealId: int().notNull(),
	userId: int(),
	email: varchar({ length: 320 }),
	redeemedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	ipAddress: varchar({ length: 45 }),
});

export const emailCampaigns = mysqlTable("email_campaigns", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	subject: varchar({ length: 255 }).notNull(),
	preheader: varchar({ length: 255 }),
	fromName: varchar({ length: 128 }).default('BrentDesk'),
	fromEmail: varchar({ length: 320 }).default('newsletter@brentdesk.com'),
	replyTo: varchar({ length: 320 }),
	listId: int(),
	templateId: int(),
	htmlContent: text(),
	textContent: text(),
	status: mysqlEnum(['draft','scheduled','sending','sent','cancelled']).default('draft').notNull(),
	scheduledAt: timestamp({ mode: 'string' }),
	sentAt: timestamp({ mode: 'string' }),
	recipientCount: int().default(0),
	sentCount: int().default(0),
	deliveredCount: int().default(0),
	openCount: int().default(0),
	clickCount: int().default(0),
	bounceCount: int().default(0),
	unsubscribeCount: int().default(0),
	complaintCount: int().default(0),
	createdById: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const emailDigestPreferences = mysqlTable("email_digest_preferences", {
	id: int().autoincrement().primaryKey(),
	userId: int().notNull(),
	frequency: mysqlEnum(['daily','weekly','none']).default('none').notNull(),
	categories: json(),
	includeJobs: tinyint().default(1),
	includeEvents: tinyint().default(1),
	includeNews: tinyint().default(1),
	includeRecommendations: tinyint().default(1),
	lastSentAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("unique_user_digest").on(table.userId),
]);

export const emailNotifications = mysqlTable("email_notifications", {
	id: int().autoincrement().primaryKey(),
	recipientEmail: varchar({ length: 320 }).notNull(),
	recipientUserId: int(),
	subject: varchar({ length: 512 }).notNull(),
	body: text().notNull(),
	type: varchar({ length: 64 }).notNull(),
	entityType: varchar({ length: 64 }),
	entityId: int(),
	status: mysqlEnum(['pending','sent','failed']).default('pending'),
	sentAt: timestamp({ mode: 'string' }),
	error: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const entityTeamMembers = mysqlTable("entity_team_members", {
	id: int().autoincrement().primaryKey(),
	entityType: mysqlEnum(['person','company','accelerator','event','investor']).notNull(),
	entityId: int().notNull(),
	entityName: varchar({ length: 255 }).notNull(),
	userId: int(),
	invitedEmail: varchar({ length: 320 }).notNull(),
	invitedByUserId: int().notNull(),
	invitedByName: varchar({ length: 255 }),
	role: mysqlEnum(['admin','editor','viewer']).default('editor').notNull(),
	status: mysqlEnum(['pending','accepted','declined','revoked']).default('pending').notNull(),
	acceptedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const entityVersions = mysqlTable("entity_versions", {
	id: int().autoincrement().primaryKey(),
	entityType: varchar({ length: 64 }).notNull(),
	entityId: int().notNull(),
	version: int().notNull(),
	data: json().notNull(),
	changedFields: json(),
	changedByUserId: int(),
	changeReason: text(),
	suggestedUpdateId: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const eventCategories = mysqlTable("event_categories", {
	eventId: int().notNull(),
	categoryId: int().notNull(),
});

export const eventGallery = mysqlTable("event_gallery", {
	id: int().autoincrement().primaryKey(),
	eventId: int().notNull(),
	imageUrl: text().notNull(),
	caption: varchar({ length: 255 }),
	altText: varchar({ length: 255 }),
	sortOrder: int().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
});

export const eventHighlights = mysqlTable("event_highlights", {
	id: int().autoincrement().primaryKey(),
	eventId: int().notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	icon: varchar({ length: 64 }),
	sortOrder: int().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
});

export const eventRegions = mysqlTable("event_regions", {
	eventId: int().notNull(),
	regionId: int().notNull(),
});

export const eventSchedule = mysqlTable("event_schedule", {
	id: int().autoincrement().primaryKey(),
	eventId: int().notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	startTime: timestamp({ mode: 'string' }).notNull(),
	endTime: timestamp({ mode: 'string' }),
	speaker: varchar({ length: 255 }),
	location: varchar({ length: 255 }),
	sortOrder: int().default(0),
	dayNumber: int().default(1),
	speakerId: int(),
	speakerName: varchar({ length: 255 }),
	trackId: int(),
	sessionType: mysqlEnum(['keynote','panel','workshop','networking','break','other']).default('other'),
	imageUrl: text(),
	speakerIds: json(),          // array of event_speakers ids (multi-speaker sessions)
	isFeatured: tinyint().default(0).notNull(),
});

export const eventSectors = mysqlTable("event_sectors", {
	eventId: int().notNull(),
	sectorId: int().notNull(),
});

export const eventSideEvents = mysqlTable("event_side_events", {
	id: int().autoincrement().primaryKey(),
	eventId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	dayNumber: int().default(1),
	date: timestamp({ mode: 'string' }),
	startTime: varchar({ length: 10 }),
	endTime: varchar({ length: 10 }),
	venue: varchar({ length: 255 }),
	capacity: int(),
	registrationUrl: text(),
	sortOrder: int().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	// Public submission workflow — community-proposed side events land as
	// 'pending' and only appear publicly once an editor approves them.
	status: mysqlEnum(['pending','approved','rejected']).default('approved').notNull(),
	submittedByUserId: int(),
	submitterName: varchar({ length: 255 }),
	submitterEmail: varchar({ length: 255 }),
	submitterOrganisation: varchar({ length: 255 }),
	websiteUrl: text(),
	imageUrl: text(),
	sideEventType: mysqlEnum(['side_event','workshop','networking','party','dinner','tour','other']).default('side_event').notNull(),
	isFree: tinyint().default(1).notNull(),
	moderationNotes: text(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
});

export const eventSpeakers = mysqlTable("event_speakers", {
	id: int().autoincrement().primaryKey(),
	eventId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	title: varchar({ length: 255 }),
	company: varchar({ length: 255 }),
	bio: text(),
	photo: text(),
	linkedinUrl: text(),
	twitterUrl: text(),
	websiteUrl: text(),
	personId: int(),
	isFeatured: tinyint().default(0),
	sortOrder: int().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
});

export const eventFaqs = mysqlTable("event_faqs", {
	id: int().autoincrement().primaryKey(),
	eventId: int().notNull(),
	question: varchar({ length: 512 }).notNull(),
	answer: text().notNull(),
	sortOrder: int().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_event_faqs_event").on(table.eventId, table.sortOrder),
]);

/** Press / media coverage: external link or an asset uploaded to R2. */
export const eventCoverage = mysqlTable("event_coverage", {
	id: int().autoincrement().primaryKey(),
	eventId: int().notNull(),
	title: varchar({ length: 512 }).notNull(),
	url: text().notNull(),
	coverageType: mysqlEnum(['article','video','photos','report','press_release','social','other']).default('article').notNull(),
	sourceName: varchar({ length: 255 }),
	imageUrl: text(),
	isUploaded: tinyint().default(0).notNull(),
	publishedAt: timestamp({ mode: 'string' }),
	sortOrder: int().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_event_coverage_event").on(table.eventId, table.sortOrder),
]);

export const eventSponsors = mysqlTable("event_sponsors", {
	id: int().autoincrement().primaryKey(),
	eventId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	logo: text(),
	websiteUrl: text(),
	tier: mysqlEnum(['platinum','gold','silver','bronze','partner']).default('partner'),
	// Link to a real company/investor record so logo + URL stay canonical.
	companyId: int(),
	investorId: int(),
	description: text(),
	isConfirmed: tinyint().default(1).notNull(),
	sortOrder: int().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
});

export const editorialBatches = mysqlTable("editorial_batches", {
	id: int().autoincrement().primaryKey(),
	batchKey: varchar({ length: 128 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	status: mysqlEnum(['draft','ready_for_review','approved','importing','imported','failed']).default('draft').notNull(),
	requestedArticleCount: int().default(0).notNull(),
	importedArticleCount: int().default(0).notNull(),
	metadata: json(),
	createdById: int(),
	approvedById: int(),
	approvedAt: timestamp({ mode: 'string' }),
	importedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	uniqueIndex("editorial_batches_batchKey_unique").on(table.batchKey),
	index("idx_editorial_batches_status").on(table.status),
]);

export const eventTracks = mysqlTable("event_tracks", {
	id: int().autoincrement().primaryKey(),
	eventId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	color: varchar({ length: 7 }).default('#22c55e'),
	icon: varchar({ length: 64 }),
	sortOrder: int().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
});

export const events = mysqlTable("events", {
	id: int().autoincrement().primaryKey(),
	title: varchar({ length: 512 }).notNull(),
	slug: varchar({ length: 512 }).notNull(),
	tagline: varchar({ length: 255 }),
	description: text(),
	shortDescription: text(),
	type: mysqlEnum(['conference','webinar','meetup','workshop','hackathon','summit','other']).notNull(),
	format: mysqlEnum(['in_person','virtual','hybrid']).default('in_person'),
	featuredImage: text(),
	startDate: timestamp({ mode: 'string' }).notNull(),
	endDate: timestamp({ mode: 'string' }),
	timezone: varchar({ length: 64 }).default('UTC'),
	venue: varchar({ length: 255 }),
	address: text(),
	city: varchar({ length: 128 }),
	country: varchar({ length: 128 }),
	virtualUrl: text(),
	registrationUrl: text(),
	ticketPrice: decimal({ precision: 10, scale: 2 }),
	ticketCurrency: varchar({ length: 3 }).default('USD'),
	isFree: tinyint().default(0),
	organizerName: varchar({ length: 255 }),
	organizerLogo: text(),
	// Attribution for auto-sourced photography (Wikimedia Commons and
	// similar): most free licences require a visible credit.
	// "Who should attend" chips on the public event page.
	targetAudience: json(),
	featuredImageCredit: varchar({ length: 512 }),
	featuredImageSource: text(),
	featuredImageLicense: varchar({ length: 128 }),
	organizerDescription: text(),
	organizerContactEmail: varchar({ length: 255 }),
	organizerCompanyId: int(),
	organizerEmail: varchar({ length: 320 }),
	organizerWebsite: text(),
	isFeatured: tinyint().default(0),
	statusId: int().notNull(),
	viewCount: int().default(0),
	publishedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	countryId: int(),
	geoRegionId: int(),
	cityId: int(),
	addressLine: text(),
	latitude: decimal({ precision: 10, scale: 7 }),
	longitude: decimal({ precision: 10, scale: 7 }),
	whatToExpect: text(),
	expectedAttendees: int(),
	expectedInvestors: int(),
	expectedStartups: int(),
	expectedCountries: int(),
	venueName: varchar({ length: 255 }),
	venueAddress: text(),
	venueMapUrl: text(),
	venueImage: text(),
	ticketUrl: text(),
	websiteUrl: text(),
	claimedByUserId: int(),
	createdByUserId: int(),
	// Events Hub additions (PR migration 0042)
	// ----------------------------------------------------------------
	// ticketProvider drives which UI surface the event uses for tickets:
	//   internal   — Stripe Checkout via our own ticketing tables
	//   eventbrite — affiliate link out to Eventbrite + click tracking
	//   luma       — affiliate link out to Luma
	//   external   — generic external URL
	//   none       — no tickets / free / RSVP elsewhere
	ticketProvider: mysqlEnum(['internal','eventbrite','luma','external','none']).default('none'),
	externalTicketUrl: text(),
	// Manual override for live coverage mode. Default window is
	// startDate - 2h → endDate + 6h. These two columns let an editor
	// flip live mode on/off ahead of/after the auto window.
	liveModeStartOverride: timestamp({ mode: 'string' }),
	liveModeEndOverride: timestamp({ mode: 'string' }),
	// Forced state, beats both the override timestamps and the auto
	// window. Lets an editor say "show post-event mode now" even if
	// the event hasn't ended yet (useful when a recap is ready early).
	liveModeForce: mysqlEnum(['pre','live','post']),
	// Pointer to the recap article generated after the event. Drives
	// the "Read the recap" CTA in post-event mode.
	recapArticleId: int(),
	// Aggregate sales counters maintained by the orders table —
	// denormalized here so the public page can show "X tickets sold"
	// without a join. Updated via triggers in the orders mutation.
	ticketsSoldCount: int().default(0),
	ticketsRevenueCents: int().default(0),
},
(table) => [
	uniqueIndex("events_slug_unique").on(table.slug),
	index("idx_events_status").on(table.statusId),
	index("idx_events_start_date").on(table.startDate),
]);

// ============================================================
// EVENTS HUB v2 — additional tables (migration 0042)
// ============================================================

/**
 * Ticket tier definitions per event. An event can have many tiers
 * (Early bird / Standard / VIP / Student / etc). Each tier sets price,
 * currency, capacity, and a sales window so tiers can open and close
 * independently of the event itself.
 */
export const eventTickets = mysqlTable("event_tickets", {
	id: int().autoincrement().primaryKey(),
	eventId: int().notNull(),
	name: varchar({ length: 128 }).notNull(),
	description: text(),
	priceCents: int().notNull(),                                    // 0 = free tier
	currency: varchar({ length: 3 }).default('USD').notNull(),
	capacity: int(),                                                // null = unlimited
	soldCount: int().default(0).notNull(),
	salesStartAt: timestamp({ mode: 'string' }),
	salesEndAt: timestamp({ mode: 'string' }),
	isActive: tinyint().default(1).notNull(),
	sortOrder: int().default(0).notNull(),
	maxPerOrder: int().default(10),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
	index("idx_event_tickets_event").on(table.eventId),
	index("idx_event_tickets_active").on(table.eventId, table.isActive),
]);

/**
 * Promo / discount codes scoped to an event. Percent or fixed amount.
 * Capped uses + expiry so we don't end up giving away tickets after
 * the campaign ends.
 */
export const eventPromoCodes = mysqlTable("event_promo_codes", {
	id: int().autoincrement().primaryKey(),
	eventId: int().notNull(),
	code: varchar({ length: 64 }).notNull(),
	discountType: mysqlEnum(['percentage','fixed_cents']).notNull(),
	discountValue: int().notNull(),                                // % or cents off
	maxUses: int(),                                                // null = unlimited
	usedCount: int().default(0).notNull(),
	validFrom: timestamp({ mode: 'string' }),
	validUntil: timestamp({ mode: 'string' }),
	isActive: tinyint().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("event_promo_codes_event_code_unique").on(table.eventId, table.code),
]);

/**
 * Order header — one row per purchase. Line items in event_order_items.
 * paymentProvider records which checkout flow handled the money:
 *   stripe     — internal Stripe Checkout
 *   eventbrite — affiliate click that came back via partner webhook (rare)
 *   manual     — admin-entered (comp tickets)
 */
export const eventOrders = mysqlTable("event_orders", {
	id: int().autoincrement().primaryKey(),
	eventId: int().notNull(),
	userId: int(),                                                 // null for guest orders
	customerEmail: varchar({ length: 320 }).notNull(),
	customerName: varchar({ length: 255 }),
	customerPhone: varchar({ length: 32 }),
	customerCompany: varchar({ length: 255 }),
	subtotalCents: int().notNull(),
	discountCents: int().default(0).notNull(),
	feesCents: int().default(0).notNull(),
	totalCents: int().notNull(),
	currency: varchar({ length: 3 }).default('USD').notNull(),
	promoCodeId: int(),
	status: mysqlEnum(['pending','paid','refunded','cancelled','failed']).default('pending').notNull(),
	paymentProvider: mysqlEnum(['stripe','eventbrite','manual']).default('stripe').notNull(),
	paymentRef: varchar({ length: 255 }),                          // provider's payment / charge id
	stripeSessionId: varchar({ length: 255 }),
	paidAt: timestamp({ mode: 'string' }),
	refundedAt: timestamp({ mode: 'string' }),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
	index("idx_event_orders_event").on(table.eventId),
	index("idx_event_orders_user").on(table.userId),
	index("idx_event_orders_email").on(table.customerEmail),
	index("idx_event_orders_status").on(table.status),
	index("idx_event_orders_stripe_session").on(table.stripeSessionId),
]);

/**
 * Line items per order. One row per (tier, qty) pair. Stores price
 * snapshot so historical orders don't drift if tier prices change later.
 */
export const eventOrderItems = mysqlTable("event_order_items", {
	id: int().autoincrement().primaryKey(),
	orderId: int().notNull(),
	ticketId: int().notNull(),
	quantity: int().notNull(),
	unitPriceCents: int().notNull(),
	lineTotalCents: int().notNull(),
	attendeeName: varchar({ length: 255 }),                        // optional per-ticket attendee
	attendeeEmail: varchar({ length: 320 }),
	qrCode: varchar({ length: 64 }),                               // unique check-in code per item
	checkedInAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_event_order_items_order").on(table.orderId),
	index("idx_event_order_items_qrcode").on(table.qrCode),
]);

/**
 * External-ticket click tracking. Logs every "Buy on Eventbrite/Luma"
 * click so we can report attribution + commission revenue. Also used
 * for the affiliate revenue dashboard.
 */
export const eventExternalClicks = mysqlTable("event_external_clicks", {
	id: int().autoincrement().primaryKey(),
	eventId: int().notNull(),
	provider: mysqlEnum(['eventbrite','luma','external']).notNull(),
	userId: int(),                                                 // null for anonymous
	referrer: text(),
	userAgent: text(),
	ipHash: varchar({ length: 64 }),                               // sha256(ip) for unique-click counting without storing PII
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_event_external_clicks_event").on(table.eventId),
	index("idx_event_external_clicks_event_created").on(table.eventId, table.createdAt),
]);

/**
 * Live blog post. The event detail page shows these in reverse-chrono
 * order during live mode. Each post is also rendered into JSON-LD as
 * a BlogPosting child of the LiveBlogPosting parent so Google can
 * index live coverage in real time.
 */
export const eventLivePosts = mysqlTable("event_live_posts", {
	id: int().autoincrement().primaryKey(),
	eventId: int().notNull(),
	authorId: int().notNull(),                                     // user who posted (correspondent or admin)
	headline: varchar({ length: 512 }),
	body: text().notNull(),                                        // Markdown / inline HTML
	imageUrl: text(),
	embedUrl: text(),                                              // tweet, video, or other embed
	postType: mysqlEnum(['update','quote','funding','session','sponsor','photo','video','breaking']).default('update').notNull(),
	speakerName: varchar({ length: 255 }),                         // for quote / session updates
	companyName: varchar({ length: 255 }),                         // for funding announcements
	fundingAmount: varchar({ length: 64 }),                        // "$2.5M" — display string
	publishedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	isPinned: tinyint().default(0).notNull(),
	isDeleted: tinyint().default(0).notNull(),
	// AI coverage pipeline: reporter posts are auto-approved; AI drafts
	// enter as source='ai', approvalStatus='pending' until an editor
	// approves them from the live console.
	source: mysqlEnum(['reporter','ai']).default('reporter').notNull(),
	approvalStatus: mysqlEnum(['pending','approved','rejected']).default('approved').notNull(),
	sourceUrl: text(),
}, (table) => [
	index("idx_event_live_posts_event").on(table.eventId),
	index("idx_event_live_posts_event_published").on(table.eventId, table.publishedAt),
	index("idx_event_live_posts_event_pinned").on(table.eventId, table.isPinned),
]);

/**
 * Session recording links published after the event. The post-event
 * mode renders these as a video grid and emits VideoObject schema.
 */
export const eventRecordings = mysqlTable("event_recordings", {
	id: int().autoincrement().primaryKey(),
	eventId: int().notNull(),
	scheduleId: int(),                                             // optional link to event_schedule row
	title: varchar({ length: 512 }).notNull(),
	speakerName: varchar({ length: 255 }),
	videoUrl: text().notNull(),                                    // YouTube / Vimeo
	thumbnailUrl: text(),
	durationSeconds: int(),
	sortOrder: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_event_recordings_event").on(table.eventId),
]);

/**
 * RSVP / "Going" toggle for logged-in users. Drives the email reminder
 * pipeline (D-7, D-1, day-of) and the "X people going" counter.
 * Separate from purchases — many events are free RSVP.
 */
export const eventAttendees = mysqlTable("event_attendees", {
	id: int().autoincrement().primaryKey(),
	eventId: int().notNull(),
	userId: int().notNull(),
	status: mysqlEnum(['interested','going','attended','not_going']).default('interested').notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	// Email-reminder bookkeeping. Updated by eventReminders.service.ts
	// after each successful per-attendee dispatch so the hourly cron
	// never re-sends the same window's reminder. Null = never reminded.
	lastReminderSentAt: timestamp({ mode: 'string' }),
}, (table) => [
	uniqueIndex("event_attendees_event_user_unique").on(table.eventId, table.userId),
	index("idx_event_attendees_event").on(table.eventId),
]);

/**
 * Per-event correspondent assignments. A correspondent is a user
 * granted live-blog write access for this event ONLY (no full admin
 * privileges). Used for freelancers covering an event.
 */
export const eventCorrespondents = mysqlTable("event_correspondents", {
	id: int().autoincrement().primaryKey(),
	eventId: int().notNull(),
	userId: int().notNull(),
	addedById: int(),                                              // admin who granted access
	role: mysqlEnum(['lead','correspondent','photographer']).default('correspondent').notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("event_correspondents_event_user_unique").on(table.eventId, table.userId),
]);

/**
 * Public event submissions awaiting moderation. Logged-in users can
 * propose an event; AI moderation scores it; admin reviews high-
 * confidence rejects in bulk and approves the rest.
 */
export const eventSubmissions = mysqlTable("event_submissions", {
	id: int().autoincrement().primaryKey(),
	submitterId: int().notNull(),
	title: varchar({ length: 512 }).notNull(),
	tagline: varchar({ length: 255 }),
	description: text(),
	type: varchar({ length: 64 }),
	startDate: timestamp({ mode: 'string' }),
	endDate: timestamp({ mode: 'string' }),
	city: varchar({ length: 128 }),
	country: varchar({ length: 128 }),
	venue: varchar({ length: 255 }),
	websiteUrl: text(),
	registrationUrl: text(),
	organizerName: varchar({ length: 255 }),
	organizerEmail: varchar({ length: 320 }),
	moderationStatus: mysqlEnum(['pending','ai_approved','ai_flagged','approved','rejected']).default('pending').notNull(),
	moderationScore: int(),                                        // 0-100 AI confidence it's legit
	moderationReasoning: text(),                                   // AI's brief reasoning
	reviewedById: int(),
	reviewedAt: timestamp({ mode: 'string' }),
	approvedEventId: int(),                                        // FK to events.id once approved
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_event_submissions_status").on(table.moderationStatus),
	index("idx_event_submissions_submitter").on(table.submitterId),
]);

export const founderDeals = mysqlTable("founder_deals", {
	id: int().autoincrement().primaryKey(),
	partnerId: int().notNull(),
	resourceId: int(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	discountType: mysqlEnum(['percentage','fixed','credits','free_tier','custom']).notNull(),
	discountValue: varchar({ length: 128 }),
	promoCode: varchar({ length: 64 }),
	redemptionUrl: text(),
	redemptionInstructions: text(),
	eligibility: text(),
	maxRedemptions: int(),
	maxRedemptionsPerUser: int().default(1),
	currentRedemptions: int().default(0),
	startDate: timestamp({ mode: 'string' }),
	endDate: timestamp({ mode: 'string' }),
	status: mysqlEnum(['draft','active','paused','expired']).default('draft').notNull(),
	isExclusive: tinyint().default(0),
	isFeatured: tinyint().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const fundingRoundInvestors = mysqlTable("funding_round_investors", {
	id: int().autoincrement().primaryKey(),
	fundingRoundId: int().notNull(),
	investorId: int().notNull(),
	role: mysqlEnum(['lead','participant']).default('participant').notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	investmentAmount: decimal({ precision: 15, scale: 2 }),
	investmentCurrency: varchar({ length: 10 }).default('USD'),
});

export const fundingRounds = mysqlTable("funding_rounds", {
	id: int().autoincrement().primaryKey(),
	articleId: int(),
	companyId: int().notNull(),
	roundType: mysqlEnum(['pre_seed','seed','series_a','series_b','series_c','series_d_plus','bridge','strategic','venture_debt','grant','undisclosed']).notNull(),
	amountRaised: decimal({ precision: 15, scale: 2 }),
	currency: varchar({ length: 3 }).default('USD'),
	isUndisclosed: tinyint().default(0),
	leadInvestorId: int(),
	valuationPre: decimal({ precision: 15, scale: 2 }),
	valuationPost: decimal({ precision: 15, scale: 2 }),
	valuationCurrency: varchar({ length: 3 }).default('USD'),
	isValuationUndisclosed: tinyint().default(1),
	fundingDate: timestamp({ mode: 'string' }).notNull(),
	countryId: int(),
	geoRegionId: int(),
	cityId: int(),
	sourceUrls: json(),
	proofDocumentId: int(),
	notes: text(),
	status: mysqlEnum(['confirmed','pending','disputed']).default('pending').notNull(),
	createdById: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const gatedDownloads = mysqlTable("gated_downloads", {
	id: int().autoincrement().primaryKey(),
	resourceId: int().notNull(),
	leadId: int().notNull(),
	downloadedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	ipAddress: varchar({ length: 45 }),
	userAgent: text(),
});

export const geoRegions = mysqlTable("geo_regions", {
	id: int().autoincrement().primaryKey(),
	countryId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 10 }),
	isActive: tinyint().default(1),
	sortOrder: int().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const gscIndexingCoverage = mysqlTable("gsc_indexing_coverage", {
	id: int().autoincrement().primaryKey(),
	url: text().notNull(),
	pageType: varchar("page_type", { length: 64 }).default('article').notNull(),
	coverageStatus: mysqlEnum("coverage_status", ['indexed','not_indexed','excluded','error','unknown']).default('unknown').notNull(),
	gscReason: varchar("gsc_reason", { length: 255 }),
	httpStatus: int("http_status"),
	canonicalUrl: text("canonical_url"),
	canonicalMismatch: tinyint("canonical_mismatch").default(0),
	robotsMeta: varchar("robots_meta", { length: 128 }),
	hasSchema: tinyint("has_schema").default(0),
	redirectChainLength: int("redirect_chain_length").default(0),
	finalUrl: text("final_url"),
	hasHreflang: tinyint("has_hreflang").default(0),
	submittedForIndexing: tinyint("submitted_for_indexing").default(0),
	submittedAt: timestamp("submitted_at", { mode: 'string' }),
	indexingRequestStatus: varchar("indexing_request_status", { length: 64 }),
	lastCrawledAt: timestamp("last_crawled_at", { mode: 'string' }),
	lastGscSyncAt: timestamp("last_gsc_sync_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("gsc_status_idx").on(table.coverageStatus),
	index("gsc_page_type_idx").on(table.pageType),
]);

export const homepageBlocks = mysqlTable("homepage_blocks", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 128 }).notNull(),
	slug: varchar({ length: 128 }).notNull(),
	type: varchar({ length: 64 }).notNull(),
	title: varchar({ length: 255 }),
	subtitle: text(),
	config: json(),
	sortOrder: int().default(0),
	isActive: tinyint().default(1),
	startDate: timestamp({ mode: 'string' }),
	endDate: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	uniqueIndex("homepage_blocks_slug_unique").on(table.slug),
]);

export const homepageSections = mysqlTable("homepage_sections", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 128 }).notNull(),
	slug: varchar({ length: 128 }).notNull(),
	sectionType: mysqlEnum(['hero','trending','headlines','category','in_brief','podcasts','videos','stocks','sidebar_jobs','sidebar_events','sidebar_links','sidebar_podcast']).notNull(),
	categoryId: int(),
	accentColor: varchar({ length: 7 }).default('#000000'),
	icon: varchar({ length: 64 }),
	articleCount: int().default(4),
	layout: mysqlEnum(['featured_grid','two_column','list','horizontal_scroll','compact']).default('featured_grid'),
	showImage: tinyint().default(1),
	showExcerpt: tinyint().default(1),
	showDate: tinyint().default(1),
	showAuthor: tinyint().default(0),
	showViewMore: tinyint().default(1),
	viewMoreUrl: text(),
	sortOrder: int().default(0),
	isActive: tinyint().default(1),
	position: mysqlEnum(['main','sidebar']).default('main'),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	uniqueIndex("homepage_sections_slug_unique").on(table.slug),
]);

export const indexingLogs = mysqlTable("indexing_logs", {
	id: int().autoincrement().primaryKey(),
	articleId: int("article_id"),
	articleTitle: varchar("article_title", { length: 512 }),
	articleSlug: varchar("article_slug", { length: 512 }),
	url: text().notNull(),
	method: mysqlEnum(['sitemap_ping','indexnow','google_indexing_api']).notNull(),
	success: tinyint().notNull(),
	statusCode: int("status_code"),
	message: text(),
	trigger: mysqlEnum(['publish','transition','bulk_publish','scheduled','manual']).default('publish'),
	triggeredBy: int("triggered_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_indexing_logs_article_id").on(table.articleId),
	index("idx_indexing_logs_created_at").on(table.createdAt),
	index("idx_indexing_logs_method").on(table.method),
]);

export const indexingSubmissions = mysqlTable("indexing_submissions", {
	id: int().autoincrement().primaryKey(),
	url: text().notNull(),
	coverageId: int("coverage_id"),
	submissionType: varchar("submission_type", { length: 32 }).default('URL_UPDATED').notNull(),
	apiResponse: text("api_response"),
	success: tinyint().default(0),
	statusCode: int("status_code"),
	errorMessage: text("error_message"),
	indexedAfterSubmission: tinyint("indexed_after_submission"),
	checkedAt: timestamp("checked_at", { mode: 'string' }),
	submittedById: int("submitted_by_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_sub_created").on(table.createdAt),
]);

export const integrationConfigs = mysqlTable("integration_configs", {
	id: int().autoincrement().primaryKey(),
	integrationId: varchar("integration_id", { length: 64 }).notNull(),
	enabled: tinyint().default(0).notNull(),
	publicConfig: json("public_config"),
	secrets: text(),
	status: mysqlEnum(['unconfigured','configured','error']).default('unconfigured').notNull(),
	lastTestedAt: timestamp("last_tested_at", { mode: 'string' }),
	lastTestResult: text("last_test_result"),
	createdById: int("created_by_id"),
	updatedById: int("updated_by_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	uniqueIndex("integration_configs_integration_id_unique").on(table.integrationId),
	index("idx_integration_configs_integration_id").on(table.integrationId),
	index("idx_integration_configs_enabled").on(table.enabled),
]);

export const investorRegions = mysqlTable("investor_regions", {
	investorId: int().notNull(),
	regionId: int().notNull(),
});

export const investorSectors = mysqlTable("investor_sectors", {
	investorId: int().notNull(),
	sectorId: int().notNull(),
});

export const investors = mysqlTable("investors", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
	type: mysqlEnum(['vc','angel','corporate_vc','family_office','accelerator','other']).notNull(),
	description: text(),
	shortDescription: text(),
	logo: text(),
	website: text(),
	linkedIn: text(),
	twitter: text(),
	email: varchar({ length: 320 }),
	headquarters: varchar({ length: 255 }),
	foundedYear: int(),
	teamSize: varchar({ length: 64 }),
	aum: varchar({ length: 128 }),
	checkSizeMin: decimal({ precision: 15, scale: 2 }),
	checkSizeMax: decimal({ precision: 15, scale: 2 }),
	checkSizeCurrency: varchar({ length: 3 }).default('USD'),
	investmentStages: json(),
	portfolioCount: int(),
	isVerified: tinyint().default(0),
	claimedByUserId: int(),
	statusId: int().notNull(),
	viewCount: int().default(0),
	publishedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	countryId: int(),
	geoRegionId: int(),
	cityId: int(),
	addressLine: text(),
	location: varchar({ length: 255 }),
	createdByUserId: int(),
	facebook: text(),
	instagram: text(),
	portfolioCompanies: json("portfolio_companies"),
	investmentThesis: text("investment_thesis"),
	notableExits: json("notable_exits"),
	focusRegions: json("focus_regions"),
	mission: text(),
	investmentPhilosophy: text("investment_philosophy"),
	teamMembers: json("team_members"),
	officeLocations: json("office_locations"),
	socialLinks: json("social_links"),
	awards: json(),
	keyMetrics: json("key_metrics"),
	applicationProcess: text("application_process"),
	contactEmail: varchar("contact_email", { length: 255 }),
	contactPhone: varchar("contact_phone", { length: 50 }),
	youtube: varchar({ length: 512 }),
},
(table) => [
	uniqueIndex("investors_slug_unique").on(table.slug),
	index("idx_investors_status").on(table.statusId),
]);

export const jobApplications = mysqlTable("job_applications", {
	id: int().autoincrement().primaryKey(),
	tenantId: int("tenant_id"),                                                                     // mirrors jobs.tenant_id for fast tenant-scoped queries
	jobId: int().notNull(),
	userId: int(),
	applicantName: varchar({ length: 255 }).notNull(),
	applicantEmail: varchar({ length: 320 }).notNull(),
	applicantPhone: varchar({ length: 32 }),
	cvUrl: text(),
	coverLetter: text(),
	linkedinUrl: text(),
	portfolioUrl: text(),
	currentCompany: varchar({ length: 255 }),
	currentTitle: varchar({ length: 255 }),
	yearsOfExperience: int(),
	expectedSalary: decimal({ precision: 12, scale: 2 }),
	expectedSalaryCurrency: varchar({ length: 3 }).default('USD'),
	noticePeriod: varchar({ length: 64 }),
	applicationMethod: mysqlEnum(['internal','external']).default('internal').notNull(),
	status: mysqlEnum(['new','reviewed','shortlisted','interview','offered','hired','rejected','withdrawn']).default('new').notNull(),
	statusNote: text(),
	rating: int(),
	isViewed: tinyint().default(0),
	viewedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	currentStageId: int("current_stage_id"),                                                          // FK pipelineStages.id — set when application enters ATS pipeline (Phase 3)
},
(table) => [
	index("idx_app_jobId").on(table.jobId),
	index("idx_app_userId").on(table.userId),
	index("idx_app_status").on(table.status),
	index("idx_job_apps_stage").on(table.currentStageId),
]);

export const jobCategories = mysqlTable("job_categories", {
	jobId: int().notNull(),
	categoryId: int().notNull(),
});

export const jobClicks = mysqlTable("job_clicks", {
	id: int().autoincrement().primaryKey(),
	jobId: int().notNull(),
	userId: int(),
	userName: varchar({ length: 255 }),
	userAvatar: text(),
	userTitle: varchar({ length: 255 }),
	userCompany: varchar({ length: 255 }),
	clickType: mysqlEnum(['view','apply_click','save','share','external_apply']).default('view').notNull(),
	referrer: varchar({ length: 512 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("idx_click_jobId").on(table.jobId),
	index("idx_click_userId").on(table.userId),
	index("idx_click_type").on(table.clickType),
]);

export const jobRegions = mysqlTable("job_regions", {
	jobId: int().notNull(),
	regionId: int().notNull(),
});

export const jobSectors = mysqlTable("job_sectors", {
	jobId: int().notNull(),
	sectorId: int().notNull(),
});

export const jobs = mysqlTable("jobs", {
	id: int().autoincrement().primaryKey(),
	tenantId: int("tenant_id"),                                                                     // NULL = legacy public job board
	title: varchar({ length: 512 }).notNull(),
	slug: varchar({ length: 512 }).notNull(),
	description: text(),
	requirements: text(),
	benefits: text(),
	companyName: varchar({ length: 255 }).notNull(),
	companyLogo: text(),
	companyWebsite: text(),
	location: varchar({ length: 255 }),
	isRemote: tinyint().default(0),
	remoteType: mysqlEnum(['fully_remote','hybrid','on_site']).default('on_site'),
	roleType: mysqlEnum(['full_time','part_time','contract','internship','freelance']).default('full_time'),
	seniority: mysqlEnum(['entry','mid','senior','lead','executive']),
	salaryMin: decimal({ precision: 12, scale: 2 }),
	salaryMax: decimal({ precision: 12, scale: 2 }),
	salaryCurrency: varchar({ length: 3 }).default('USD'),
	salaryPeriod: mysqlEnum(['hourly','monthly','yearly']).default('yearly'),
	applyUrl: text(),
	applyEmail: varchar({ length: 320 }),
	statusId: int().notNull(),
	expiresAt: timestamp({ mode: 'string' }),
	publishedAt: timestamp({ mode: 'string' }),
	viewCount: int().default(0),
	applicationCount: int().default(0),
	postedById: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	companyId: int(),
	countryId: int(),
	geoRegionId: int(),
	cityId: int(),
	skills: json(),
	department: varchar({ length: 100 }),
	deadline: timestamp({ mode: 'string' }),
	visaSponsorship: tinyint("visa_sponsorship").default(0),
},
(table) => [
	uniqueIndex("jobs_slug_unique").on(table.slug),
	index("idx_jobs_status").on(table.statusId),
]);

export const keywords = mysqlTable("keywords", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }),
	description: text(),
	isActive: tinyint().default(1),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	sortOrder: int().default(0),
	keywordType: mysqlEnum(['primary','secondary']).default('secondary').notNull(),
	category: varchar({ length: 128 }),
	usageCount: int().default(0),
});

export const leads = mysqlTable("leads", {
	id: int().autoincrement().primaryKey(),
	subscriberId: int(),
	email: varchar({ length: 320 }).notNull(),
	firstName: varchar({ length: 128 }),
	lastName: varchar({ length: 128 }),
	companyName: varchar({ length: 255 }),
	jobTitle: varchar({ length: 128 }),
	phone: varchar({ length: 32 }),
	source: varchar({ length: 64 }).notNull(),
	sourceResourceId: int(),
	sourceUrl: text(),
	score: int().default(0),
	scoreFactors: json(),
	status: mysqlEnum(['new','contacted','qualified','converted','disqualified']).default('new').notNull(),
	assignedToPartnerId: int(),
	assignedAt: timestamp({ mode: 'string' }),
	consentMarketing: tinyint().default(0),
	consentPartnerShare: tinyint().default(0),
	consentTimestamp: timestamp({ mode: 'string' }),
	ipAddress: varchar({ length: 45 }),
	countryCode: varchar({ length: 2 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const media = mysqlTable("media", {
	id: int().autoincrement().primaryKey(),
	filename: varchar({ length: 255 }).notNull(),
	originalFilename: varchar({ length: 255 }).notNull(),
	mimeType: varchar({ length: 128 }).notNull(),
	size: bigint({ mode: "number" }).notNull(),
	url: text().notNull(),
	s3Key: varchar({ length: 512 }),
	alt: varchar({ length: 255 }),
	caption: text(),
	width: int(),
	height: int(),
	uploadedById: int(),
	folder: varchar({ length: 255 }).default('/'),
	credit: varchar({ length: 512 }),
	sourceUrl: text(),
	license: varchar({ length: 128 }),
	rightsStatus: mysqlEnum(['owned','licensed','editorial_use','generated','pending_review']).default('pending_review').notNull(),
	rightsNotes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const partnerApiKeys = mysqlTable("partner_api_keys", {
	id: int().autoincrement().primaryKey(),
	partnerId: int().notNull(),
	keyName: varchar({ length: 128 }).notNull(),
	apiKey: varchar({ length: 64 }).notNull(),
	apiSecret: varchar({ length: 128 }).notNull(),
	permissions: json(),
	lastUsedAt: timestamp({ mode: 'string' }),
	expiresAt: timestamp({ mode: 'string' }),
	isActive: tinyint().default(1),
	createdById: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	uniqueIndex("partner_api_keys_apiKey_unique").on(table.apiKey),
]);

export const partnerPayouts = mysqlTable("partner_payouts", {
	id: int().autoincrement().primaryKey(),
	partnerId: int().notNull(),
	amount: decimal({ precision: 15, scale: 2 }).notNull(),
	currency: varchar({ length: 3 }).default('USD'),
	paymentMethod: mysqlEnum(['bank_transfer','paypal','stripe','check']).notNull(),
	paymentReference: varchar({ length: 255 }),
	status: mysqlEnum(['pending','processing','completed','failed']).default('pending').notNull(),
	periodStart: timestamp({ mode: 'string' }).notNull(),
	periodEnd: timestamp({ mode: 'string' }).notNull(),
	processedAt: timestamp({ mode: 'string' }),
	processedById: int(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const partnerUsers = mysqlTable("partner_users", {
	id: int().autoincrement().primaryKey(),
	partnerId: int().notNull(),
	userId: int().notNull(),
	role: mysqlEnum(['admin','manager','viewer']).default('viewer').notNull(),
	invitedById: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const partners = mysqlTable("partners", {
	id: int().autoincrement().primaryKey(),
	companyName: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
	logo: text(),
	website: text(),
	description: text(),
	contactName: varchar({ length: 255 }),
	contactEmail: varchar({ length: 320 }),
	contactPhone: varchar({ length: 32 }),
	tier: mysqlEnum(['free','growth','pro','enterprise']).default('free').notNull(),
	partnershipType: mysqlEnum(['resource_provider','affiliate','sponsor','media','strategic']).default('resource_provider').notNull(),
	commissionRate: decimal({ precision: 5, scale: 2 }).default('15.00'),
	billingEmail: varchar({ length: 320 }),
	billingAddress: text(),
	paymentMethod: mysqlEnum(['bank_transfer','paypal','stripe']).default('bank_transfer'),
	paymentDetails: json(),
	status: mysqlEnum(['pending','active','suspended','terminated']).default('pending').notNull(),
	approvedById: int(),
	approvedAt: timestamp({ mode: 'string' }),
	monthlyClickLimit: int().default(1000),
	monthlyLeadLimit: int().default(100),
	notes: text(),
	contractUrl: text(),
	contractExpiresAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	uniqueIndex("partners_slug_unique").on(table.slug),
]);

export const payoutLineItems = mysqlTable("payout_line_items", {
	id: int().autoincrement().primaryKey(),
	payoutId: int().notNull(),
	conversionId: int().notNull(),
	amount: decimal({ precision: 15, scale: 2 }).notNull(),
	description: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const people = mysqlTable("people", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
	title: varchar({ length: 255 }),
	company: varchar({ length: 255 }),
	bio: text(),
	shortBio: text(),
	avatar: text(),
	email: varchar({ length: 320 }),
	linkedIn: text(),
	twitter: text(),
	website: text(),
	isVerified: tinyint().default(0),
	claimedByUserId: int(),
	statusId: int().notNull(),
	viewCount: int().default(0),
	publishedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	companyId: int(),
	countryId: int(),
	geoRegionId: int(),
	cityId: int(),
	location: varchar({ length: 255 }),
	createdByUserId: int(),
	functionalStrengths: json("functional_strengths"),
	openTo: json("open_to"),
	experience: json(),
	education: json(),
	languages: json(),
	phone: varchar({ length: 32 }),
	gender: varchar({ length: 20 }),
	nationality: varchar({ length: 100 }),
	achievements: json(),
	angelInvestments: json("angel_investments"),
	boardRoles: json("board_roles"),
	advisorRoles: json("advisor_roles"),
	companiesFounded: json("companies_founded"),
	keyAchievements: json("key_achievements"),
	interests: json(),
	availability: varchar({ length: 100 }),
	bookingRate: varchar("booking_rate", { length: 50 }),
	facebook: varchar({ length: 512 }),
	instagram: varchar({ length: 512 }),
	youtube: varchar({ length: 512 }),
	github: varchar({ length: 512 }),
},
(table) => [
	uniqueIndex("people_slug_unique").on(table.slug),
	index("idx_people_status").on(table.statusId),
]);

export const peopleRegions = mysqlTable("people_regions", {
	personId: int().notNull(),
	regionId: int().notNull(),
});

export const peopleSectors = mysqlTable("people_sectors", {
	personId: int().notNull(),
	sectorId: int().notNull(),
});

export const permissions = mysqlTable("permissions", {
	id: int().autoincrement().primaryKey(),
	resource: varchar({ length: 64 }).notNull(),
	action: varchar({ length: 32 }).notNull(),
	scope: mysqlEnum(['all','own','team']).default('own').notNull(),
	description: text(),
	isActive: tinyint().default(1),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const popups = mysqlTable("popups", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 128 }).notNull(),
	title: varchar({ length: 255 }),
	content: text(),
	imageId: int(),
	ctaText: varchar({ length: 128 }),
	ctaUrl: text(),
	type: mysqlEnum(['popup','banner','toast','slide_in']).default('popup'),
	position: mysqlEnum(['center','top','bottom','top_left','top_right','bottom_left','bottom_right']).default('center'),
	triggerType: mysqlEnum(['immediate','delay','scroll','exit_intent']).default('immediate'),
	triggerValue: int(),
	frequencyCap: mysqlEnum(['always','once','once_per_day','once_per_week','once_per_session']).default('once_per_day'),
	pageTargeting: json(),
	isActive: tinyint().default(1),
	startDate: timestamp({ mode: 'string' }),
	endDate: timestamp({ mode: 'string' }),
	viewCount: int().default(0),
	clickCount: int().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const profileClaims = mysqlTable("profile_claims", {
	id: int().autoincrement().primaryKey(),
	entityType: varchar({ length: 64 }).notNull(),
	entityId: int().notNull(),
	claimantUserId: int(),
	claimantName: varchar({ length: 255 }).notNull(),
	claimantEmail: varchar({ length: 320 }).notNull(),
	claimantRole: varchar({ length: 255 }),
	proofLinks: json(),
	proofDocumentId: int(),
	status: mysqlEnum(['pending','approved','rejected']).default('pending').notNull(),
	moderatorId: int(),
	moderatorNotes: text(),
	reviewedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	requesterType: mysqlEnum(['internal','external']).default('external').notNull(),
	source: varchar({ length: 64 }).default('public_form'),
});

export const redirects = mysqlTable("redirects", {
	id: int().autoincrement().primaryKey(),
	fromPath: varchar({ length: 768 }).notNull(),
	toPath: varchar({ length: 768 }).notNull(),
	statusCode: int().default(301).notNull(),
	isActive: tinyint().default(1),
	hitCount: int().default(0),
	lastHitAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	uniqueIndex("redirects_fromPath_unique").on(table.fromPath),
]);

export const regions = mysqlTable("regions", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 10 }),
	parentId: int(),
	isActive: tinyint().default(1),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	uniqueIndex("regions_slug_unique").on(table.slug),
]);

export const regulations = mysqlTable("regulations", {
	id: int().autoincrement().primaryKey(),
	title: varchar({ length: 512 }).notNull(),
	slug: varchar({ length: 512 }).notNull(),
	description: text(),
	content: text(),
	summary: text(),
	type: mysqlEnum(['law','regulation','guideline','framework','license','visa','tax','labor','other']).notNull(),
	country: varchar({ length: 64 }).notNull(),
	region: varchar({ length: 64 }),
	authority: varchar({ length: 255 }),
	authorityUrl: text(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	effectiveDate: date({ mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	lastUpdated: date({ mode: 'string' }),
	documentUrl: text(),
	relatedRegulations: json(),
	tags: json(),
	applicableTo: json(),
	keyPoints: json(),
	faqs: json(),
	statusId: int().default(1).notNull(),
	viewCount: int().default(0),
	isFeatured: tinyint().default(0),
	sortOrder: int().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_regulations_type").on(table.type),
	index("idx_regulations_country").on(table.country),
	index("idx_regulations_status").on(table.statusId),
	index("slug").on(table.slug),
]);

export const research = mysqlTable("research", {
	id: int().autoincrement().primaryKey(),
	title: varchar({ length: 512 }).notNull(),
	slug: varchar({ length: 512 }).notNull(),
	abstract: text(),
	content: text(),
	type: mysqlEnum(['report','deep_dive','dataset','whitepaper','analysis','other']).notNull(),
	featuredImage: text(),
	pdfUrl: text(),
	authorId: int(),
	isPremium: tinyint().default(0),
	price: decimal({ precision: 10, scale: 2 }),
	priceCurrency: varchar({ length: 3 }).default('USD'),
	statusId: int().notNull(),
	viewCount: int().default(0),
	downloadCount: int().default(0),
	publishedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	uniqueIndex("research_slug_unique").on(table.slug),
	index("idx_research_status").on(table.statusId),
]);

export const researchAttachments = mysqlTable("research_attachments", {
	id: int().autoincrement().primaryKey(),
	researchId: int().notNull(),
	mediaId: int().notNull(),
	title: varchar({ length: 255 }),
	sortOrder: int().default(0),
});

export const researchCategories = mysqlTable("research_categories", {
	researchId: int().notNull(),
	categoryId: int().notNull(),
});

export const researchRegions = mysqlTable("research_regions", {
	researchId: int().notNull(),
	regionId: int().notNull(),
});

export const researchSectors = mysqlTable("research_sectors", {
	researchId: int().notNull(),
	sectorId: int().notNull(),
});

export const researchTags = mysqlTable("research_tags", {
	researchId: int().notNull(),
	tagId: int().notNull(),
});

export const resourceCategories = mysqlTable("resource_categories", {
	resourceId: int().notNull(),
	categoryId: int().notNull(),
});

export const resourceRegions = mysqlTable("resource_regions", {
	resourceId: int().notNull(),
	regionId: int().notNull(),
});

export const resourceReviews = mysqlTable("resource_reviews", {
	id: int().autoincrement().primaryKey(),
	resourceId: int().notNull(),
	userId: int(),
	rating: decimal({ precision: 3, scale: 2 }).notNull(),
	title: varchar({ length: 255 }),
	content: text(),
	pros: json(),
	cons: json(),
	isVerified: tinyint().default(0),
	isApproved: tinyint().default(0),
	helpfulCount: int().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_resource_reviews_resource").on(table.resourceId),
	index("idx_resource_reviews_user").on(table.userId),
	index("idx_resource_reviews_rating").on(table.rating),
]);

export const resourceSectors = mysqlTable("resource_sectors", {
	resourceId: int().notNull(),
	sectorId: int().notNull(),
});

export const resourceTags = mysqlTable("resource_tags", {
	resourceId: int().notNull(),
	tagId: int().notNull(),
});

export const resources = mysqlTable("resources", {
	id: int().autoincrement().primaryKey(),
	title: varchar({ length: 512 }).notNull(),
	slug: varchar({ length: 512 }).notNull(),
	description: text(),
	shortDescription: text(),
	type: mysqlEnum(['template','toolkit','perk','regulation','tool','playbook','program','grant','other']).notNull(),
	content: text(),
	featuredImage: text(),
	downloadUrl: text(),
	externalUrl: text(),
	provider: varchar({ length: 255 }),
	providerLogo: text(),
	providerWebsite: text(),
	value: varchar({ length: 128 }),
	eligibility: text(),
	expiresAt: timestamp({ mode: 'string' }),
	isFeatured: tinyint().default(0),
	statusId: int().notNull(),
	viewCount: int().default(0),
	downloadCount: int().default(0),
	publishedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	partnerId: int(),
	affiliateUrl: text(),
	affiliateCommission: decimal({ precision: 5, scale: 2 }),
	isGated: tinyint().default(0),
	gatedFields: json(),
	leadCount: int().default(0),
	clickCount: int().default(0),
	conversionCount: int().default(0),
	pricingModel: varchar({ length: 64 }),
	targetStage: varchar({ length: 64 }),
	targetAudience: json(),
	features: json(),
	pros: json(),
	cons: json(),
	rating: decimal({ precision: 3, scale: 2 }),
	reviewCount: int().default(0),
	sortOrder: int().default(0),
},
(table) => [
	uniqueIndex("resources_slug_unique").on(table.slug),
	index("idx_resources_status").on(table.statusId),
]);

export const rolePermissions = mysqlTable("role_permissions", {
	id: int().autoincrement().primaryKey(),
	roleId: int().notNull(),
	permissionId: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const roles = mysqlTable("roles", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 64 }).notNull(),
	displayName: varchar({ length: 128 }).notNull(),
	description: text(),
	roleType: mysqlEnum(['system','external']).default('system').notNull(),
	parentRoleId: int(),
	isActive: tinyint().default(1),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	uniqueIndex("roles_name_unique").on(table.name),
]);

export const searchAnalytics = mysqlTable("search_analytics", {
	id: int().autoincrement().primaryKey(),
	query: varchar({ length: 500 }).notNull(),
	entityType: varchar("entity_type", { length: 50 }),
	resultsCount: int("results_count").default(0),
	userId: int("user_id"),
	sessionId: varchar("session_id", { length: 128 }),
	ipHash: varchar("ip_hash", { length: 64 }),
	userAgent: varchar("user_agent", { length: 512 }),
	clickedResultId: int("clicked_result_id"),
	clickedResultType: varchar("clicked_result_type", { length: 50 }),
	searchedAt: timestamp("searched_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("search_analytics_query_idx").on(table.query),
	index("search_analytics_entity_idx").on(table.entityType),
	index("search_analytics_date_idx").on(table.searchedAt),
	index("search_analytics_user_idx").on(table.userId),
]);

export const sectors = mysqlTable("sectors", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
	description: text(),
	icon: varchar({ length: 255 }),
	isActive: tinyint().default(1),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	uniqueIndex("sectors_slug_unique").on(table.slug),
]);

export const seo404Monitor = mysqlTable("seo_404_monitor", {
	id: int().autoincrement().primaryKey(),
	requestedUrl: varchar({ length: 2048 }).notNull(),
	hitCount: int().default(1).notNull(),
	lastHitAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	firstHitAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	referrer: text(),
	userAgent: text(),
	suggestedRedirectUrl: text(),
	suggestedConfidence: int().default(0),
	isResolved: tinyint().default(0),
	resolvedRedirectId: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const seoAuditHistory = mysqlTable("seo_audit_history", {
	id: int().autoincrement().primaryKey(),
	auditId: varchar({ length: 64 }).notNull(),
	score: int().notNull(),
	totalIssues: int().notNull(),
	criticalCount: int().notNull(),
	warningCount: int().notNull(),
	infoCount: int().notNull(),
	issuesSnapshot: json(),
	triggeredBy: mysqlEnum(['manual','scheduled']).default('manual').notNull(),
	runById: int(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("auditId").on(table.auditId),
]);

export const seoAuditIgnoredIssues = mysqlTable("seo_audit_ignored_issues", {
	id: int().autoincrement().primaryKey(),
	issueId: varchar("issue_id", { length: 255 }).notNull(),
	issueType: varchar("issue_type", { length: 64 }).notNull(),
	entityType: varchar("entity_type", { length: 64 }).notNull(),
	entityId: int("entity_id").notNull(),
	entityTitle: varchar("entity_title", { length: 500 }),
	reason: text(),
	ignoredById: int("ignored_by_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("issue_id_idx").on(table.issueId),
]);

export const seoAuditSchedule = mysqlTable("seo_audit_schedule", {
	id: int().autoincrement().primaryKey(),
	isEnabled: tinyint().default(0),
	frequency: mysqlEnum(['daily','weekly','monthly']).default('weekly').notNull(),
	dayOfWeek: int().default(1),
	timeOfDay: varchar({ length: 5 }).default('09:00'),
	lastRunAt: timestamp({ mode: 'string' }),
	nextRunAt: timestamp({ mode: 'string' }),
	notifyOnCritical: tinyint().default(1),
	notifyEmail: varchar({ length: 320 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const seoHealthIssues = mysqlTable("seo_health_issues", {
	id: int().autoincrement().primaryKey(),
	entityType: varchar({ length: 64 }).notNull(),
	entityId: int().notNull(),
	pageUrl: text().notNull(),
	issueType: varchar({ length: 64 }).notNull(),
	severity: mysqlEnum(['low','medium','high','critical']).default('medium').notNull(),
	issueDetails: text(),
	suggestedFix: text(),
	isResolved: tinyint().default(0),
	resolvedAt: timestamp({ mode: 'string' }),
	resolvedById: int(),
	lastCheckedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const seoHreflangMappings = mysqlTable("seo_hreflang_mappings", {
	id: int().autoincrement().primaryKey(),
	entityType: varchar({ length: 64 }).notNull(),
	entityId: int().notNull(),
	language: varchar({ length: 10 }).notNull(),
	linkedEntityId: int(),
	linkedUrl: text(),
	isDefault: tinyint().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const seoIndexingRules = mysqlTable("seo_indexing_rules", {
	id: int().autoincrement().primaryKey(),
	module: varchar({ length: 64 }).notNull(),
	pageType: varchar({ length: 64 }).notNull(),
	indexingRule: varchar({ length: 64 }).default('index, follow').notNull(),
	canonicalRule: varchar({ length: 64 }).default('self').notNull(),
	customCanonicalPattern: text(),
	isEnabled: tinyint().default(1).notNull(),
	priority: int().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const seoMeta = mysqlTable("seo_meta", {
	id: int().autoincrement().primaryKey(),
	entityType: varchar({ length: 64 }).notNull(),
	entityId: int().notNull(),
	metaTitle: varchar({ length: 255 }),
	metaDescription: text(),
	metaKeywords: varchar({ length: 512 }),
	ogTitle: varchar({ length: 255 }),
	ogDescription: text(),
	ogImage: text(),
	canonicalUrl: text(),
	robotsDirective: varchar({ length: 64 }).default('index,follow'),
	structuredDataOverride: json(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const seoSettings = mysqlTable("seo_settings", {
	id: int().autoincrement().primaryKey(),
	settingKey: varchar({ length: 128 }).notNull(),
	settingValue: json(),
	settingGroup: varchar({ length: 64 }).default('general'),
	description: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	uniqueIndex("seo_settings_key_unique").on(table.settingKey),
]);

export const settings = mysqlTable("settings", {
	id: int().autoincrement().primaryKey(),
	key: varchar({ length: 128 }).notNull(),
	value: json(),
	type: varchar({ length: 32 }).default('string'),
	group: varchar({ length: 64 }).default('general'),
	label: varchar({ length: 255 }),
	description: text(),
	isPublic: tinyint().default(0),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	uniqueIndex("settings_key_unique").on(table.key),
]);

export const starterPacks = mysqlTable("starter_packs", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
	tagline: varchar({ length: 255 }),
	description: text(),
	featuredImage: text(),
	targetStage: mysqlEnum(['idea','pre_seed','seed','series_a','growth']).default('seed'),
	targetRegion: varchar({ length: 64 }),
	includedPerks: json(),
	includedTemplates: json(),
	includedTools: json(),
	includedPlaybooks: json(),
	totalValueDisplay: varchar({ length: 64 }),
	isFeatured: tinyint().default(0),
	isActive: tinyint().default(1),
	sortOrder: int().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	uniqueIndex("starter_packs_slug_unique").on(table.slug),
]);

export const subscriberLists = mysqlTable("subscriber_lists", {
	id: int().autoincrement().primaryKey(),
	subscriberId: int().notNull(),
	listId: int().notNull(),
	subscribedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	unsubscribedAt: timestamp({ mode: 'string' }),
});

export const subscribers = mysqlTable("subscribers", {
	id: int().autoincrement().primaryKey(),
	email: varchar({ length: 320 }).notNull(),
	userId: int(),
	firstName: varchar({ length: 128 }),
	lastName: varchar({ length: 128 }),
	subscriberType: mysqlEnum(['founder','investor','employee','job_seeker','journalist','general']).default('general'),
	companyName: varchar({ length: 255 }),
	jobTitle: varchar({ length: 128 }),
	isVerified: tinyint().default(0),
	verificationToken: varchar({ length: 64 }),
	verifiedAt: timestamp({ mode: 'string' }),
	source: varchar({ length: 64 }),
	sourceUrl: text(),
	utmSource: varchar({ length: 128 }),
	utmMedium: varchar({ length: 128 }),
	utmCampaign: varchar({ length: 128 }),
	preferredLanguage: varchar({ length: 10 }).default('en'),
	countryCode: varchar({ length: 2 }),
	timezone: varchar({ length: 64 }),
	status: mysqlEnum(['active','unsubscribed','bounced','complained']).default('active').notNull(),
	unsubscribedAt: timestamp({ mode: 'string' }),
	unsubscribeReason: text(),
	lastEmailSentAt: timestamp({ mode: 'string' }),
	lastEmailOpenedAt: timestamp({ mode: 'string' }),
	lastEmailClickedAt: timestamp({ mode: 'string' }),
	emailsSent: int().default(0),
	emailsOpened: int().default(0),
	emailsClicked: int().default(0),
	ipAddress: varchar({ length: 45 }),
	userAgent: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	uniqueIndex("subscribers_email_unique").on(table.email),
]);

export const subscriptionLists = mysqlTable("subscription_lists", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 128 }).notNull(),
	slug: varchar({ length: 128 }).notNull(),
	description: text(),
	frequency: mysqlEnum(['daily','weekly','biweekly','monthly','on_demand']).default('weekly'),
	isPublic: tinyint().default(1),
	isDefault: tinyint().default(0),
	subscriberCount: int().default(0),
	isActive: tinyint().default(1),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	uniqueIndex("subscription_lists_slug_unique").on(table.slug),
]);

export const suggestedUpdates = mysqlTable("suggested_updates", {
	id: int().autoincrement().primaryKey(),
	entityType: varchar({ length: 64 }).notNull(),
	entityId: int().notNull(),
	submitterUserId: int(),
	submitterName: varchar({ length: 255 }),
	submitterEmail: varchar({ length: 320 }),
	proposedChanges: json().notNull(),
	reason: text(),
	evidenceLinks: json(),
	evidenceDocumentId: int(),
	status: mysqlEnum(['pending','approved','rejected']).default('pending').notNull(),
	moderatorId: int(),
	moderatorNotes: text(),
	reviewedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	requesterType: mysqlEnum(['internal','external']).default('external').notNull(),
	source: varchar({ length: 64 }).default('public_form'),
});

export const tags = mysqlTable("tags", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
	description: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	tagType: mysqlEnum(['product_tech','regulation','deal_business','sector','region','hub_program','investor','company','event','general']).default('general'),
	isActive: tinyint().default(1),
	sortOrder: int().default(0),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	uniqueIndex("tags_slug_unique").on(table.slug),
]);

// ============================================================
// TALENT PLATFORM — Phase 1a: Multi-tenancy
// ----------------------------------------------------------------------
// tenants:               one row per SaaS customer (the legacy
//                        public job board has no row — `tenantId IS NULL`
//                        on `jobs` / `job_applications` is the marker).
// tenant_memberships:    users ↔ tenants with a tenant-scoped role.
// tenant_audit_log:      separate from the global `audit_logs` table —
//                        tenant admins should see their own audit trail
//                        without cross-tenant leakage.
// ============================================================

export const tenants = mysqlTable("tenants", {
	id: int().autoincrement().primaryKey(),
	slug: varchar({ length: 64 }).notNull(),                                                        // subdomain segment, lowercase
	name: varchar({ length: 255 }).notNull(),
	customDomain: varchar("custom_domain", { length: 255 }),                                        // CNAME target — paid tier
	plan: mysqlEnum(['free','starter','growth','enterprise']).default('free').notNull(),
	status: mysqlEnum(['trial','active','suspended','cancelled']).default('trial').notNull(),
	settings: json(),                                                                               // arbitrary per-tenant config
	dataResidency: mysqlEnum("data_residency", ['us','eu','ksa']).default('us').notNull(),          // Phase 8 enforces residency; schema captures it now
	brandingLogoUrl: text("branding_logo_url"),
	brandingPrimaryColor: varchar("branding_primary_color", { length: 16 }),
	trialEndsAt: timestamp("trial_ends_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
	uniqueIndex("tenants_slug_unique").on(table.slug),
	uniqueIndex("tenants_custom_domain_unique").on(table.customDomain),
	index("idx_tenants_status").on(table.status),
]);

export const tenantMemberships = mysqlTable("tenant_memberships", {
	id: int().autoincrement().primaryKey(),
	tenantId: int("tenant_id").notNull(),
	userId: int("user_id").notNull(),
	role: mysqlEnum(['owner','recruiter','hiring_manager','interviewer','viewer']).default('recruiter').notNull(),
	status: mysqlEnum(['invited','active','suspended','left']).default('active').notNull(),
	invitedById: int("invited_by_id"),
	invitedAt: timestamp("invited_at", { mode: 'string' }).defaultNow().notNull(),
	joinedAt: timestamp("joined_at", { mode: 'string' }),
	lastActiveAt: timestamp("last_active_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
	uniqueIndex("tenant_memberships_unique").on(table.tenantId, table.userId),
	index("idx_tm_user").on(table.userId),
	index("idx_tm_tenant_status").on(table.tenantId, table.status),
]);

export const tenantAuditLog = mysqlTable("tenant_audit_log", {
	id: int().autoincrement().primaryKey(),
	tenantId: int("tenant_id").notNull(),
	userId: int("user_id"),
	action: varchar({ length: 64 }).notNull(),
	resourceType: varchar("resource_type", { length: 64 }),
	resourceId: int("resource_id"),
	changes: json(),
	ipAddress: varchar("ip_address", { length: 45 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_tal_tenant_created").on(table.tenantId, table.createdAt),
]);

export const technicalSeoIssues = mysqlTable("technical_seo_issues", {
	id: int().autoincrement().primaryKey(),
	coverageId: int("coverage_id"),
	url: text().notNull(),
	pageType: varchar("page_type", { length: 64 }).default('article').notNull(),
	entityType: varchar("entity_type", { length: 64 }),
	entityId: int("entity_id"),
	issueCategory: mysqlEnum("issue_category", ['canonical','schema_markup','redirect_chain','hreflang','soft_404','meta_robots','duplicate_content','not_indexed','crawl_blocked','missing_sitemap','other']).notNull(),
	issueType: varchar("issue_type", { length: 128 }).notNull(),
	severity: mysqlEnum(['critical','high','medium','low']).default('medium').notNull(),
	description: text(),
	autoFixable: tinyint("auto_fixable").default(0),
	suggestedFix: text("suggested_fix"),
	fixPayload: text("fix_payload"),
	fixStatus: mysqlEnum("fix_status", ['pending','auto_fixed','manually_fixed','ignored','needs_review']).default('pending').notNull(),
	fixedAt: timestamp("fixed_at", { mode: 'string' }),
	fixedById: int("fixed_by_id"),
	isResolved: tinyint("is_resolved").default(0),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	flaggedForReview: tinyint("flagged_for_review").default(0),
	reviewNotes: text("review_notes"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("tech_seo_category_idx").on(table.issueCategory),
	index("tech_seo_status_idx").on(table.fixStatus),
]);

export const technicalSeoReports = mysqlTable("technical_seo_reports", {
	id: int().autoincrement().primaryKey(),
	reportType: mysqlEnum("report_type", ['weekly','daily','manual']).default('weekly').notNull(),
	reportDate: varchar("report_date", { length: 20 }).notNull(),
	totalPages: int("total_pages").default(0),
	indexedPages: int("indexed_pages").default(0),
	notIndexedPages: int("not_indexed_pages").default(0),
	newlyIndexedPages: int("newly_indexed_pages").default(0),
	newIssuesFound: int("new_issues_found").default(0),
	issuesAutoFixed: int("issues_auto_fixed").default(0),
	issuesFlaggedForReview: int("issues_flagged_for_review").default(0),
	submissionsCount: int("submissions_count").default(0),
	submissionsSucceeded: int("submissions_succeeded").default(0),
	issueBreakdown: text("issue_breakdown"),
	newlyIndexedUrls: text("newly_indexed_urls"),
	persistentIssueUrls: text("persistent_issue_urls"),
	manualReviewUrls: text("manual_review_urls"),
	reportNarrative: text("report_narrative"),
	generatedById: int("generated_by_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("tech_report_date_idx").on(table.reportDate),
	index("tech_report_type_idx").on(table.reportType),
]);

export const topics = mysqlTable("topics", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
	description: text(),
	isActive: tinyint().default(1),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	uniqueIndex("topics_slug_unique").on(table.slug),
]);

export const userRoles = mysqlTable("user_roles", {
	id: int().autoincrement().primaryKey(),
	userId: int().notNull(),
	roleId: int().notNull(),
	assignedById: int(),
	expiresAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const users = mysqlTable("users", {
	id: int().autoincrement().primaryKey(),
	openId: varchar({ length: 64 }).notNull(),
	name: text(),
	email: varchar({ length: 320 }),
	loginMethod: varchar({ length: 64 }),
	role: mysqlEnum(['user','admin','editor','senior_editor','author','moderator','event_correspondent','event_tenant']).default('user').notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).defaultNow().notNull(),
	avatar: text(),
	bio: text(),
	password: varchar({ length: 255 }),
	nickname: varchar({ length: 128 }),
	publicName: varchar({ length: 255 }),
	authorBio: text(),
	jobTitle: varchar({ length: 128 }),
	twitterHandle: varchar({ length: 64 }),
	linkedinUrl: text(),
	username: varchar({ length: 64 }),
	company: varchar({ length: 255 }),
	location: varchar({ length: 255 }),
	website: text(),
	interests: json(),
	preferredLocations: json(),
	salaryMin: int(),
	salaryMax: int(),
	cvUrl: text(),
},
(table) => [
	uniqueIndex("users_openId_unique").on(table.openId),
	uniqueIndex("users_username_unique").on(table.username),
]);

export const vendors = mysqlTable("vendors", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
	description: text(),
	shortDescription: varchar({ length: 512 }),
	logo: text(),
	website: text(),
	category: mysqlEnum(['legal','accounting','banking','hr','marketing','development','design','consulting','other']).notNull(),
	subcategory: varchar({ length: 128 }),
	partnerId: int(),
	isVerified: tinyint().default(0),
	isPartner: tinyint().default(0),
	isFeatured: tinyint().default(0),
	rating: decimal({ precision: 3, scale: 2 }),
	reviewCount: int().default(0),
	priceRange: mysqlEnum(['$','$$','$$$','$$$$']),
	services: json(),
	specializations: json(),
	targetStages: json(),
	regions: json(),
	contactEmail: varchar({ length: 320 }),
	contactPhone: varchar({ length: 32 }),
	address: text(),
	statusId: int().default(1).notNull(),
	viewCount: int().default(0),
	sortOrder: int().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_vendors_category").on(table.category),
	index("idx_vendors_partner").on(table.partnerId),
	index("idx_vendors_status").on(table.statusId),
	index("slug").on(table.slug),
]);

export const workflowAuditLog = mysqlTable("workflow_audit_log", {
	id: int().autoincrement().primaryKey(),
	entityType: varchar({ length: 64 }).notNull(),
	entityId: int().notNull(),
	fromStatusId: int(),
	toStatusId: int().notNull(),
	userId: int().notNull(),
	comment: text(),
	metadata: json(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const workflowStatuses = mysqlTable("workflow_statuses", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 64 }).notNull(),
	slug: varchar({ length: 64 }).notNull(),
	description: text(),
	color: varchar({ length: 7 }).default('#6B7280'),
	sortOrder: int().default(0),
	workflowType: varchar({ length: 64 }).notNull(),
	isInitial: tinyint().default(0),
	isFinal: tinyint().default(0),
	isPublished: tinyint().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const workflowTransitions = mysqlTable("workflow_transitions", {
	id: int().autoincrement().primaryKey(),
	workflowType: varchar({ length: 64 }).notNull(),
	fromStatusId: int().notNull(),
	toStatusId: int().notNull(),
	name: varchar({ length: 128 }).notNull(),
	allowedRoles: json().notNull(),
	requiresComment: tinyint().default(0),
	notifyRoles: json(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const wpMigrationLog = mysqlTable("wp_migration_log", {
	id: int().autoincrement().primaryKey(),
	wpPostId: int().notNull(),
	wpPostType: varchar({ length: 64 }).notNull(),
	wpUrl: text().notNull(),
	newEntityType: varchar({ length: 64 }).notNull(),
	newEntityId: int().notNull(),
	newUrl: text().notNull(),
	status: mysqlEnum(['success','redirect_created','failed']).default('success'),
	notes: text(),
	migratedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const writerApplications = mysqlTable("writer_applications", {
	id: int().autoincrement().primaryKey(),
	userId: int(),
	email: varchar({ length: 320 }).notNull(),
	fullName: varchar({ length: 255 }).notNull(),
	bio: text(),
	expertiseAreas: json(),
	writingSamples: json(),
	linkedinUrl: text(),
	twitterHandle: varchar({ length: 64 }),
	portfolioUrl: text(),
	whyJoin: text(),
	proposedTopics: text(),
	status: mysqlEnum(['pending','under_review','approved','rejected']).default('pending').notNull(),
	reviewedById: int(),
	reviewedAt: timestamp({ mode: 'string' }),
	reviewNotes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const writerPayouts = mysqlTable("writer_payouts", {
	id: int().autoincrement().primaryKey(),
	writerId: int().notNull(),
	amount: decimal({ precision: 15, scale: 2 }).notNull(),
	currency: varchar({ length: 3 }).default('USD'),
	paymentMethod: mysqlEnum(['bank_transfer','paypal','wise']).notNull(),
	paymentReference: varchar({ length: 255 }),
	status: mysqlEnum(['pending','processing','completed','failed']).default('pending').notNull(),
	periodMonth: varchar({ length: 7 }).notNull(),
	processedAt: timestamp({ mode: 'string' }),
	processedById: int(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const writerProfiles = mysqlTable("writer_profiles", {
	id: int().autoincrement().primaryKey(),
	userId: int().notNull(),
	tier: mysqlEnum(['new','regular','senior','expert']).default('new').notNull(),
	revenueShareRate: decimal({ precision: 5, scale: 2 }).default('40.00'),
	expertiseAreas: json(),
	bio: text(),
	totalArticles: int().default(0),
	totalPageviews: int().default(0),
	totalEarnings: decimal({ precision: 15, scale: 2 }).default('0.00'),
	paymentMethod: mysqlEnum(['bank_transfer','paypal','wise']).default('bank_transfer'),
	paymentDetails: json(),
	taxFormType: varchar({ length: 16 }),
	taxFormUrl: text(),
	taxFormVerified: tinyint().default(0),
	status: mysqlEnum(['active','paused','terminated']).default('active').notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	uniqueIndex("writer_profiles_userId_unique").on(table.userId),
]);


export const formSubmissions = mysqlTable("form_submissions", {
	id: int().autoincrement().primaryKey().primaryKey(),
	formType: varchar({ length: 64 }).notNull(),
	email: varchar({ length: 320 }).notNull(),
	name: varchar({ length: 255 }),
	payload: json().notNull(),
	ipHash: varchar({ length: 16 }),
	userAgent: varchar({ length: 512 }),
	source: varchar({ length: 128 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

// ============================================================
// EDITIONS — Reuters-style country-anchored views of the site
// ============================================================
// Each edition is a configurable "country view" the visitor browses
// the site in. Detected from CF-IPCountry on first visit, persisted
// in the `tsEdition` cookie, switchable via the header dropdown.
// The active edition biases the ORDER BY on every public listing
// query (country's content first, then default sort).
//
// supportedLocales is intentionally a JSON column from day one so
// the upcoming language switcher can read it without a schema
// change. Today every row defaults to ["en"]; Arabic / Turkish
// rows get updated when the locale infrastructure lands.
// ============================================================
export const editions = mysqlTable("editions", {
  id: int().autoincrement().primaryKey(),
  countryId: int("country_id"),                                          // FK → countries.id; NULL only for the International row
  name: varchar({ length: 64 }).notNull(),                               // "Saudi Arabia", "International"
  slug: varchar({ length: 32 }).notNull(),                               // "sa", "ae", "intl"
  flagEmoji: varchar("flag_emoji", { length: 8 }),                       // "🇸🇦" — cosmetic, falls back to iso2 in the UI
  isInternational: tinyint("is_international").default(0).notNull(),     // exactly one row = 1; defines the catch-all behavior
  isActive: tinyint("is_active").default(1).notNull(),
  supportedLocales: json("supported_locales").default(['en']),           // forward-compat: ["en","ar"], ["en","tr"], etc.
  sortOrder: int("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("editions_slug_unique").on(table.slug),
  uniqueIndex("editions_country_id_unique").on(table.countryId),
  index("idx_editions_active_sort").on(table.isActive, table.sortOrder),
]);

// ============================================================
// TALENT PLATFORM — Phases 2–8
// ----------------------------------------------------------------------
// Migration: 0045_talent_platform.sql
// Grouped here at the end so the talent product's table graph stays
// readable as one unit. The tenancy primitives (tenants /
// tenant_memberships / tenant_audit_log) live earlier in this file
// (Phase 1a) — those are infrastructure; this block is the product.
// ============================================================

// -------------------- Phase 2 — Candidate core --------------------

export const candidates = mysqlTable("candidates", {
  id: int().autoincrement().primaryKey(),
  tenantId: int("tenant_id"),                                                                        // NULL = global candidate (legacy)
  userId: int("user_id").notNull(),
  headline: varchar({ length: 255 }),
  currentTitle: varchar("current_title", { length: 255 }),
  currentCompany: varchar("current_company", { length: 255 }),
  yearsExperience: int("years_experience"),
  location: varchar({ length: 255 }),
  countryId: int("country_id"),
  cityId: int("city_id"),
  openToRemote: tinyint("open_to_remote").default(0).notNull(),
  openToRelocation: tinyint("open_to_relocation").default(0).notNull(),
  salaryExpectationMin: decimal("salary_expectation_min", { precision: 12, scale: 2 }),
  salaryExpectationMax: decimal("salary_expectation_max", { precision: 12, scale: 2 }),
  salaryExpectationCurrency: varchar("salary_expectation_currency", { length: 3 }).default('USD'),
  visaStatus: varchar("visa_status", { length: 64 }),
  noticePeriod: varchar("notice_period", { length: 64 }),
  githubHandle: varchar("github_handle", { length: 128 }),
  linkedinUrl: text("linkedin_url"),
  portfolioUrl: text("portfolio_url"),
  resumeMediaId: int("resume_media_id"),
  parsedResumeJson: json("parsed_resume_json"),
  parsedResumeAt: timestamp("parsed_resume_at", { mode: 'string' }),
  summary: text(),
  consentDataProcessingAt: timestamp("consent_data_processing_at", { mode: 'string' }),
  consentMarketingAt: timestamp("consent_marketing_at", { mode: 'string' }),
  consentThirdPartyAt: timestamp("consent_third_party_at", { mode: 'string' }),
  isArchived: tinyint("is_archived").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  lastActiveAt: timestamp("last_active_at", { mode: 'string' }),
}, (table) => [
  uniqueIndex("candidates_tenant_user_unique").on(table.tenantId, table.userId),
  index("idx_candidates_user").on(table.userId),
  index("idx_candidates_tenant_active").on(table.tenantId, table.isArchived, table.lastActiveAt),
]);

export const candidateTenantVisibility = mysqlTable("candidate_tenant_visibility", {
  id: int().autoincrement().primaryKey(),
  candidateId: int("candidate_id").notNull(),
  tenantId: int("tenant_id").notNull(),
  source: mysqlEnum(['signup','referral','imported','application','admin']).default('signup').notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("cv_candidate_tenant_unique").on(table.candidateId, table.tenantId),
  index("idx_cv_tenant").on(table.tenantId),
]);

export const resumeParses = mysqlTable("resume_parses", {
  id: int().autoincrement().primaryKey(),
  candidateId: int("candidate_id").notNull(),
  mediaId: int("media_id").notNull(),
  provider: varchar({ length: 32 }),
  model: varchar({ length: 64 }),
  rawText: text("raw_text"),
  parsedJson: json("parsed_json"),
  qualityScore: int("quality_score"),
  error: text(),
  latencyMs: int("latency_ms"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("idx_resume_parses_candidate").on(table.candidateId),
]);

// -------------------- Phase 3 — ATS pipeline --------------------

export const pipelineStages = mysqlTable("pipeline_stages", {
  id: int().autoincrement().primaryKey(),
  tenantId: int("tenant_id"),                // NULL = global pipeline for legacy public jobs (migration 0046)
  jobId: int("job_id"),
  name: varchar({ length: 128 }).notNull(),
  slug: varchar({ length: 64 }).notNull(),
  position: int().notNull(),
  color: varchar({ length: 16 }),
  category: mysqlEnum(['sourcing','screening','interviewing','offer','hired','rejected']).default('screening').notNull(),
  isTerminal: tinyint("is_terminal").default(0).notNull(),
  isDefault: tinyint("is_default").default(0).notNull(),
  autoEmailTemplateId: int("auto_email_template_id"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_pipeline_tenant_job").on(table.tenantId, table.jobId, table.position),
]);

export const candidateStageHistory = mysqlTable("candidate_stage_history", {
  id: int().autoincrement().primaryKey(),
  tenantId: int("tenant_id").notNull(),
  applicationId: int("application_id").notNull(),
  fromStageId: int("from_stage_id"),
  toStageId: int("to_stage_id").notNull(),
  movedById: int("moved_by_id").notNull(),
  reason: text(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("idx_csh_application").on(table.applicationId),
  index("idx_csh_tenant_created").on(table.tenantId, table.createdAt),
]);

export const interviews = mysqlTable("interviews", {
  id: int().autoincrement().primaryKey(),
  tenantId: int("tenant_id").notNull(),
  applicationId: int("application_id").notNull(),
  stageId: int("stage_id"),
  type: mysqlEnum(['phone_screen','technical','system_design','behavioral','culture','final','ai_interview']).default('phone_screen').notNull(),
  scheduledAt: timestamp("scheduled_at", { mode: 'string' }),
  durationMinutes: int("duration_minutes"),
  location: varchar({ length: 255 }),
  meetingUrl: text("meeting_url"),
  assignedInterviewerIds: json("assigned_interviewer_ids"),
  status: mysqlEnum(['scheduled','rescheduled','completed','cancelled','no_show']).default('scheduled').notNull(),
  createdById: int("created_by_id").notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_interviews_application").on(table.applicationId),
  index("idx_interviews_tenant_scheduled").on(table.tenantId, table.scheduledAt),
]);

export const interviewFeedback = mysqlTable("interview_feedback", {
  id: int().autoincrement().primaryKey(),
  tenantId: int("tenant_id").notNull(),
  interviewId: int("interview_id").notNull(),
  interviewerId: int("interviewer_id").notNull(),
  overallRating: int("overall_rating"),
  technicalRating: int("technical_rating"),
  communicationRating: int("communication_rating"),
  cultureRating: int("culture_rating"),
  recommendation: mysqlEnum(['strong_hire','hire','no_hire','strong_no_hire','unsure']),
  strengths: text(),
  concerns: text(),
  notes: text(),
  submittedAt: timestamp("submitted_at", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("if_interview_interviewer_unique").on(table.interviewId, table.interviewerId),
  index("idx_if_tenant").on(table.tenantId),
]);

export const offers = mysqlTable("offers", {
  id: int().autoincrement().primaryKey(),
  tenantId: int("tenant_id").notNull(),
  applicationId: int("application_id").notNull(),
  extendedById: int("extended_by_id").notNull(),
  baseSalary: decimal("base_salary", { precision: 12, scale: 2 }),
  bonus: decimal({ precision: 12, scale: 2 }),
  equity: text(),
  currency: varchar({ length: 3 }).default('USD'),
  startDate: date("start_date"),
  expiresAt: timestamp("expires_at", { mode: 'string' }),
  status: mysqlEnum(['drafted','sent','accepted','declined','withdrawn','expired']).default('drafted').notNull(),
  letterBody: text("letter_body"),
  declineReason: text("decline_reason"),
  respondedAt: timestamp("responded_at", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_offers_application").on(table.applicationId),
  index("idx_offers_tenant_status").on(table.tenantId, table.status),
]);

export const recruiterNotes = mysqlTable("recruiter_notes", {
  id: int().autoincrement().primaryKey(),
  tenantId: int("tenant_id").notNull(),
  applicationId: int("application_id"),
  candidateId: int("candidate_id"),
  authorId: int("author_id").notNull(),
  body: text().notNull(),
  visibility: mysqlEnum(['private','team','tenant']).default('team').notNull(),
  mentions: json(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_rn_application").on(table.applicationId),
  index("idx_rn_candidate").on(table.candidateId),
  index("idx_rn_tenant_created").on(table.tenantId, table.createdAt),
]);

// -------------------- Phase 4 — GitHub Intelligence --------------------

export const githubProfiles = mysqlTable("github_profiles", {
  id: int().autoincrement().primaryKey(),
  candidateId: int("candidate_id").notNull(),
  githubUserId: bigint("github_user_id", { mode: 'number' }).notNull(),
  handle: varchar({ length: 128 }).notNull(),
  name: varchar({ length: 255 }),
  bio: text(),
  avatarUrl: text("avatar_url"),
  company: varchar({ length: 255 }),
  location: varchar({ length: 255 }),
  followers: int(),
  following: int(),
  publicRepos: int("public_repos"),
  createdOnGithubAt: timestamp("created_on_github_at", { mode: 'string' }),
  oauthAccessTokenEncrypted: text("oauth_access_token_encrypted"),
  oauthRefreshTokenEncrypted: text("oauth_refresh_token_encrypted"),
  oauthScopes: json("oauth_scopes"),
  installationId: bigint("installation_id", { mode: 'number' }),
  lastSyncedAt: timestamp("last_synced_at", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("github_profiles_candidate_unique").on(table.candidateId),
  uniqueIndex("github_profiles_user_unique").on(table.githubUserId),
]);

export const githubRepos = mysqlTable("github_repos", {
  id: int().autoincrement().primaryKey(),
  profileId: int("profile_id").notNull(),
  githubRepoId: bigint("github_repo_id", { mode: 'number' }).notNull(),
  name: varchar({ length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 512 }).notNull(),
  description: text(),
  isFork: tinyint("is_fork").default(0).notNull(),
  primaryLanguage: varchar("primary_language", { length: 64 }),
  languages: json(),
  stars: int(),
  forks: int(),
  openIssues: int("open_issues"),
  lastPushAt: timestamp("last_push_at", { mode: 'string' }),
  topics: json(),
  homepage: text(),
  commitCount30d: int("commit_count_30d"),
  commitCountTotal: int("commit_count_total"),
  isArchived: tinyint("is_archived").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("github_repos_profile_repo_unique").on(table.profileId, table.githubRepoId),
  index("idx_github_repos_lang").on(table.primaryLanguage),
]);

export const githubSignals = mysqlTable("github_signals", {
  id: int().autoincrement().primaryKey(),
  profileId: int("profile_id").notNull(),
  signalType: mysqlEnum("signal_type", ['language_distribution','contribution_cadence','project_velocity','collaboration','tech_stack','open_source_impact','ai_summary']).notNull(),
  payload: json().notNull(),
  score: int(),
  computedAt: timestamp("computed_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("idx_gh_signals_profile_type").on(table.profileId, table.signalType),
]);

export const githubFetchJobs = mysqlTable("github_fetch_jobs", {
  id: int().autoincrement().primaryKey(),
  profileId: int("profile_id").notNull(),
  jobType: mysqlEnum("job_type", ['initial_sync','incremental','signals_compute','manual_refresh']).notNull(),
  status: mysqlEnum(['queued','running','completed','failed','retrying']).default('queued').notNull(),
  attempts: int().default(0).notNull(),
  startedAt: timestamp("started_at", { mode: 'string' }),
  completedAt: timestamp("completed_at", { mode: 'string' }),
  error: text(),
  payload: json(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_gfj_profile").on(table.profileId),
  index("idx_gfj_status").on(table.status, table.createdAt),
]);

// -------------------- Phase 5 — Assessment engine --------------------

export const assessmentTemplates = mysqlTable("assessment_templates", {
  id: int().autoincrement().primaryKey(),
  tenantId: int("tenant_id").notNull(),
  name: varchar({ length: 255 }).notNull(),
  slug: varchar({ length: 255 }).notNull(),
  description: text(),
  category: mysqlEnum(['coding','system_design','technical_screen','behavioral','ai_interview','custom']).default('coding').notNull(),
  durationMinutes: int("duration_minutes").default(60).notNull(),
  passThreshold: int("pass_threshold"),
  totalPoints: int("total_points"),
  isActive: tinyint("is_active").default(1).notNull(),
  createdById: int("created_by_id"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("at_tenant_slug_unique").on(table.tenantId, table.slug),
  index("idx_at_tenant_active").on(table.tenantId, table.isActive),
]);

export const assessmentQuestions = mysqlTable("assessment_questions", {
  id: int().autoincrement().primaryKey(),
  templateId: int("template_id").notNull(),
  position: int().default(0).notNull(),
  type: mysqlEnum(['coding','multiple_choice','short_answer','long_answer','system_design','file_upload']).notNull(),
  prompt: text().notNull(),
  starterCode: text("starter_code"),
  language: varchar({ length: 32 }),
  testCases: json("test_cases"),
  choices: json(),
  correctChoiceKeys: json("correct_choice_keys"),
  rubric: text(),
  points: int().default(10).notNull(),
  timeLimitSeconds: int("time_limit_seconds"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_aq_template").on(table.templateId, table.position),
]);

export const assessmentAttempts = mysqlTable("assessment_attempts", {
  id: int().autoincrement().primaryKey(),
  tenantId: int("tenant_id").notNull(),
  templateId: int("template_id").notNull(),
  candidateId: int("candidate_id").notNull(),
  applicationId: int("application_id"),
  invitedById: int("invited_by_id").notNull(),
  inviteToken: varchar("invite_token", { length: 128 }).notNull(),
  expiresAt: timestamp("expires_at", { mode: 'string' }),
  startedAt: timestamp("started_at", { mode: 'string' }),
  submittedAt: timestamp("submitted_at", { mode: 'string' }),
  expiredAt: timestamp("expired_at", { mode: 'string' }),
  status: mysqlEnum(['invited','in_progress','submitted','expired','graded','disqualified']).default('invited').notNull(),
  totalScore: int("total_score"),
  passed: tinyint(),
  proctorViolations: json("proctor_violations"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("aa_invite_token_unique").on(table.inviteToken),
  index("idx_aa_candidate").on(table.candidateId),
  index("idx_aa_tenant_status").on(table.tenantId, table.status),
]);

export const assessmentAttemptAnswers = mysqlTable("assessment_attempt_answers", {
  id: int().autoincrement().primaryKey(),
  attemptId: int("attempt_id").notNull(),
  questionId: int("question_id").notNull(),
  answerText: text("answer_text"),
  answerCode: text("answer_code"),
  selectedChoiceKeys: json("selected_choice_keys"),
  timeSpentSeconds: int("time_spent_seconds"),
  score: int(),
  autoGraded: tinyint("auto_graded").default(0).notNull(),
  llmFeedback: text("llm_feedback"),
  gradedById: int("graded_by_id"),
  gradedAt: timestamp("graded_at", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("aaa_attempt_question_unique").on(table.attemptId, table.questionId),
]);

export const assessmentCodeRuns = mysqlTable("assessment_code_runs", {
  id: int().autoincrement().primaryKey(),
  answerId: int("answer_id").notNull(),
  language: varchar({ length: 32 }).notNull(),
  sourceCode: text("source_code").notNull(),
  stdin: text(),
  expectedStdout: text("expected_stdout"),
  judge0Token: varchar("judge0_token", { length: 64 }),
  statusId: int("status_id"),
  statusDescription: varchar("status_description", { length: 64 }),
  stdout: text(),
  stderr: text(),
  compileOutput: text("compile_output"),
  runtimeMs: int("runtime_ms"),
  memoryKb: int("memory_kb"),
  passed: tinyint(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("idx_acr_answer").on(table.answerId),
  index("idx_acr_token").on(table.judge0Token),
]);

export const aiInterviewSessions = mysqlTable("ai_interview_sessions", {
  id: int().autoincrement().primaryKey(),
  tenantId: int("tenant_id").notNull(),
  attemptId: int("attempt_id").notNull(),
  candidateId: int("candidate_id").notNull(),
  templateId: int("template_id").notNull(),
  provider: varchar({ length: 32 }),
  model: varchar({ length: 64 }),
  systemPrompt: text("system_prompt"),
  currentTurn: int("current_turn").default(0).notNull(),
  totalTurns: int("total_turns").default(0).notNull(),
  status: mysqlEnum(['active','completed','abandoned','timed_out']).default('active').notNull(),
  summary: text(),
  startedAt: timestamp("started_at", { mode: 'string' }),
  completedAt: timestamp("completed_at", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("ais_attempt_unique").on(table.attemptId),
  index("idx_ais_candidate").on(table.candidateId),
]);

export const aiInterviewTurns = mysqlTable("ai_interview_turns", {
  id: int().autoincrement().primaryKey(),
  sessionId: int("session_id").notNull(),
  turnIndex: int("turn_index").notNull(),
  role: mysqlEnum(['interviewer','candidate']).notNull(),
  content: text().notNull(),
  tokenCount: int("token_count"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("idx_ait_session_turn").on(table.sessionId, table.turnIndex),
]);

export const plagiarismReports = mysqlTable("plagiarism_reports", {
  id: int().autoincrement().primaryKey(),
  attemptId: int("attempt_id").notNull(),
  answerId: int("answer_id").notNull(),
  method: mysqlEnum(['token_shingle','embedding_similarity','exact_match']).notNull(),
  similarityScore: decimal("similarity_score", { precision: 5, scale: 4 }),
  matchedSource: text("matched_source"),
  details: json(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("idx_pr_attempt").on(table.attemptId),
]);

// -------------------- Phase 6 — Scoring + Matching --------------------

export const candidateScores = mysqlTable("candidate_scores", {
  id: int().autoincrement().primaryKey(),
  tenantId: int("tenant_id").notNull(),
  candidateId: int("candidate_id").notNull(),
  jobId: int("job_id"),
  compositeScore: decimal("composite_score", { precision: 6, scale: 2 }),
  resumeScore: decimal("resume_score", { precision: 6, scale: 2 }),
  githubScore: decimal("github_score", { precision: 6, scale: 2 }),
  assessmentScore: decimal("assessment_score", { precision: 6, scale: 2 }),
  matchScore: decimal("match_score", { precision: 6, scale: 2 }),
  weights: json(),
  explanation: text(),
  computedAt: timestamp("computed_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("idx_cs_candidate_job").on(table.candidateId, table.jobId),
  index("idx_cs_tenant_score").on(table.tenantId, table.compositeScore),
]);

export const candidateEmbeddingsMeta = mysqlTable("candidate_embeddings_meta", {
  id: int().autoincrement().primaryKey(),
  tenantId: int("tenant_id").notNull(),
  candidateId: int("candidate_id").notNull(),
  provider: varchar({ length: 32 }).notNull(),
  model: varchar({ length: 64 }).notNull(),
  dim: int().notNull(),
  qdrantPointId: varchar("qdrant_point_id", { length: 64 }).notNull(),
  payloadHash: varchar("payload_hash", { length: 64 }),
  indexedAt: timestamp("indexed_at", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("cem_candidate_unique").on(table.candidateId),
  index("idx_cem_tenant").on(table.tenantId),
]);

export const jobEmbeddingsMeta = mysqlTable("job_embeddings_meta", {
  id: int().autoincrement().primaryKey(),
  tenantId: int("tenant_id"),
  jobId: int("job_id").notNull(),
  provider: varchar({ length: 32 }).notNull(),
  model: varchar({ length: 64 }).notNull(),
  dim: int().notNull(),
  qdrantPointId: varchar("qdrant_point_id", { length: 64 }).notNull(),
  payloadHash: varchar("payload_hash", { length: 64 }),
  indexedAt: timestamp("indexed_at", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("jem_job_unique").on(table.jobId),
  index("idx_jem_tenant").on(table.tenantId),
]);

// -------------------- Phase 7 — Tenant billing --------------------

export const tenantBillingSubscriptions = mysqlTable("tenant_billing_subscriptions", {
  id: int().autoincrement().primaryKey(),
  tenantId: int("tenant_id").notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 128 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 128 }),
  plan: mysqlEnum(['free','starter','growth','enterprise']).default('free').notNull(),
  status: mysqlEnum(['trialing','active','past_due','cancelled','unpaid','incomplete']).default('trialing').notNull(),
  seatsPurchased: int("seats_purchased").default(1).notNull(),
  seatsUsed: int("seats_used").default(0).notNull(),
  currentPeriodStart: timestamp("current_period_start", { mode: 'string' }),
  currentPeriodEnd: timestamp("current_period_end", { mode: 'string' }),
  cancelAtPeriodEnd: tinyint("cancel_at_period_end").default(0).notNull(),
  lastPayload: json("last_payload"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("tbs_tenant_unique").on(table.tenantId),
  uniqueIndex("tbs_stripe_subscription_unique").on(table.stripeSubscriptionId),
]);

// -------------------- Phase 8 — Compliance --------------------

export const piiAccessLog = mysqlTable("pii_access_log", {
  id: bigint({ mode: 'number' }).autoincrement().primaryKey(),
  tenantId: int("tenant_id"),
  actorUserId: int("actor_user_id").notNull(),
  actorRole: varchar("actor_role", { length: 64 }),
  subjectType: mysqlEnum("subject_type", ['candidate','application','resume','assessment_attempt','github_profile']).notNull(),
  subjectId: int("subject_id").notNull(),
  action: mysqlEnum(['read','export','update','delete','consent']).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("idx_pal_subject").on(table.subjectType, table.subjectId),
  index("idx_pal_actor_created").on(table.actorUserId, table.createdAt),
  index("idx_pal_tenant_created").on(table.tenantId, table.createdAt),
]);

export const candidateErasureRequests = mysqlTable("candidate_erasure_requests", {
  id: int().autoincrement().primaryKey(),
  tenantId: int("tenant_id"),
  candidateId: int("candidate_id").notNull(),
  requestedById: int("requested_by_id").notNull(),
  requesterEmail: varchar("requester_email", { length: 320 }),
  legalBasis: varchar("legal_basis", { length: 128 }),
  status: mysqlEnum(['pending','approved','executed','rejected','expired']).default('pending').notNull(),
  gracePeriodEndsAt: timestamp("grace_period_ends_at", { mode: 'string' }),
  executedAt: timestamp("executed_at", { mode: 'string' }),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_cer_candidate").on(table.candidateId),
  index("idx_cer_tenant_status").on(table.tenantId, table.status),
]);

export const retentionPolicies = mysqlTable("retention_policies", {
  id: int().autoincrement().primaryKey(),
  tenantId: int("tenant_id").notNull(),
  subjectType: mysqlEnum("subject_type", ['candidate','application','assessment_attempt','interview']).notNull(),
  retentionDays: int("retention_days").notNull(),
  appliesWhen: mysqlEnum("applies_when", ['after_last_activity','after_status_terminal','after_creation']).default('after_last_activity').notNull(),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("rp_tenant_subject_unique").on(table.tenantId, table.subjectType),
  index("idx_rp_tenant_active").on(table.tenantId, table.isActive),
]);

// Type exports for compatibility

// ============================================================
// Newsletters (public newsletter catalog + per-newsletter subscriptions)
// Previously created outside the migration chain; brought into the schema
// so fresh databases get them from the baseline migration.
// ============================================================

export const newsletters = mysqlTable("newsletters", {
	id: int().autoincrement().primaryKey(),
	slug: varchar({ length: 64 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	category: varchar({ length: 64 }),
	frequency: mysqlEnum(['daily','weekly','biweekly','monthly']).default('weekly'),
	isActive: tinyint().default(1),
	subscriberCount: int().default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	uniqueIndex("idx_newsletters_slug").on(table.slug),
	index("idx_newsletters_is_active").on(table.isActive),
]);

export const newsletterSubscriptions = mysqlTable("newsletter_subscriptions", {
	id: int().autoincrement().primaryKey(),
	email: varchar({ length: 320 }).notNull(),
	newsletterId: int().notNull(),
	status: mysqlEnum(['subscribed','unsubscribed','bounced']).default('subscribed'),
	subscribedAt: timestamp("subscribed_at", { mode: 'string' }).defaultNow().notNull(),
	unsubscribedAt: timestamp("unsubscribed_at", { mode: 'string' }),
	source: varchar({ length: 128 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_newsletter_subscriptions_email").on(table.email),
	index("idx_newsletter_subscriptions_newsletter_id").on(table.newsletterId),
	index("idx_newsletter_subscriptions_status").on(table.status),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
