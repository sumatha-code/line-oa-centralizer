import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { lineAccounts, lineAccountForwardUrls } from "@/db/schema";
import { getAdminContext } from "@/lib/auth-utils";
import { eq } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const context = await getAdminContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only Super Admins can update LINE Accounts
  if (!context.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const accountId = params.id;

  try {
    const body = await request.json();
    const { name, lineId, channelId, channelSecret, channelAccessToken, forwardUrls, isActive } = body;

    if (!name || !lineId || !channelId || !channelSecret || !channelAccessToken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Update main account configuration
    const [updatedAccount] = await db
      .update(lineAccounts)
      .set({
        name,
        lineId,
        channelId,
        channelSecret,
        channelAccessToken,
        isActive: isActive !== false,
        updatedAt: new Date(),
      })
      .where(eq(lineAccounts.id, accountId))
      .returning();

    if (!updatedAccount) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Sync associated forward URLs
    await db.delete(lineAccountForwardUrls).where(eq(lineAccountForwardUrls.lineAccountId, accountId));

    if (forwardUrls && Array.isArray(forwardUrls) && forwardUrls.length > 0) {
      const insertValues = forwardUrls
        .filter((url: string) => url && url.trim().length > 0)
        .map((url: string) => ({
          lineAccountId: accountId,
          url: url.trim(),
          isActive: true,
        }));

      if (insertValues.length > 0) {
        await db.insert(lineAccountForwardUrls).values(insertValues);
      }
    }

    return NextResponse.json({
      ...updatedAccount,
      forwardUrls: forwardUrls || [],
    });
  } catch (error) {
    console.error("[Admin Accounts PUT] Error:", error);
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

  // Only Super Admins can delete LINE Accounts
  if (!context.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const accountId = params.id;

  try {
    const [deletedAccount] = await db
      .delete(lineAccounts)
      .where(eq(lineAccounts.id, accountId))
      .returning();

    if (!deletedAccount) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted: deletedAccount });
  } catch (error) {
    console.error("[Admin Accounts DELETE] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
