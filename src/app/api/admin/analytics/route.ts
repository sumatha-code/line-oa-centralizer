import { NextResponse } from "next/server";
import { db } from "@/db";
import { webhookEvents, usageLogs, apiKeys } from "@/db/schema";
import { getAdminContext } from "@/lib/auth-utils";
import { count, eq, inArray, and, gte, desc, sql } from "drizzle-orm";

export async function GET() {
  const context = await getAdminContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    let allowedIds: string[] = [];
    if (!context.isSuperAdmin) {
      allowedIds = context.lineAccountIds || [];
      if (allowedIds.length === 0) {
        return NextResponse.json({
          dailyStats: [],
          eventTypes: [],
          apiKeyUsage: [],
        });
      }
    }

    // 1. Daily Webhook Volumes (Last 7 Days)
    let webhookConditions: any = gte(webhookEvents.processedAt, sevenDaysAgo);
    if (!context.isSuperAdmin) {
      webhookConditions = and(webhookConditions, inArray(webhookEvents.lineAccountId, allowedIds));
    }

    const dailyStats = await db
      .select({
        date: sql<string>`to_char(${webhookEvents.processedAt}, 'YYYY-MM-DD')`,
        count: count(),
      })
      .from(webhookEvents)
      .where(webhookConditions)
      .groupBy(sql`to_char(${webhookEvents.processedAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${webhookEvents.processedAt}, 'YYYY-MM-DD')`);

    // 2. Event Types Distribution (Last 30 Days)
    let eventTypesConditions: any = gte(webhookEvents.processedAt, thirtyDaysAgo);
    if (!context.isSuperAdmin) {
      eventTypesConditions = and(eventTypesConditions, inArray(webhookEvents.lineAccountId, allowedIds));
    }

    const eventTypes = await db
      .select({
        type: webhookEvents.eventType,
        count: count(),
      })
      .from(webhookEvents)
      .where(eventTypesConditions)
      .groupBy(webhookEvents.eventType)
      .orderBy(desc(count()));

    // 3. API Key Usage Shares (Last 30 Days)
    let usageConditions: any = gte(usageLogs.createdAt, thirtyDaysAgo);
    if (!context.isSuperAdmin) {
      usageConditions = and(usageConditions, inArray(usageLogs.lineAccountId, allowedIds));
    }

    const apiKeyUsage = await db
      .select({
        projectName: apiKeys.projectName,
        count: count(),
      })
      .from(usageLogs)
      .innerJoin(apiKeys, eq(usageLogs.apiKeyId, apiKeys.id))
      .where(usageConditions)
      .groupBy(apiKeys.projectName)
      .orderBy(desc(count()));

    return NextResponse.json({
      dailyStats,
      eventTypes,
      apiKeyUsage,
    });
  } catch (error) {
    console.error("[Admin Analytics GET] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
