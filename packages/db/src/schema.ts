import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  disabledAt: timestamp("disabled_at"),
  identityCheckedAt: timestamp("identity_checked_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("account_user_id_idx").on(table.userId), uniqueIndex("account_provider_identity_idx").on(table.providerId, table.accountId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const accountIdentityArchive = pgTable("account_identity_archive", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  data: jsonb("data").notNull(),
  archivedAt: timestamp("archived_at").notNull().defaultNow(),
});

export const workspace = pgTable("workspace", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const membership = pgTable(
  "membership",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("owner"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("membership_workspace_user_idx").on(table.workspaceId, table.userId),
  ],
);

export const brand = pgTable("brand", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  audience: text("audience"),
  positioning: text("positioning"),
  tone: text("tone"),
  wordsToUse: jsonb("words_to_use").$type<string[]>().notNull().default([]),
  wordsToAvoid: jsonb("words_to_avoid").$type<string[]>().notNull().default([]),
  colors: jsonb("colors")
    .$type<{
      background: string;
      primary: string;
      secondary: string;
      accent: string;
    }>()
    .notNull()
    .default({
      background: "#FAFAF8",
      primary: "#171717",
      secondary: "#525252",
      accent: "#C2410C",
    }),
  fonts: jsonb("fonts")
    .$type<{ heading: string; body: string }>()
    .notNull()
    .default({ heading: "Inter", body: "Inter" }),
  logoAssetId: text("logo_asset_id"),
  cta: text("cta"),
  website: text("website"),
  socialHandles: jsonb("social_handles").$type<string[]>().notNull().default([]),
  proofPoints: jsonb("proof_points").$type<string[]>().notNull().default([]),
  guidelines: text("guidelines"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const project = pgTable(
  "project",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    brandId: text("brand_id").references(() => brand.id),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").notNull().default("active"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("project_workspace_idx").on(table.workspaceId)],
);

export const carousel = pgTable(
  "carousel",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),
    lastMutationId: text("last_mutation_id"),
    schemaVersion: text("schema_version").notNull().default("1.0"),
    title: text("title").notNull(),
    formatId: text("format_id").notNull(),
    status: text("status").notNull().default("draft"),
    contentJson: jsonb("content_json").notNull(),
    planJson: jsonb("plan_json"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("carousel_project_idx").on(table.projectId)],
);

export const carouselVersion = pgTable("carousel_version", {
  id: text("id").primaryKey(),
  carouselId: text("carousel_id")
    .notNull()
    .references(() => carousel.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  contentJson: jsonb("content_json").notNull(),
  planJson: jsonb("plan_json"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const creationRequest = pgTable("creation_request", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspace.id, { onDelete: "cascade" }),
  requestKey: text("request_key").notNull(),
  payloadHash: text("payload_hash").notNull(),
  carouselId: text("carousel_id").references(() => carousel.id, { onDelete: "set null" }),
  resultJson: jsonb("result_json").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [uniqueIndex("creation_request_workspace_key_idx").on(table.workspaceId, table.requestKey)]);

export const workspaceFormat = pgTable(
  "workspace_format",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    sourceCarouselId: text("source_carousel_id").references(() => carousel.id, {
      onDelete: "set null",
    }),
    contentJson: jsonb("content_json").notNull(),
    planJson: jsonb("plan_json"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("workspace_format_workspace_idx").on(table.workspaceId),
    uniqueIndex("workspace_format_workspace_name_idx").on(table.workspaceId, table.name),
  ],
);

export const asset = pgTable(
  "asset",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    mimeType: text("mime_type").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    byteSize: integer("byte_size").notNull(),
    data: text("data").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("asset_workspace_idx").on(table.workspaceId)],
);

export const mcpKey = pgTable(
  "mcp_key",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull().unique(),
    keyPrefix: text("key_prefix").notNull(),
    lastUsedAt: timestamp("last_used_at"),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("mcp_key_workspace_idx").on(table.workspaceId)],
);

export const billing = pgTable("billing", {
  workspaceId: text("workspace_id")
    .primaryKey()
    .references(() => workspace.id, { onDelete: "cascade" }),
  plan: text("plan").notNull().default("free"),
  status: text("status").notNull().default("inactive"),
  dodoCustomerId: text("dodo_customer_id"),
  dodoSubscriptionId: text("dodo_subscription_id"),
  dodoPaymentId: text("dodo_payment_id"),
  productId: text("product_id"),
  subscriptionCreatedAt: timestamp("subscription_created_at"),
  paidThrough: timestamp("paid_through"),
  cancelAtNextBilling: boolean("cancel_at_next_billing").notNull().default(false),
  lastEventAt: timestamp("last_event_at"),
  lastVerifiedAt: timestamp("last_verified_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const billingWebhook = pgTable("billing_webhook", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspace.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  occurredAt: timestamp("occurred_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const usageEvent = pgTable(
  "usage_event",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("usage_event_workspace_kind_created_idx").on(table.workspaceId, table.kind, table.createdAt)],
);

export const publishJob = pgTable(
  "publish_job",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    carouselId: text("carousel_id")
      .notNull()
      .references(() => carousel.id, { onDelete: "cascade" }),
    platform: text("platform").notNull().default("manual"),
    status: text("status").notNull().default("ready"),
    idempotencyKey: text("idempotency_key").notNull(),
    documentVersion: integer("document_version"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("publish_job_workspace_idx").on(table.workspaceId),
    uniqueIndex("publish_job_workspace_idempotency_idx").on(table.workspaceId, table.idempotencyKey),
  ],
);

export const operationLease = pgTable("operation_lease", {
  id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspace.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), expiresAt: timestamp("expires_at").notNull(),
}, (table) => [index("operation_lease_kind_expiry_idx").on(table.kind, table.expiresAt)]);

export const resourceWindow = pgTable("resource_window", {
  workspaceId: text("workspace_id").notNull().references(() => workspace.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), startedAt: timestamp("started_at").notNull(), requests: integer("requests").notNull(),
}, (table) => [uniqueIndex("resource_window_workspace_kind_idx").on(table.workspaceId, table.kind)]);

export const productEvent = pgTable("product_event", {
  id: text("id").primaryKey(), workspaceId: text("workspace_id").notNull().references(() => workspace.id, { onDelete: "cascade" }),
  carouselId: text("carousel_id").references(() => carousel.id, { onDelete: "set null" }),
  kind: text("kind").notNull(), source: text("source"), value: text("value"), createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [index("product_event_workspace_created_idx").on(table.workspaceId, table.createdAt)]);

export const schema = {
  operationLease,
  resourceWindow,
  productEvent,
  user,
  session,
  account,
  verification,
  accountIdentityArchive,
  workspace,
  membership,
  brand,
  project,
  carousel,
  carouselVersion,
  creationRequest,
  workspaceFormat,
  asset,
  mcpKey,
  billing,
  billingWebhook,
  usageEvent,
  publishJob,
};
