import { sqliteTable, AnySQLiteColumn, foreignKey, primaryKey, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core"
  import { sql } from "drizzle-orm"

export const account = sqliteTable("account", {
	userId: text().notNull().references(() => user.id, { onDelete: "cascade" } ),
	type: text().notNull(),
	provider: text().notNull(),
	providerAccountId: text().notNull(),
	refreshToken: text("refresh_token"),
	accessToken: text("access_token"),
	expiresAt: integer("expires_at"),
	tokenType: text("token_type"),
	scope: text(),
	idToken: text("id_token"),
	sessionState: text("session_state"),
},
(table) => [
	primaryKey({ columns: [table.provider, table.providerAccountId], name: "account_provider_providerAccountId_pk"})
]);

export const authenticator = sqliteTable("authenticator", {
	credentialId: text().notNull(),
	userId: text().notNull().references(() => user.id, { onDelete: "cascade" } ),
	providerAccountId: text().notNull(),
	credentialPublicKey: text().notNull(),
	counter: integer().notNull(),
	credentialDeviceType: text().notNull(),
	credentialBackedUp: integer().notNull(),
	transports: text(),
},
(table) => [
	uniqueIndex("authenticator_credentialID_unique").on(table.credentialId),
	primaryKey({ columns: [table.credentialId, table.userId], name: "authenticator_credentialID_userId_pk"})
]);

export const session = sqliteTable("session", {
	sessionToken: text().primaryKey().notNull(),
	userId: text().notNull().references(() => user.id, { onDelete: "cascade" } ),
	expires: integer().notNull(),
});

export const userPassword = sqliteTable("user_password", {
	userId: text("user_id").primaryKey().notNull().references(() => user.id, { onDelete: "cascade" } ),
	passwordHash: text("password_hash").notNull(),
	passwordSalt: text("password_salt"),
	createdAt: integer("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: integer("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const user = sqliteTable("user", {
	id: text().primaryKey().notNull(),
	name: text(),
	email: text(),
	emailVerified: integer(),
	image: text(),
},
(table) => [
	uniqueIndex("user_email_unique").on(table.email),
]);

export const verificationToken = sqliteTable("verificationToken", {
	identifier: text().notNull(),
	token: text().notNull(),
	expires: integer().notNull(),
},
(table) => [
	primaryKey({ columns: [table.identifier, table.token], name: "verificationToken_identifier_token_pk"})
]);

