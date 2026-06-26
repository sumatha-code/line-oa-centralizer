import { pgTable, uuid, varchar, timestamp, boolean, integer, index } from "drizzle-orm/pg-core";

// 1. LINE Accounts configuration
export const lineAccounts = pgTable("line_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  lineId: varchar("line_id", { length: 100 }).notNull(), // LINE Basic ID
  channelId: varchar("channel_id", { length: 100 }).notNull().unique(),
  channelSecret: varchar("channel_secret", { length: 255 }).notNull(),
  channelAccessToken: varchar("channel_access_token", { length: 1024 }).notNull(),
  webhookForwardUrl: varchar("webhook_forward_url", { length: 1024 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 2. Admins Whitelist (Google OAuth allowed emails)
export const adminWhitelist = pgTable("admin_whitelist", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 3. Mapping of Admins to LINE Accounts they can access
export const adminLineAccounts = pgTable(
  "admin_line_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adminId: uuid("admin_id")
      .notNull()
      .references(() => adminWhitelist.id, { onDelete: "cascade" }),
    lineAccountId: uuid("line_account_id")
      .notNull()
      .references(() => lineAccounts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    adminIdIdx: index("admin_line_accounts_admin_id_idx").on(table.adminId),
    lineAccountIdIdx: index("admin_line_accounts_line_account_id_idx").on(table.lineAccountId),
  })
);

// 4. LINE Users profile cache
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  lineUserId: varchar("line_user_id", { length: 100 }).notNull().unique(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  pictureUrl: varchar("picture_url", { length: 1024 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 5. LINE Groups cache
export const groups = pgTable("groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  lineGroupId: varchar("line_group_id", { length: 100 }).notNull().unique(),
  groupName: varchar("group_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 6. Webhook Events received (for deduplication and logging)
export const webhookEvents = pgTable(
  "webhook_events",
  {
    webhookEventId: varchar("webhook_event_id", { length: 255 }).primaryKey(), // LINE event ID
    lineAccountId: uuid("line_account_id")
      .notNull()
      .references(() => lineAccounts.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 100 }).notNull(), // message, follow, join, etc.
    userId: varchar("user_id", { length: 100 }),
    groupId: varchar("group_id", { length: 100 }),
    processedAt: timestamp("processed_at").defaultNow().notNull(),
  },
  (table) => ({
    lineAccountIdIdx: index("webhook_events_line_account_id_idx").on(table.lineAccountId),
    processedAtIdx: index("webhook_events_processed_at_idx").on(table.processedAt),
  })
);

// 7. Sub-app API Keys
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  keyHash: varchar("key_hash", { length: 255 }).notNull().unique(),
  projectName: varchar("project_name", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 8. Mapping of API Keys to LINE Accounts they are authorized to use
export const apiKeyLineAccounts = pgTable(
  "api_key_line_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    apiKeyId: uuid("api_key_id")
      .notNull()
      .references(() => apiKeys.id, { onDelete: "cascade" }),
    lineAccountId: uuid("line_account_id")
      .notNull()
      .references(() => lineAccounts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    apiKeyIdIdx: index("api_key_line_accounts_api_key_id_idx").on(table.apiKeyId),
    lineAccountIdIdx: index("api_key_line_accounts_line_account_id_idx").on(table.lineAccountId),
  })
);

// 9. API usage logs for monitoring
export const usageLogs = pgTable(
  "usage_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    apiKeyId: uuid("api_key_id")
      .notNull()
      .references(() => apiKeys.id, { onDelete: "cascade" }),
    lineAccountId: uuid("line_account_id")
      .references(() => lineAccounts.id, { onDelete: "cascade" }),
    endpoint: varchar("endpoint", { length: 255 }).notNull(),
    statusCode: integer("status_code").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    apiKeyIdIdx: index("usage_logs_api_key_id_idx").on(table.apiKeyId),
    lineAccountIdIdx: index("usage_logs_line_account_id_idx").on(table.lineAccountId),
    createdAtIdx: index("usage_logs_created_at_idx").on(table.createdAt),
  })
);

// 10. Webhook Forward URLs (1-to-N relation)
export const lineAccountForwardUrls = pgTable(
  "line_account_forward_urls",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lineAccountId: uuid("line_account_id")
      .notNull()
      .references(() => lineAccounts.id, { onDelete: "cascade" }),
    url: varchar("url", { length: 1024 }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    lineAccountIdIdx: index("line_account_forward_urls_line_account_id_idx").on(table.lineAccountId),
  })
);
