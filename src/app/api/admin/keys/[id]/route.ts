import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { apiKeys, apiKeyLineAccounts } from "@/db/schema";
import { getAdminContext } from "@/lib/auth-utils";
import { eq, inArray, and } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const context = await getAdminContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keyId = params.id;

  try {
    // 1. Fetch current mappings for auth check
    const currentMappings = await db
      .select({ lineAccountId: apiKeyLineAccounts.lineAccountId })
      .from(apiKeyLineAccounts)
      .where(eq(apiKeyLineAccounts.apiKeyId, keyId));

    if (currentMappings.length === 0) {
      // Verify key existence
      const [keyExist] = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.id, keyId))
        .limit(1);
      
      if (!keyExist) {
        return NextResponse.json({ error: "API Key not found" }, { status: 404 });
      }
    }

    // Access control check for Whitelisted Admin:
    // They must have access to at least one of the LINE Accounts currentMappings maps to.
    if (!context.isSuperAdmin) {
      const allowedIds = context.lineAccountIds || [];
      const hasAccessToKey = currentMappings.some(m => allowedIds.includes(m.lineAccountId));
      if (!hasAccessToKey && currentMappings.length > 0) {
        return NextResponse.json({ error: "Forbidden: No permission to edit this API Key" }, { status: 403 });
      }
    }

    const body = await request.json();
    const { projectName, lineAccountIds, isActive } = body;

    if (!projectName || !lineAccountIds || !Array.isArray(lineAccountIds) || lineAccountIds.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Access control check for the new mapped accounts:
    // They cannot assign to accounts they don't have access to!
    if (!context.isSuperAdmin) {
      const allowedIds = context.lineAccountIds || [];
      const hasUnauthorizedAccount = lineAccountIds.some(id => !allowedIds.includes(id));
      if (hasUnauthorizedAccount) {
        return NextResponse.json({ error: "Forbidden: Assigning to unauthorized LINE Account" }, { status: 403 });
      }
    }

    // 2. Update API Key record
    const [updatedKey] = await db
      .update(apiKeys)
      .set({
        projectName,
        isActive: isActive !== false,
      })
      .where(eq(apiKeys.id, keyId))
      .returning();

    if (!updatedKey) {
      return NextResponse.json({ error: "API Key not found" }, { status: 404 });
    }

    // 3. Update mappings
    if (context.isSuperAdmin) {
      await db.delete(apiKeyLineAccounts).where(eq(apiKeyLineAccounts.apiKeyId, keyId));
    } else {
      const allowedIds = context.lineAccountIds || [];
      await db
        .delete(apiKeyLineAccounts)
        .where(
          and(
            eq(apiKeyLineAccounts.apiKeyId, keyId),
            inArray(apiKeyLineAccounts.lineAccountId, allowedIds)
          )
        );
    }

    // Insert new mappings
    await Promise.all(
      lineAccountIds.map(async (lineAccountId) => {
        await db.insert(apiKeyLineAccounts).values({
          apiKeyId: keyId,
          lineAccountId,
        });
      })
    );

    return NextResponse.json(updatedKey);
  } catch (error) {
    console.error("[Admin API Keys PUT] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const context = await getAdminContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keyId = params.id;

  try {
    // 1. Fetch current mappings for auth check
    const currentMappings = await db
      .select({ lineAccountId: apiKeyLineAccounts.lineAccountId })
      .from(apiKeyLineAccounts)
      .where(eq(apiKeyLineAccounts.apiKeyId, keyId));

    // Access control check for Whitelisted Admin
    if (!context.isSuperAdmin) {
      const allowedIds = context.lineAccountIds || [];
      const hasAccessToKey = currentMappings.some(m => allowedIds.includes(m.lineAccountId));
      if (!hasAccessToKey && currentMappings.length > 0) {
        return NextResponse.json({ error: "Forbidden: No permission to delete this API Key" }, { status: 403 });
      }
    }

    const [deletedKey] = await db
      .delete(apiKeys)
      .where(eq(apiKeys.id, keyId))
      .returning();

    if (!deletedKey) {
      return NextResponse.json({ error: "API Key not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted: deletedKey });
  } catch (error) {
    console.error("[Admin API Keys DELETE] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
