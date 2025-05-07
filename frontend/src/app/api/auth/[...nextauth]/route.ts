import type { NextAuthOptions } from "next-auth";
import { cookies } from "next/headers";
import { authenticateUser, updateSession } from "@/api/auth/users";
import { client } from "@/api/db";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { drizzle } from "drizzle-orm/libsql";
import * as jwt from "next-auth/jwt";
import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  debug: true,
  adapter: DrizzleAdapter(drizzle(client, { logger: true }) as any),
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
    // async signIn({ user, account, profile, email, credentials }) {
    //   console.log("signIn", { user, account, profile, email, credentials });
    //   if (account?.provider === "credentials") {
    //     const session = await updateSession(user.id);
    //     if (!session) {
    //       return false;
    //     }
    //   }
    //   return true;
    // },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return "/dashboard";
      return baseUrl;
    },

    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    // async jwt({ token, user }) {
    //   if (!token.sub) return token;
    //   if (user) {
    //     token.sub = user.id;
    //     token.name = user.name;
    //     token.email = user.email;
    //     token.picture = user.image;
    //   }
    //   return token;
    // },
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

    // encode: async ({ token, secret, maxAge }) => {
    //   const { cookies, headers } = require("next/headers");

    //   const path = headers().get("x-pathname") || "";
    //   const method = headers().get("x-method") || "";
    //   if (
    //     path.includes("/api/auth/callback/credentials") &&
    //     method === "POST"
    //   ) {
    //     const sessionToken = cookies().get("next-auth.session-token");
    //     if (sessionToken) return sessionToken.value;
    //     return "";
    //   }

    //   return jwt.encode({ token, secret, maxAge });
    // },

    // decode: async ({ token, secret }) => {
    //   const { headers } = require("next/headers");
    //   const path = headers().get("x-pathname") || "";
    //   const method = headers().get("x-method") || "";

    //   if (
    //     path.includes("/api/auth/callback/credentials") &&
    //     method === "POST"
    //   ) {
    //     return null;
    //   }
    //   return jwt.decode({ token, secret });
    // },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
