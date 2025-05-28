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

export const games = sqliteTable("games", {
	id: text().primaryKey().notNull(),
	startedAt: integer("started_at").notNull(),
	endedAt: integer("ended_at"),
	ballSpeed: integer("ball_speed").notNull(),
	winningScore: integer("winning_score").notNull(),
	endReason: text("end_reason"),
	status: text().default("in_progress").notNull(),
	createdAt: integer("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: integer("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const players = sqliteTable("players", {
	id: text().primaryKey().notNull(),
	gameId: text("game_id").notNull().references(() => games.id, { onDelete: "cascade" } ),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" } ),
	side: text().notNull(),
	score: integer().default(0).notNull(),
	result: text().notNull(),
	createdAt: integer("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: integer("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	uniqueIndex("players_game_side_unique").on(table.gameId, table.side),
]);

export const session = sqliteTable("session", {
	sessionToken: text().primaryKey().notNull(),
	userId: text().notNull().references(() => user.id, { onDelete: "cascade" } ),
	expires: integer().notNull(),
});

export const tournamentMatches = sqliteTable("tournament_matches", {
	id: text().primaryKey().notNull(),
	tournamentId: text("tournament_id").notNull().references(() => tournaments.id, { onDelete: "cascade" } ),
	round: integer().notNull(),
	matchNumber: integer("match_number").notNull(),
	player1Id: text("player1_id").notNull().references(() => user.id, { onDelete: "cascade" } ),
	player2Id: text("player2_id").notNull().references(() => user.id, { onDelete: "cascade" } ),
	winnerId: text("winner_id").references(() => user.id),
	gameId: text("game_id").references(() => games.id),
	status: text().default("pending").notNull(),
	scheduledAt: integer("scheduled_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	uniqueIndex("tournament_round_match_unique").on(table.tournamentId, table.round, table.matchNumber),
]);

export const tournamentParticipants = sqliteTable("tournament_participants", {
	id: text().primaryKey().notNull(),
	tournamentId: text("tournament_id").notNull().references(() => tournaments.id, { onDelete: "cascade" } ),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" } ),
	status: text().default("active").notNull(),
	eliminatedRound: integer("eliminated_round"),
	joinedAt: integer("joined_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	uniqueIndex("tournament_user_unique").on(table.tournamentId, table.userId),
]);

export const tournaments = sqliteTable("tournaments", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	creatorId: text("creator_id").notNull().references(() => user.id, { onDelete: "cascade" } ),
	status: text().default("waiting").notNull(),
	maxParticipants: integer("max_participants").notNull(),
	currentRound: integer("current_round").default(0).notNull(),
	winnerId: text("winner_id").references(() => user.id),
	createdAt: integer("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	startedAt: integer("started_at"),
	endedAt: integer("ended_at"),
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

