import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { adminLineAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface AdminContext {
  email: string;
  isSuperAdmin: boolean;
  whitelistId?: string;
  lineAccountIds: string[] | null; // null represents all accounts (Super Admin)
}

/**
 * Validates current admin session and returns their authorization context,
 * including which LINE accounts they are allowed to manage.
 */
export async function getAdminContext(): Promise<AdminContext | null> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) {
    return null;
  }

  const email = session.user.email;
  const isSuperAdmin = !!session.user.isSuperAdmin;
  const whitelistId = session.user.whitelistId;

  if (isSuperAdmin) {
    return {
      email,
      isSuperAdmin: true,
      lineAccountIds: null,
    };
  }

  if (!whitelistId) {
    return null;
  }

  try {
    // Fetch the mapped LINE Account IDs for this whitelisted admin
    const mappings = await db
      .select({ lineAccountId: adminLineAccounts.lineAccountId })
      .from(adminLineAccounts)
      .where(eq(adminLineAccounts.adminId, whitelistId));

    const lineAccountIds = mappings.map((m) => m.lineAccountId);

    return {
      email,
      isSuperAdmin: false,
      whitelistId,
      lineAccountIds,
    };
  } catch (error) {
    console.error("[getAdminContext] Error fetching admin account mappings:", error);
    return {
      email,
      isSuperAdmin: false,
      whitelistId,
      lineAccountIds: [],
    };
  }
}
