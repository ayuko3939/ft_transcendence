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

export const match = sqliteTable("match", {
	id: text().primaryKey().notNull(),
	player1Id: text("player1_id").notNull().references(() => user.id, { onDelete: "cascade" } ),
	player2Id: text("player2_id").notNull().references(() => user.id, { onDelete: "cascade" } ),
	player1Score: integer("player1_score").notNull(),
	player2Score: integer("player2_score").notNull(),
	winnerId: text("winner_id").notNull().references(() => user.id, { onDelete: "cascade" } ),
	matchType: text("match_type").default("normal").notNull(),
	gameRoomId: text("game_room_id"),
	playedAt: integer("played_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const tournamentMatch = sqliteTable("tournament_match", {
	id: text().primaryKey().notNull(),
	tournamentId: text("tournament_id").notNull().references(() => tournament.id, { onDelete: "cascade" } ),
	matchId: text("match_id").references(() => match.id, { onDelete: "cascade" } ),
	round: integer().notNull(),
	matchNumber: integer("match_number").notNull(),
	player1Id: text("player1_id").references(() => user.id, { onDelete: "set null" } ),
	player2Id: text("player2_id").references(() => user.id, { onDelete: "set null" } ),
	status: text().default("pending").notNull(),
	createdAt: integer("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const tournamentParticipant = sqliteTable("tournament_participant", {
	tournamentId: text("tournament_id").notNull().references(() => tournament.id, { onDelete: "cascade" } ),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" } ),
	status: text().default("waiting").notNull(),
	finalRank: integer("final_rank"),
	joinedAt: integer("joined_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	primaryKey({ columns: [table.tournamentId, table.userId], name: "tournament_participant_tournament_id_user_id_pk"})
]);

export const tournament = sqliteTable("tournament", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	hostId: text("host_id").notNull().references(() => user.id, { onDelete: "cascade" } ),
	status: text().default("waiting").notNull(),
	maxPlayers: integer("max_players").default(8).notNull(),
	createdAt: integer("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	startedAt: integer("started_at"),
	completedAt: integer("completed_at"),
});

