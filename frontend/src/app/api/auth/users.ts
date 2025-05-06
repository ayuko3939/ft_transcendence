import type { InferSelectModel } from "drizzle-orm";
import { client } from "@/api/db";
import { and, eq } from "drizzle-orm";
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

// export async function getUserById(id: number) {
//   const db = drizzle(client, { logger: true });
//   const result = await db.select().from(user).where(eq(user.id, id)).limit(1);
//   return result[0] || null;
// }

// ユーザーをユーザー名（またはメール）とパスワードで認証
// export async function authenticateUser(identifier: string, password: string) {
//   const db = drizzle(client, { logger: true });
//   // メールアドレスまたはユーザー名で検索
//   const result = await db
//     .select()
//     .from(user)
//     .where(eq(user.email, identifier))
//     .limit(1);

//   const hituser = result[0];

//   if (!hituser || !hituser.password) {
//     return null;
//   }

//   // パスワード検証
//   const isValid = await verifyPassword(password, user.password);

//   if (!isValid) {
//     return null;
//   }

//   // パスワードを除いたユーザー情報を返す
//   const { password: _, ...userWithoutPassword } = user;
//   return userWithoutPassword;
// }
