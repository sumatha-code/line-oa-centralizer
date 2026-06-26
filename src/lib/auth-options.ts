import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/db";
import { adminWhitelist } from "@/db/schema";
import { eq } from "drizzle-orm";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const email = user.email.toLowerCase().trim();

      // 1. Check Super Admins from environment variable
      const superAdminsStr = process.env.SUPER_ADMIN_EMAILS || "";
      const superAdmins = superAdminsStr
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

      if (superAdmins.includes(email)) {
        return true;
      }

      // 2. Check Whitelisted Admins in database
      try {
        const [whitelisted] = await db
          .select()
          .from(adminWhitelist)
          .where(eq(adminWhitelist.email, email))
          .limit(1);

        if (whitelisted) {
          return true;
        }
      } catch (error) {
        console.error("[NextAuth] Error checking whitelist database:", error);
      }

      return false; // Reject sign in
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session }) {
      if (session.user?.email) {
        const email = session.user.email.toLowerCase().trim();

        // 1. Determine if Super Admin
        const superAdminsStr = process.env.SUPER_ADMIN_EMAILS || "";
        const superAdmins = superAdminsStr
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);

        const isSuper = superAdmins.includes(email);
        session.user.isSuperAdmin = isSuper;

        // 2. Add database whitelist record ID if they are not super admin
        if (!isSuper) {
          try {
            const [whitelisted] = await db
              .select()
              .from(adminWhitelist)
              .where(eq(adminWhitelist.email, email))
              .limit(1);
            
            if (whitelisted) {
              session.user.whitelistId = whitelisted.id;
            }
          } catch (error) {
            console.error("[NextAuth] Error fetching whitelist record during session callback:", error);
          }
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
};
