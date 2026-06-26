import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adminWhitelist, adminLineAccounts } from "@/db/schema";
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

  // Only Super Admins can manage the Whitelist
  if (!context.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminId = params.id;

  try {
    const body = await request.json();
    const { email, lineAccountIds } = body;

    if (!email || !lineAccountIds || !Array.isArray(lineAccountIds)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Update Whitelist record
    const [updatedAdmin] = await db
      .update(adminWhitelist)
      .set({
        email: cleanEmail,
      })
      .where(eq(adminWhitelist.id, adminId))
      .returning();

    if (!updatedAdmin) {
      return NextResponse.json({ error: "Whitelisted Admin not found" }, { status: 404 });
    }

    // 2. Sync associated LINE Account mappings (delete-then-insert)
    await db
      .delete(adminLineAccounts)
      .where(eq(adminLineAccounts.adminId, adminId));

    await Promise.all(
      lineAccountIds.map(async (lineAccountId) => {
        await db.insert(adminLineAccounts).values({
          adminId,
          lineAccountId,
        });
      })
    );

    return NextResponse.json(updatedAdmin);
  } catch (error: any) {
    console.error("[Admin Whitelist PUT] Error:", error);
    if (error.code === "23505" || error.message?.includes("unique constraint")) {
      return NextResponse.json({ error: "Email already exists in whitelist" }, { status: 400 });
    }
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

  // Only Super Admins can manage the Whitelist
  if (!context.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminId = params.id;

  try {
    const [deletedAdmin] = await db
      .delete(adminWhitelist)
      .where(eq(adminWhitelist.id, adminId))
      .returning();

    if (!deletedAdmin) {
      return NextResponse.json({ error: "Whitelisted Admin not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted: deletedAdmin });
  } catch (error) {
    console.error("[Admin Whitelist DELETE] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
