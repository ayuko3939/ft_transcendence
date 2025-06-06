import type { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      provider: string;
      displayName?: string;
    } & DefaultSession["user"];
  }
  interface User extends DefaultUser {
    displayName?: string;
  }
}
