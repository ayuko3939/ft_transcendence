import type { DefaultSession } from "next-auth";
import type { DefaultUser } from "next-auth";

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
