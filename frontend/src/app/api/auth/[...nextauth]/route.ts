import type { NextAuthOptions } from "next-auth";
// import { getUserByEmail } from "@/api/auth/users";
import { client } from "@/api/db";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { drizzle } from "drizzle-orm/libsql";
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
    //   const existingUser = await getUserByEmail(user.email ?? undefined);
    //   if (existingUser && existingUser.provider !== account.provider) {
    //     return `/login?error=EmailInUse&email=${user.email}`;
    //   }
    //   return true;
    // },
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
