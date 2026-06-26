import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      isSuperAdmin?: boolean;
      whitelistId?: string;
    } & DefaultSession["user"];
  }
}
