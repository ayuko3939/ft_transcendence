import type { InferSelectModel } from "drizzle-orm";
import { client } from "@/api/db";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { user, userPassword } from "drizzle/schema";

import { hashPassword, verifyPassword } from "./utils";

type UserData = InferSelectModel<typeof user>;

export async function getUserByEmail(email?: string): Promise<UserData | null> {
  if (!email) {
    return null;
  }
  const db = drizzle(client, { logger: true });
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
  const db = drizzle(client, { logger: true });
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

export async function authenticateUser(
  email: string,
  password: string,
): Promise<UserData | null> {
  const db = drizzle(client, { logger: true });

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
