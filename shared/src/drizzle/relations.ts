import { relations } from "drizzle-orm/relations";
import { user, account, authenticator, players, games, session, tournamentMatches, tournaments, tournamentParticipants, userPassword } from "./schema";

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	accounts: many(account),
	authenticators: many(authenticator),
	players: many(players),
	sessions: many(session),
	tournamentMatches_winnerId: many(tournamentMatches, {
		relationName: "tournamentMatches_winnerId_user_id"
	}),
	tournamentMatches_player2Id: many(tournamentMatches, {
		relationName: "tournamentMatches_player2Id_user_id"
	}),
	tournamentMatches_player1Id: many(tournamentMatches, {
		relationName: "tournamentMatches_player1Id_user_id"
	}),
	tournamentParticipants: many(tournamentParticipants),
	tournaments_winnerId: many(tournaments, {
		relationName: "tournaments_winnerId_user_id"
	}),
	tournaments_creatorId: many(tournaments, {
		relationName: "tournaments_creatorId_user_id"
	}),
	userPasswords: many(userPassword),
}));

export const authenticatorRelations = relations(authenticator, ({one}) => ({
	user: one(user, {
		fields: [authenticator.userId],
		references: [user.id]
	}),
}));

export const playersRelations = relations(players, ({one}) => ({
	user: one(user, {
		fields: [players.userId],
		references: [user.id]
	}),
	game: one(games, {
		fields: [players.gameId],
		references: [games.id]
	}),
}));

export const gamesRelations = relations(games, ({many}) => ({
	players: many(players),
	tournamentMatches: many(tournamentMatches),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const tournamentMatchesRelations = relations(tournamentMatches, ({one}) => ({
	game: one(games, {
		fields: [tournamentMatches.gameId],
		references: [games.id]
	}),
	user_winnerId: one(user, {
		fields: [tournamentMatches.winnerId],
		references: [user.id],
		relationName: "tournamentMatches_winnerId_user_id"
	}),
	user_player2Id: one(user, {
		fields: [tournamentMatches.player2Id],
		references: [user.id],
		relationName: "tournamentMatches_player2Id_user_id"
	}),
	user_player1Id: one(user, {
		fields: [tournamentMatches.player1Id],
		references: [user.id],
		relationName: "tournamentMatches_player1Id_user_id"
	}),
	tournament: one(tournaments, {
		fields: [tournamentMatches.tournamentId],
		references: [tournaments.id]
	}),
}));

export const tournamentsRelations = relations(tournaments, ({one, many}) => ({
	tournamentMatches: many(tournamentMatches),
	tournamentParticipants: many(tournamentParticipants),
	user_winnerId: one(user, {
		fields: [tournaments.winnerId],
		references: [user.id],
		relationName: "tournaments_winnerId_user_id"
	}),
	user_creatorId: one(user, {
		fields: [tournaments.creatorId],
		references: [user.id],
		relationName: "tournaments_creatorId_user_id"
	}),
}));

export const tournamentParticipantsRelations = relations(tournamentParticipants, ({one}) => ({
	user: one(user, {
		fields: [tournamentParticipants.userId],
		references: [user.id]
	}),
	tournament: one(tournaments, {
		fields: [tournamentParticipants.tournamentId],
		references: [tournaments.id]
	}),
}));

export const userPasswordRelations = relations(userPassword, ({one}) => ({
	user: one(user, {
		fields: [userPassword.userId],
		references: [user.id]
	}),
}));