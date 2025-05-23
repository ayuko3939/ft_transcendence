import { relations } from "drizzle-orm/relations";
import { user, account, authenticator, session, userPassword, match, tournamentMatch, tournament, tournamentParticipant } from "./schema";

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	accounts: many(account),
	authenticators: many(authenticator),
	sessions: many(session),
	userPasswords: many(userPassword),
	matches_winnerId: many(match, {
		relationName: "match_winnerId_user_id"
	}),
	matches_player2Id: many(match, {
		relationName: "match_player2Id_user_id"
	}),
	matches_player1Id: many(match, {
		relationName: "match_player1Id_user_id"
	}),
	tournamentMatches_player2Id: many(tournamentMatch, {
		relationName: "tournamentMatch_player2Id_user_id"
	}),
	tournamentMatches_player1Id: many(tournamentMatch, {
		relationName: "tournamentMatch_player1Id_user_id"
	}),
	tournamentParticipants: many(tournamentParticipant),
	tournaments: many(tournament),
}));

export const authenticatorRelations = relations(authenticator, ({one}) => ({
	user: one(user, {
		fields: [authenticator.userId],
		references: [user.id]
	}),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const userPasswordRelations = relations(userPassword, ({one}) => ({
	user: one(user, {
		fields: [userPassword.userId],
		references: [user.id]
	}),
}));

export const matchRelations = relations(match, ({one, many}) => ({
	user_winnerId: one(user, {
		fields: [match.winnerId],
		references: [user.id],
		relationName: "match_winnerId_user_id"
	}),
	user_player2Id: one(user, {
		fields: [match.player2Id],
		references: [user.id],
		relationName: "match_player2Id_user_id"
	}),
	user_player1Id: one(user, {
		fields: [match.player1Id],
		references: [user.id],
		relationName: "match_player1Id_user_id"
	}),
	tournamentMatches: many(tournamentMatch),
}));

export const tournamentMatchRelations = relations(tournamentMatch, ({one}) => ({
	user_player2Id: one(user, {
		fields: [tournamentMatch.player2Id],
		references: [user.id],
		relationName: "tournamentMatch_player2Id_user_id"
	}),
	user_player1Id: one(user, {
		fields: [tournamentMatch.player1Id],
		references: [user.id],
		relationName: "tournamentMatch_player1Id_user_id"
	}),
	match: one(match, {
		fields: [tournamentMatch.matchId],
		references: [match.id]
	}),
	tournament: one(tournament, {
		fields: [tournamentMatch.tournamentId],
		references: [tournament.id]
	}),
}));

export const tournamentRelations = relations(tournament, ({one, many}) => ({
	tournamentMatches: many(tournamentMatch),
	tournamentParticipants: many(tournamentParticipant),
	user: one(user, {
		fields: [tournament.hostId],
		references: [user.id]
	}),
}));

export const tournamentParticipantRelations = relations(tournamentParticipant, ({one}) => ({
	user: one(user, {
		fields: [tournamentParticipant.userId],
		references: [user.id]
	}),
	tournament: one(tournament, {
		fields: [tournamentParticipant.tournamentId],
		references: [tournament.id]
	}),
}));