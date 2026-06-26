import { NextResponse } from "next/server";
import { db } from "@/db";
import { lineAccounts, apiKeys, webhookEvents, apiKeyLineAccounts } from "@/db/schema";
import { getAdminContext } from "@/lib/auth-utils";
import { count, eq, inArray, desc } from "drizzle-orm";

export async function GET() {
  const context = await getAdminContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let accountCount = 0;
    let keyCount = 0;
    let recentEventsList: any[] = [];

    if (context.isSuperAdmin) {
      // 1. Fetch total accounts count
      const [accRes] = await db.select({ val: count() }).from(lineAccounts);
      accountCount = accRes?.val || 0;

      // 2. Fetch total api keys count
      const [keyRes] = await db.select({ val: count() }).from(apiKeys);
      keyCount = keyRes?.val || 0;

      // 3. Fetch recent events
      recentEventsList = await db
        .select({
          id: webhookEvents.webhookEventId,
          eventType: webhookEvents.eventType,
          processedAt: webhookEvents.processedAt,
          accountName: lineAccounts.name,
          userId: webhookEvents.userId,
          groupId: webhookEvents.groupId,
        })
        .from(webhookEvents)
        .innerJoin(lineAccounts, eq(webhookEvents.lineAccountId, lineAccounts.id))
        .orderBy(desc(webhookEvents.processedAt))
        .limit(5);
    } else {
      const allowedIds = context.lineAccountIds || [];
      if (allowedIds.length > 0) {
        accountCount = allowedIds.length;

        // Fetch counts for Whitelisted admin
        const [keysMappedRes] = await db
          .select({ val: count() })
          .from(apiKeys)
          .innerJoin(
            apiKeyLineAccounts,
            eq(apiKeyLineAccounts.apiKeyId, apiKeys.id)
          )
          .where(inArray(apiKeyLineAccounts.lineAccountId, allowedIds));
        
        keyCount = keysMappedRes?.val || 0;

        // Recent events mapping to their accounts
        recentEventsList = await db
          .select({
            id: webhookEvents.webhookEventId,
            eventType: webhookEvents.eventType,
            processedAt: webhookEvents.processedAt,
            accountName: lineAccounts.name,
            userId: webhookEvents.userId,
            groupId: webhookEvents.groupId,
          })
          .from(webhookEvents)
          .innerJoin(lineAccounts, eq(webhookEvents.lineAccountId, lineAccounts.id))
          .where(inArray(webhookEvents.lineAccountId, allowedIds))
          .orderBy(desc(webhookEvents.processedAt))
          .limit(5);
      }
    }

    return NextResponse.json({
      accountCount,
      keyCount,
      recentEvents: recentEventsList,
    });
  } catch (error) {
    console.error("[Admin Metrics GET] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
