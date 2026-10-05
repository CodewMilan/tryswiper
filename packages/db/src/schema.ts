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
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

export const schema = {
  user,
  session,
  account,
  verification,
  workspace,
  membership,
  brand,
  project,
  carousel,
  carouselVersion,
  asset,
  mcpKey,
};
