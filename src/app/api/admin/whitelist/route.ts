import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adminWhitelist, adminLineAccounts, lineAccounts } from "@/db/schema";
import { getAdminContext } from "@/lib/auth-utils";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const context = await getAdminContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only Super Admins can manage the Whitelist
  if (!context.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const list = await db
      .select()
      .from(adminWhitelist)
      .orderBy(desc(adminWhitelist.createdAt));

    const listWithAccounts = await Promise.all(
      list.map(async (admin) => {
        const mappings = await db
          .select({
            id: lineAccounts.id,
            name: lineAccounts.name,
          })
          .from(lineAccounts)
          .innerJoin(
            adminLineAccounts,
            eq(adminLineAccounts.lineAccountId, lineAccounts.id)
          )
          .where(eq(adminLineAccounts.adminId, admin.id));

        return {
          ...admin,
          accounts: mappings,
        };
      })
    );

    return NextResponse.json(listWithAccounts);
  } catch (error) {
    console.error("[Admin Whitelist GET] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getAdminContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only Super Admins can manage the Whitelist
  if (!context.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email, lineAccountIds } = body;

    if (!email || !lineAccountIds || !Array.isArray(lineAccountIds)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Insert Whitelist record
    const [newAdmin] = await db
      .insert(adminWhitelist)
      .values({
        email: cleanEmail,
        createdBy: context.email,
      })
      .returning();

    // 2. Insert LINE Account mappings in parallel
    await Promise.all(
      lineAccountIds.map(async (lineAccountId) => {
        await db.insert(adminLineAccounts).values({
          adminId: newAdmin.id,
          lineAccountId,
        });
      })
    );

    return NextResponse.json(newAdmin);
  } catch (error: any) {
    console.error("[Admin Whitelist POST] Error:", error);
    if (error.code === "23505" || error.message?.includes("unique constraint")) {
      return NextResponse.json({ error: "Email already exists in whitelist" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
