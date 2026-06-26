import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { usageLogs, apiKeys, lineAccounts } from "@/db/schema";
import { getAdminContext } from "@/lib/auth-utils";
import { eq, and, desc, inArray, sql, count, like, or } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const context = await getAdminContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const lineAccountId = searchParams.get("lineAccountId");
  const apiKeyId = searchParams.get("apiKeyId");
  const errorOnly = searchParams.get("errorOnly") === "true";
  const search = searchParams.get("search");

  try {
    const conditions: any[] = [];

    // Access Scope Filtering
    if (!context.isSuperAdmin) {
      const allowedIds = context.lineAccountIds || [];
      if (allowedIds.length === 0) {
        return NextResponse.json({ data: [], total: 0 });
      }
      conditions.push(inArray(usageLogs.lineAccountId, allowedIds));
      
      // If whitelisted admin filters for an account, check permission
      if (lineAccountId) {
        if (!allowedIds.includes(lineAccountId)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        conditions.push(eq(usageLogs.lineAccountId, lineAccountId));
      }
    } else {
      if (lineAccountId) {
        conditions.push(eq(usageLogs.lineAccountId, lineAccountId));
      }
    }

    if (apiKeyId) {
      conditions.push(eq(usageLogs.apiKeyId, apiKeyId));
    }

    if (errorOnly) {
      // Errors are status code >= 400
      conditions.push(sql`${usageLogs.statusCode} >= 400`);
    }

    if (search) {
      // Search inside endpoint or project name
      conditions.push(
        or(
          like(usageLogs.endpoint, `%${search}%`),
          like(apiKeys.projectName, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Run count query and select query in parallel (async-parallel)
    const countPromise = db
      .select({ val: count() })
      .from(usageLogs)
      .innerJoin(apiKeys, eq(usageLogs.apiKeyId, apiKeys.id))
      .leftJoin(lineAccounts, eq(usageLogs.lineAccountId, lineAccounts.id))
      .where(whereClause);

    const selectPromise = db
      .select({
        id: usageLogs.id,
        endpoint: usageLogs.endpoint,
        statusCode: usageLogs.statusCode,
        createdAt: usageLogs.createdAt,
        projectName: apiKeys.projectName,
        accountName: lineAccounts.name,
      })
      .from(usageLogs)
      .innerJoin(apiKeys, eq(usageLogs.apiKeyId, apiKeys.id))
      .leftJoin(lineAccounts, eq(usageLogs.lineAccountId, lineAccounts.id))
      .where(whereClause)
      .orderBy(desc(usageLogs.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const [[totalRes], data] = await Promise.all([countPromise, selectPromise]);
    const total = totalRes?.val || 0;

    return NextResponse.json({ data, total });
  } catch (error) {
    console.error("[Admin Logs GET] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
