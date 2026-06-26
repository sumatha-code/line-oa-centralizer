import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { apiKeys, apiKeyLineAccounts, lineAccounts } from "@/db/schema";
import { getAdminContext } from "@/lib/auth-utils";
import { hashApiKey } from "@/lib/hash";
import { eq, inArray, desc } from "drizzle-orm";
import crypto from "crypto";

export async function GET() {
  const context = await getAdminContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let keysQuery;
    
    // If not super admin, we only fetch keys that map to at least one LINE Account the user has access to
    if (!context.isSuperAdmin) {
      if (!context.lineAccountIds || context.lineAccountIds.length === 0) {
        return NextResponse.json([]);
      }
      
      // Get API Key IDs that have access to the user's lineAccountIds
      const authorizedKeys = await db
        .select({ apiKeyId: apiKeyLineAccounts.apiKeyId })
        .from(apiKeyLineAccounts)
        .where(inArray(apiKeyLineAccounts.lineAccountId, context.lineAccountIds));
      
      const keyIds = authorizedKeys.map(k => k.apiKeyId);
      if (keyIds.length === 0) {
        return NextResponse.json([]);
      }

      keysQuery = await db
        .select()
        .from(apiKeys)
        .where(inArray(apiKeys.id, keyIds))
        .orderBy(desc(apiKeys.createdAt));
    } else {
      keysQuery = await db
        .select()
        .from(apiKeys)
        .orderBy(desc(apiKeys.createdAt));
    }

    // For each API Key, fetch its mapped accounts
    const keysWithAccounts = await Promise.all(
      keysQuery.map(async (key) => {
        const mappings = await db
          .select({
            id: lineAccounts.id,
            name: lineAccounts.name,
          })
          .from(lineAccounts)
          .innerJoin(
            apiKeyLineAccounts,
            eq(apiKeyLineAccounts.lineAccountId, lineAccounts.id)
          )
          .where(eq(apiKeyLineAccounts.apiKeyId, key.id));

        return {
          ...key,
          accounts: mappings,
        };
      })
    );

    return NextResponse.json(keysWithAccounts);
  } catch (error) {
    console.error("[Admin API Keys GET] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getAdminContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { projectName, lineAccountIds, isActive } = body;

    if (!projectName || !lineAccountIds || !Array.isArray(lineAccountIds) || lineAccountIds.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Access control check: Whitelisted Admin can only assign API keys to accounts they have access to!
    if (!context.isSuperAdmin) {
      const allowedIds = context.lineAccountIds || [];
      const hasUnauthorizedAccount = lineAccountIds.some(id => !allowedIds.includes(id));
      if (hasUnauthorizedAccount) {
        return NextResponse.json({ error: "Forbidden: Assigning to unauthorized LINE Account" }, { status: 403 });
      }
    }

    // Generate raw API Key and hash it
    const rawKey = `educ_key_${crypto.randomBytes(24).toString("hex")}`;
    const hashedKey = hashApiKey(rawKey);

    // Insert key record
    const [newKey] = await db
      .insert(apiKeys)
      .values({
        projectName,
        keyHash: hashedKey,
        isActive: isActive !== false,
      })
      .returning();

    // Insert mappings in parallel
    await Promise.all(
      lineAccountIds.map(async (lineAccountId) => {
        await db.insert(apiKeyLineAccounts).values({
          apiKeyId: newKey.id,
          lineAccountId,
        });
      })
    );

    return NextResponse.json({
      ...newKey,
      rawKey, // Only returned on creation
    });
  } catch (error) {
    console.error("[Admin API Keys POST] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
