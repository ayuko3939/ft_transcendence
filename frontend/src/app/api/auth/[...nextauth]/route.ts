import type { NextAuthOptions } from "next-auth";
import { authenticateUser } from "@/api/auth/users";
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
    strategy: "jwt",
  },
  callbacks: {
    // async signIn({ user, account, profile, email, credentials }) {
    //   console.log("signIn", { user, account, profile, email, credentials });
    //   if (account?.provider === "credentials") {
    //     const session = await updateSession(user.id);
    //   }
    //   return true;
    // },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return "/dashboard";
      return baseUrl;
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
        if (session.user) {
          session.user.name = token.name;
          session.user.email = token.email;
          session.user.image = token.picture;
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (!token.sub) return token;
      if (user) {
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
      }
      return token;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
