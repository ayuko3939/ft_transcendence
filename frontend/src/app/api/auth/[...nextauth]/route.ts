import type { NextAuthOptions } from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { db } from "../../database/db";

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db as any),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "ユーザー名", type: "text" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(credentials) {
        // ここでは実際の認証ロジックを実装します
        // TODO: バックエンドAPIとの連携を実装
        if (credentials?.username !== "" && credentials?.password !== "") {
          return {
            id: "1",
            name: "User",
            email: "user@example.com",
          };
        }
        return null;
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  pages: {
    signIn: "/login",
    signOut: "/login",
  },
  session: {
    strategy: "database",
  },
  callbacks: {
    async session({ session, user }) {
      console.log("Session:", JSON.stringify(session));
      console.log("User:", JSON.stringify(user));
      if (session.user && user) {
        session.user.id = user.id
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
