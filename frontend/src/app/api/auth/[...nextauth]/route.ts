import type { NextAuthOptions } from "next-auth";
import { authenticateUser, getUserProviderAndDisplayName, updateSession } from "@/api/auth/users";
import { db } from "@/api/db";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import * as jwt from "next-auth/jwt";
import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { updateLastActivity } from "@/api/auth/lastActivityService";

export const authOptions: NextAuthOptions = {
  debug: true,
  adapter: DrizzleAdapter(db),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "ユーザー名", type: "text" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }
        try {
          return await authenticateUser(
            credentials.username,
            credentials.password,
          );
        } catch (error) {
          console.error("認証エラー:", error);
          return null;
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
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
    async redirect({ url, baseUrl }) {
      if (!url || url.trim() === "") return `${baseUrl}/dashboard`;
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === baseUrl) return `${baseUrl}/dashboard`;
      } catch (error) {
        console.error("Invalid URL in redirect callback:", error);
        return `${baseUrl}/dashboard`;
      }
      return baseUrl;
    },

    async session({ session, user }) {
      if (session.user) {
        const { provider, displayName } = await getUserProviderAndDisplayName(user.id);
        session.user.id = user.id;
        session.user.provider = provider ?? "credentials";
        await updateLastActivity(user.id);
        session.user.displayName = displayName ?? user.name ?? "";
      }
      return session;
    },
  },
  jwt: {
    encode: async ({ token, secret, maxAge }) => {
      console.log("token", token);
      if (!token?.sub) {
        return jwt.encode({ token, secret, maxAge });
      }
      const session = await updateSession(token.sub);
      if (!session) {
        throw new Error("セッションの更新に失敗しました");
      }
      console.log("sessionToken", session.sessionToken);
      return session.sessionToken;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
