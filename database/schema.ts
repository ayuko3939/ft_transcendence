import type { AdapterAccount } from "next-auth/adapters";
import { sql } from "drizzle-orm";
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
});

export const userPasswords = sqliteTable(
  "user_password",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    passwordHash: text("password_hash").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [primaryKey({ columns: [table.userId] })]
);

export const accounts = sqliteTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ]
);

export const sessions = sqliteTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ]
);

export const authenticators = sqliteTable(
  "authenticator",
  {
    credentialID: text("credentialID").notNull().unique(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: text("providerAccountId").notNull(),
    credentialPublicKey: text("credentialPublicKey").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credentialDeviceType").notNull(),
    credentialBackedUp: integer("credentialBackedUp", {
      mode: "boolean",
    }).notNull(),
    transports: text("transports"),
  },
  (authenticator) => [
    primaryKey({
      columns: [authenticator.userId, authenticator.credentialID],
    }),
  ]
);

export const tournaments = sqliteTable("tournament", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  hostId: text("host_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("waiting"), // waiting, in_progress, completed
  maxPlayers: integer("max_players").notNull().default(8),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  startedAt: integer("started_at", { mode: "timestamp_ms" }),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
});

export const tournamentParticipants = sqliteTable(
  "tournament_participant",
  {
    tournamentId: text("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("waiting"), // waiting, playing, won, lost
    finalRank: integer("final_rank"),
    joinedAt: integer("joined_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({
      columns: [table.tournamentId, table.userId],
    }),
  ]
);

export const matches = sqliteTable("match", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  player1Id: text("player1_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  player2Id: text("player2_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  player1Score: integer("player1_score").notNull(),
  player2Score: integer("player2_score").notNull(),
  winnerId: text("winner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  matchType: text("match_type").notNull().default("normal"), // normal, tournament
  gameRoomId: text("game_room_id"),
  playedAt: integer("played_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const tournamentMatches = sqliteTable("tournament_match", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tournamentId: text("tournament_id")
    .notNull()
    .references(() => tournaments.id, { onDelete: "cascade" }),
  matchId: text("match_id")
    .references(() => matches.id, { onDelete: "cascade" }), // 実際の試合データへの参照
  round: integer("round").notNull(),
  matchNumber: integer("match_number").notNull(),
  player1Id: text("player1_id").references(() => users.id, { onDelete: "set null" }),
  player2Id: text("player2_id").references(() => users.id, { onDelete: "set null" }),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});