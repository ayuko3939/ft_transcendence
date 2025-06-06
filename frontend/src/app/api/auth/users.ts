import type { InferSelectModel } from "drizzle-orm";
import { db } from "@/api/db";
import { account, session, user, userPassword } from "@ft-transcendence/shared";
import { eq } from "drizzle-orm";

import { hashPassword, verifyPassword } from "./utils";

type UserData = InferSelectModel<typeof user>;
type SessionData = InferSelectModel<typeof session>;
type AccountData = InferSelectModel<typeof account>;

export async function getUserByEmail(email?: string): Promise<UserData | null> {
  if (!email) {
    return null;
  }
  const result = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  return result[0] || null;
}

export async function createUser(
  name: string,
  email: string,
  password: string,
  image?: string,
): Promise<UserData> {
  const passwordHash = await hashPassword(password);

  const newUserID = await db.transaction(async (tx) => {
    const [newUser] = await tx
      .insert(user)
      .values({
        id: crypto.randomUUID(),
        name,
        email,
        emailVerified: null,
        image,
      })
      .returning({ id: user.id });
    if (!newUser) {
      throw new Error("ユーザーの作成に失敗しました");
    }
    await tx.insert(userPassword).values({
      userId: newUser.id,
      passwordHash,
    });
    return newUser.id;
  });
  return {
    id: newUserID,
    name,
    email,
    emailVerified: null,
    image: image ?? null,
  };
}

export async function createAccount(userId: string): Promise<AccountData> {
  const getExistAccounts = await db
    .select()
    .from(account)
    .where(eq(account.userId, userId))
    .limit(1);
  const existAccount = getExistAccounts[0];
  if (existAccount) {
    return existAccount;
  }
  const newAccount = {
    userId,
    type: "credentials",
    provider: "credentials",
    providerAccountId: userId,
    refreshToken: null,
    accessToken: null,
    expiresAt: null,
    tokenType: null,
    scope: null,
    idToken: null,
    sessionState: null,
  };
  await db.insert(account).values(newAccount);
  return newAccount;
}

export async function updateSession(userID: string): Promise<SessionData> {
  const newSession = {
    sessionToken: crypto.randomUUID(),
    userId: userID,
    expires: Math.floor(Date.now()) + 30 * 24 * 60 * 60 * 1000,
  };
  const getExistSessions = await db
    .select()
    .from(session)
    .where(eq(session.userId, userID))
    .limit(1);
  const existSession = getExistSessions[0];
  if (existSession) {
    await db.update(session).set(newSession).where(eq(session.userId, userID));
    return newSession;
  }
  await db.insert(session).values(newSession);
  return newSession;
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<UserData | null> {
  const hitusers = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  const hituser = hitusers[0];
  if (!hituser) {
    return null;
  }

  const registeredPasswords = await db
    .select()
    .from(userPassword)
    .where(eq(userPassword.userId, hituser.id))
    .limit(1);
  const registeredPassword = registeredPasswords[0];
  if (!registeredPassword) {
    return null;
  }

  const isValid = await verifyPassword(
    password,
    registeredPassword.passwordHash,
  );
  if (!isValid) {
    return null;
  }
  return hituser;
}

export async function getUserProviderAndDisplayName(userId: string): Promise<{
  provider: string | null;
  displayName: string | null;
}> {
  const result = await db
    .select({
      provider: account.provider,
      displayName: user.displayName,
    })
    .from(user)
    .leftJoin(account, eq(user.id, account.userId))
    .where(eq(user.id, userId))
    .limit(1);

  if (result.length === 0) {
    return {
      provider: null,
      displayName: null,
    };
  }

  return {
    provider: result[0].provider || null,
    displayName: result[0].displayName || null,
  };
}
