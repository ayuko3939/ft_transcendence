import type { NextAuthOptions } from "next-auth";
import { client } from "@/api/db";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { drizzle } from "drizzle-orm/libsql";
import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

// import { authenticateUser } from "../users";

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
          // const user = await authenticateUser(
          //   credentials.username,
          //   credentials.password,
          // );
          // if (user) {
          //   return {
          //     id: user.id.toString(),
          //     name: user.name,
          //     email: user.email,
          //     image: user.image || null,
          //   };
          // }
          return {
            id: "user.id.toString()",
            name: "user.name",
            email: "user.email",
            image: "user.image || null",
          };
        } catch (error) {
          console.error("認証エラー:", error);
          return null;
        }
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
      if (session.user && user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
