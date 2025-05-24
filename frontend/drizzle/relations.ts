import { relations } from "drizzle-orm/relations";
import { user, account, authenticator, players, games, session, userPassword } from "./schema";

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