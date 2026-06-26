import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { lineAccounts, lineAccountForwardUrls } from "@/db/schema";
import { getAdminContext } from "@/lib/auth-utils";
import { inArray, desc, eq } from "drizzle-orm";

export async function GET() {
  const context = await getAdminContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let accountsData: any[] = [];
    if (context.isSuperAdmin) {
      accountsData = await db
        .select()
        .from(lineAccounts)
        .orderBy(desc(lineAccounts.createdAt));
    } else {
      if (!context.lineAccountIds || context.lineAccountIds.length === 0) {
        accountsData = [];
      } else {
        accountsData = await db
          .select()
          .from(lineAccounts)
          .where(inArray(lineAccounts.id, context.lineAccountIds))
          .orderBy(desc(lineAccounts.createdAt));
      }
    }

    // Retrieve forward URLs for all fetched accounts
    const accountIds = accountsData.map((a) => a.id);
    const forwardUrlsData = accountIds.length > 0
      ? await db
          .select()
          .from(lineAccountForwardUrls)
          .where(inArray(lineAccountForwardUrls.lineAccountId, accountIds))
      : [];

    // Map forward URLs to each account
    const accounts = accountsData.map((acc) => ({
      ...acc,
      forwardUrls: forwardUrlsData
        .filter((f) => f.lineAccountId === acc.id && f.isActive)
        .map((f) => f.url),
    }));

    return NextResponse.json(accounts);
  } catch (error) {
    console.error("[Admin Accounts GET] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getAdminContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only Super Admins can create new LINE Accounts
  if (!context.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, lineId, channelId, channelSecret, channelAccessToken, forwardUrls, isActive } = body;

    if (!name || !lineId || !channelId || !channelSecret || !channelAccessToken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Insert main LINE Account
    const [newAccount] = await db
      .insert(lineAccounts)
      .values({
        name,
        lineId,
        channelId,
        channelSecret,
        channelAccessToken,
        isActive: isActive !== false,
      })
      .returning();

    // Insert associated forward URLs if provided
    if (forwardUrls && Array.isArray(forwardUrls) && forwardUrls.length > 0) {
      const insertValues = forwardUrls
        .filter((url: string) => url && url.trim().length > 0)
        .map((url: string) => ({
          lineAccountId: newAccount.id,
          url: url.trim(),
          isActive: true,
        }));

      if (insertValues.length > 0) {
        await db.insert(lineAccountForwardUrls).values(insertValues);
      }
    }

    return NextResponse.json({
      ...newAccount,
      forwardUrls: forwardUrls || [],
    });
  } catch (error: any) {
    console.error("[Admin Accounts POST] Error:", error);
    if (error.code === "23505" || error.message?.includes("unique constraint")) {
      return NextResponse.json({ error: "Channel ID already exists in system" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
